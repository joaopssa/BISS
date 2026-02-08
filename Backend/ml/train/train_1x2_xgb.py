# Backend/ml/train/train_1x2_xgb.py
# ------------------------------------------------------------
# Treina XGBoost multiclass (1X2) com split temporal POR POOL (sem leakage)
# Compatível com versões antigas do xgboost sklearn wrapper:
# - NÃO usa XGBClassifier.fit callbacks/early_stopping_rounds
# - Treina com xgboost.train (DMatrix) + early_stopping_rounds
#
# Entrada:  Backend/ml/processed/matches_enriched.csv
# Saídas:   Backend/ml/models/xgb_1x2.json
#           Backend/ml/models/xgb_1x2_meta.json
#           Backend/ml/models/xgb_1x2_columns.pkl
# ------------------------------------------------------------

import os
import json
import math
import joblib
import numpy as np
import pandas as pd

from collections import Counter
from sklearn.metrics import accuracy_score, log_loss, classification_report, confusion_matrix

import xgboost as xgb


def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)


def entropy_1x2(ph, pd_, pa) -> float:
    """Entropia (base e) das probs 1x2 normalizadas. Maior = jogo mais equilibrado."""
    for v in (ph, pd_, pa):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return np.nan
        if v <= 0:
            return np.nan
    s = float(ph + pd_ + pa)
    if s <= 0:
        return np.nan
    ph2, pd2, pa2 = float(ph) / s, float(pd_) / s, float(pa) / s
    return - (ph2 * math.log(ph2) + pd2 * math.log(pd2) + pa2 * math.log(pa2))


def split_by_pool_temporal(df: pd.DataFrame, train_frac=0.80, val_frac=0.10):
    """Split temporal sem leakage dentro de cada pool_key."""
    parts_train, parts_val, parts_test = [], [], []

    for pk, g in df.groupby("pool_key", sort=False):
        g = g.sort_values("date").reset_index(drop=True)
        n = len(g)
        if n < 10:
            parts_train.append(g)
            continue

        i_train_end = int(n * train_frac)
        i_val_end = int(n * (train_frac + val_frac))

        if i_train_end >= n - 2:
            i_train_end = max(1, n - 2)
        if i_val_end >= n - 1:
            i_val_end = max(i_train_end + 1, n - 1)

        parts_train.append(g.iloc[:i_train_end].copy())
        parts_val.append(g.iloc[i_train_end:i_val_end].copy())
        parts_test.append(g.iloc[i_val_end:].copy())

    train_df = pd.concat(parts_train, ignore_index=True) if parts_train else df.iloc[:0].copy()
    val_df = pd.concat(parts_val, ignore_index=True) if parts_val else df.iloc[:0].copy()
    test_df = pd.concat(parts_test, ignore_index=True) if parts_test else df.iloc[:0].copy()

    train_df = train_df.sort_values("date").reset_index(drop=True)
    val_df = val_df.sort_values("date").reset_index(drop=True)
    test_df = test_df.sort_values("date").reset_index(drop=True)

    return train_df, val_df, test_df


def main():
    # -------------------------
    # Paths
    # -------------------------
    THIS_DIR = os.path.dirname(os.path.abspath(__file__))         # .../Backend/ml/train
    BACKEND_DIR = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))  # .../Backend

    DATA_PATH = os.path.join(BACKEND_DIR, "ml", "processed", "matches_enriched.csv")
    MODELS_DIR = os.path.join(BACKEND_DIR, "ml", "models")
    ensure_dir(MODELS_DIR)

    MODEL_PATH = os.path.join(MODELS_DIR, "xgb_1x2.json")
    META_PATH = os.path.join(MODELS_DIR, "xgb_1x2_meta.json")
    COLS_PATH = os.path.join(MODELS_DIR, "xgb_1x2_columns.pkl")

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset não encontrado em: {DATA_PATH}")

    # -------------------------
    # Load + sanity
    # -------------------------
    df = pd.read_csv(DATA_PATH)

    needed_cols = {
        "date", "target_1x2",
        "elo_home_pre", "elo_away_pre", "elo_diff",
        "form_pts_home_3", "form_pts_home_5", "form_pts_away_3", "form_pts_away_5",
        "gd_home_5", "gd_away_5",
        "pool_key", "competition",
        "odds_h", "odds_d", "odds_a",
        "imp_ph", "imp_pd", "imp_pa",
        "imp_overround_1x2", "imp_ph_minus_pa",
        "ou_p_over25", "ou_p_under25",
        "ou_overround", "ou_p_over_minus_under",
    }
    missing = needed_cols - set(df.columns)
    if missing:
        raise RuntimeError(f"Dataset está faltando colunas: {missing}")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "target_1x2"]).copy()
    df["target_1x2"] = df["target_1x2"].astype(int)
    df = df.sort_values(["pool_key", "date"]).reset_index(drop=True)

    # -------------------------
    # Extra features (robustas com NaN)
    # -------------------------
    df["has_odds_1x2"] = (~df["imp_ph"].isna() & ~df["imp_pd"].isna() & ~df["imp_pa"].isna()).astype(int)
    df["has_ou_25"] = (~df["ou_p_over25"].isna() & ~df["ou_p_under25"].isna()).astype(int)

    df["abs_elo_diff"] = df["elo_diff"].abs()
    df["abs_imp_ph_minus_pa"] = df["imp_ph_minus_pa"].abs()

    df["imp_entropy_1x2"] = [
        entropy_1x2(ph, pd_, pa)
        for ph, pd_, pa in zip(df["imp_ph"].values, df["imp_pd"].values, df["imp_pa"].values)
    ]

    # fav_prob/draw_edge sem warning: só calcula onde há odds
    df["fav_prob"] = np.nan
    m_odds = df["has_odds_1x2"] == 1
    if m_odds.any():
        df.loc[m_odds, "fav_prob"] = np.maximum(df.loc[m_odds, "imp_ph"].values, df.loc[m_odds, "imp_pa"].values)

    df["draw_edge"] = np.nan
    df.loc[m_odds, "draw_edge"] = df.loc[m_odds, "imp_pd"].values - df.loc[m_odds, "fav_prob"].values

    df["balanced_flag"] = 0
    df.loc[m_odds, "balanced_flag"] = (df.loc[m_odds, "fav_prob"].values < 0.45).astype(int)

    # -------------------------
    # Split temporal por pool_key
    # -------------------------
    train_df, val_df, test_df = split_by_pool_temporal(df, train_frac=0.80, val_frac=0.10)
    if len(val_df) == 0 or len(test_df) == 0:
        raise RuntimeError("Split gerou VAL/TEST vazios. Verifique se há linhas suficientes por pool_key.")

    # -------------------------
    # Features (num + cat one-hot)
    # -------------------------
    num_cols = [
        "elo_home_pre", "elo_away_pre", "elo_diff", "abs_elo_diff",
        "form_pts_home_3", "form_pts_home_5",
        "form_pts_away_3", "form_pts_away_5",
        "gd_home_5", "gd_away_5",

        "odds_h", "odds_d", "odds_a",

        "imp_ph", "imp_pd", "imp_pa",
        "imp_overround_1x2",
        "imp_ph_minus_pa",
        "abs_imp_ph_minus_pa",
        "imp_entropy_1x2",

        "fav_prob",
        "draw_edge",
        "balanced_flag",

        "ou_p_over25", "ou_p_under25",
        "ou_overround",
        "ou_p_over_minus_under",

        "has_odds_1x2",
        "has_ou_25",
    ]
    cat_cols = ["pool_key", "competition"]

    def make_X(d: pd.DataFrame) -> pd.DataFrame:
        Xn = d[num_cols].copy()
        Xc = pd.get_dummies(d[cat_cols].astype(str), prefix=cat_cols, dummy_na=False)
        X = pd.concat([Xn, Xc], axis=1)
        return X

    X_train = make_X(train_df)
    y_train = train_df["target_1x2"].values.astype(int)

    X_val = make_X(val_df)
    y_val = val_df["target_1x2"].values.astype(int)

    X_test = make_X(test_df)
    y_test = test_df["target_1x2"].values.astype(int)

    # alinha colunas
    all_cols = sorted(set(X_train.columns) | set(X_val.columns) | set(X_test.columns))
    X_train = X_train.reindex(columns=all_cols, fill_value=0)
    X_val = X_val.reindex(columns=all_cols, fill_value=0)
    X_test = X_test.reindex(columns=all_cols, fill_value=0)

    joblib.dump(all_cols, COLS_PATH)

    # -------------------------
    # sample weights (1/sqrt(freq))
    # -------------------------
    counts = Counter(y_train.tolist())
    inv = {c: (1.0 / math.sqrt(max(1, counts.get(c, 1)))) for c in [0, 1, 2]}
    mean_inv = sum(inv.values()) / 3.0
    w = {c: (inv[c] / mean_inv) for c in inv}
    sample_weight = np.array([w[int(y)] for y in y_train], dtype=float)

    print("\n" + "-" * 70)
    print("[INFO] Class counts (train):", dict(counts))
    print("[INFO] Class weights (train):", w)
    print("-" * 70)

    # -------------------------
    # DMatrix (xgboost.train)
    # -------------------------
    # obs: para compatibilidade, converte para float32
    dtrain = xgb.DMatrix(X_train.values.astype(np.float32), label=y_train, weight=sample_weight)
    dval = xgb.DMatrix(X_val.values.astype(np.float32), label=y_val)
    dtest = xgb.DMatrix(X_test.values.astype(np.float32), label=y_test)

    # -------------------------
    # Params + Train
    # -------------------------
    params = {
        "objective": "multi:softprob",
        "num_class": 3,
        "eval_metric": "mlogloss",

        "max_depth": 5,
        "eta": 0.02,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "min_child_weight": 2.0,
        "gamma": 0.2,
        "lambda": 2.0,
        "alpha": 0.1,

        "tree_method": "hist",
        "seed": 42,
    }

    num_boost_round = 8000
    early_stopping_rounds = 200

    evals = [(dtrain, "train"), (dval, "val")]
    booster = xgb.train(
        params=params,
        dtrain=dtrain,
        num_boost_round=num_boost_round,
        evals=evals,
        early_stopping_rounds=early_stopping_rounds,
        verbose_eval=False,
    )

    best_it = int(getattr(booster, "best_iteration", -1))

    # -------------------------
    # Eval helpers
    # -------------------------
    def eval_split(name: str, dmat: xgb.DMatrix, y_true: np.ndarray):
        prob = booster.predict(dmat)
        # prob shape: (n, 3)
        pred = np.argmax(prob, axis=1)

        acc = accuracy_score(y_true, pred)
        ll = log_loss(y_true, prob, labels=[0, 1, 2])

        print("\n" + "=" * 70)
        print(f"{name}")
        print("=" * 70)
        print(f"Accuracy: {acc:.4f}")
        print(f"LogLoss:  {ll:.4f}")
        print("\nConfusion matrix (linhas = real, colunas = previsto):")
        print(confusion_matrix(y_true, pred, labels=[0, 1, 2]))
        print("\nRelatório:")
        print(classification_report(y_true, pred, digits=4))

        return acc, ll

    train_acc, train_ll = eval_split("TRAIN", dtrain, y_train)
    val_acc, val_ll = eval_split("VAL", dval, y_val)
    test_acc, test_ll = eval_split("TEST", dtest, y_test)

    # -------------------------
    # Save
    # -------------------------
    booster.save_model(MODEL_PATH)

    meta = {
        "data_path": DATA_PATH,
        "n_rows": int(len(df)),
        "date_min": str(df["date"].min().date()),
        "date_max": str(df["date"].max().date()),
        "split": {
            "strategy": "temporal_by_pool_key",
            "train_rows": int(len(train_df)),
            "val_rows": int(len(val_df)),
            "test_rows": int(len(test_df)),
            "train_end_date": str(train_df["date"].max().date()) if len(train_df) else None,
            "val_end_date": str(val_df["date"].max().date()) if len(val_df) else None,
            "test_end_date": str(test_df["date"].max().date()) if len(test_df) else None,
        },
        "metrics": {
            "train": {"accuracy": float(train_acc), "logloss": float(train_ll)},
            "val": {"accuracy": float(val_acc), "logloss": float(val_ll)},
            "test": {"accuracy": float(test_acc), "logloss": float(test_ll)},
        },
        "best_iteration": best_it,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "class_counts_train": {str(k): int(v) for k, v in counts.items()},
        "class_weights_train": {str(k): float(v) for k, v in w.items()},
        "xgb_params": params,
        "num_boost_round": int(num_boost_round),
        "early_stopping_rounds": int(early_stopping_rounds),
        "model_path": MODEL_PATH,
        "columns_path": COLS_PATH,
    }

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("\n" + "-" * 70)
    print("[OK] Modelo salvo em:", MODEL_PATH)
    print("[OK] Colunas salvas em:", COLS_PATH)
    print("[OK] Metadata salva em:", META_PATH)
    print("[OK] best_iteration:", best_it)
    print("-" * 70)


if __name__ == "__main__":
    main()
