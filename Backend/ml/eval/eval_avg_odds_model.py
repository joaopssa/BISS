# Backend/ml/eval/eval_avg_odds_model.py
# ------------------------------------------------------------
# Calcula "odd média das apostas da IA" no TEST
# - Reconstrói features iguais ao treino atual
# - Reproduz split temporal por pool_key
# - Carrega booster xgb_1x2.json + colunas xgb_1x2_columns.pkl
# - Para cada jogo do TEST, pega a odd do pick (H/D/A)
# ------------------------------------------------------------

import os
import math
import joblib
import numpy as np
import pandas as pd
from collections import Counter

import xgboost as xgb


def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)


def entropy_1x2(ph, pd_, pa) -> float:
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
    val_df   = pd.concat(parts_val, ignore_index=True) if parts_val else df.iloc[:0].copy()
    test_df  = pd.concat(parts_test, ignore_index=True) if parts_test else df.iloc[:0].copy()

    train_df = train_df.sort_values("date").reset_index(drop=True)
    val_df   = val_df.sort_values("date").reset_index(drop=True)
    test_df  = test_df.sort_values("date").reset_index(drop=True)
    return train_df, val_df, test_df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["has_odds_1x2"] = (~df["imp_ph"].isna() & ~df["imp_pd"].isna() & ~df["imp_pa"].isna()).astype(int)
    df["has_ou_25"] = (~df["ou_p_over25"].isna() & ~df["ou_p_under25"].isna()).astype(int)

    df["abs_elo_diff"] = df["elo_diff"].abs()
    df["abs_imp_ph_minus_pa"] = df["imp_ph_minus_pa"].abs()

    df["imp_entropy_1x2"] = [
        entropy_1x2(ph, pd_, pa)
        for ph, pd_, pa in zip(df["imp_ph"].values, df["imp_pd"].values, df["imp_pa"].values)
    ]

    df["fav_prob"] = np.nan
    m_odds = df["has_odds_1x2"] == 1
    if m_odds.any():
        df.loc[m_odds, "fav_prob"] = np.maximum(df.loc[m_odds, "imp_ph"].values, df.loc[m_odds, "imp_pa"].values)

    df["draw_edge"] = np.nan
    df.loc[m_odds, "draw_edge"] = df.loc[m_odds, "imp_pd"].values - df.loc[m_odds, "fav_prob"].values

    df["balanced_flag"] = 0
    df.loc[m_odds, "balanced_flag"] = (df.loc[m_odds, "fav_prob"].values < 0.45).astype(int)

    return df


def main():
    THIS_DIR = os.path.dirname(os.path.abspath(__file__))
    BACKEND_DIR = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))

    DATA_PATH = os.path.join(BACKEND_DIR, "ml", "processed", "matches_enriched.csv")
    MODELS_DIR = os.path.join(BACKEND_DIR, "ml", "models")

    MODEL_PATH = os.path.join(MODELS_DIR, "xgb_1x2.json")
    COLS_PATH  = os.path.join(MODELS_DIR, "xgb_1x2_columns.pkl")

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset não encontrado: {DATA_PATH}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Modelo não encontrado: {MODEL_PATH}")
    if not os.path.exists(COLS_PATH):
        raise FileNotFoundError(f"Colunas não encontradas: {COLS_PATH}")

    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "target_1x2"]).copy()
    df["target_1x2"] = df["target_1x2"].astype(int)
    df = df.sort_values(["pool_key", "date"]).reset_index(drop=True)

    # features iguais treino
    df = build_features(df)

    # split igual treino
    train_df, val_df, test_df = split_by_pool_temporal(df, train_frac=0.80, val_frac=0.10)
    if len(test_df) == 0:
        raise RuntimeError("TEST vazio. Verifique o split por pool_key.")

    # mesmas cols do treino (num + one-hot)
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
        return pd.concat([Xn, Xc], axis=1)

    X_test = make_X(test_df)
    all_cols = joblib.load(COLS_PATH)
    X_test = X_test.reindex(columns=all_cols, fill_value=0)

    booster = xgb.Booster()
    booster.load_model(MODEL_PATH)

    dtest = xgb.DMatrix(X_test.values.astype(np.float32))
    prob = booster.predict(dtest)
    pred = np.argmax(prob, axis=1)

    out = test_df.copy().reset_index(drop=True)
    out["pred"] = pred

    # odd escolhida pelo pick do modelo
    out["picked_odds"] = np.nan
    out.loc[out["pred"] == 0, "picked_odds"] = out.loc[out["pred"] == 0, "odds_h"]
    out.loc[out["pred"] == 1, "picked_odds"] = out.loc[out["pred"] == 1, "odds_d"]
    out.loc[out["pred"] == 2, "picked_odds"] = out.loc[out["pred"] == 2, "odds_a"]

    # filtra jogos onde existe odds pro pick
    valid = out.dropna(subset=["picked_odds"]).copy()

    print("\n" + "=" * 80)
    print("[ODDS] TEST - odds média do pick do modelo")
    print("=" * 80)
    print(f"Total jogos TEST: {len(out)}")
    print(f"Jogos com picked_odds válida: {len(valid)} ({len(valid)/max(1,len(out))*100:.1f}%)")

    if len(valid):
        print("\nResumo geral (picked_odds):")
        print(f" - média:   {valid['picked_odds'].mean():.4f}")
        print(f" - mediana:{valid['picked_odds'].median():.4f}")
        print(f" - p25:    {valid['picked_odds'].quantile(0.25):.4f}")
        print(f" - p75:    {valid['picked_odds'].quantile(0.75):.4f}")
        print(f" - p90:    {valid['picked_odds'].quantile(0.90):.4f}")
        print(f" - min/max:{valid['picked_odds'].min():.4f} / {valid['picked_odds'].max():.4f}")

        print("\nPor classe prevista:")
        for c, name in [(0, "HOME"), (1, "DRAW"), (2, "AWAY")]:
            vc = valid[valid["pred"] == c]
            if len(vc) == 0:
                continue
            print(f" - {name}: n={len(vc)} | média={vc['picked_odds'].mean():.4f} | mediana={vc['picked_odds'].median():.4f}")

        # opcional: “odd média” apenas quando há odds 1x2 completas
        v2 = out[(out["has_odds_1x2"] == 1) & (~out["picked_odds"].isna())]
        print("\nSomente jogos com odds 1x2 completas (has_odds_1x2=1):")
        print(f" - n={len(v2)} | média={v2['picked_odds'].mean():.4f} | mediana={v2['picked_odds'].median():.4f}")

    else:
        print("\n[WARN] Nenhuma picked_odds válida no TEST. Verifique se odds_h/d/a estão preenchidas.")


if __name__ == "__main__":
    main()
