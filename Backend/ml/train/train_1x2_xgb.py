# Backend/ml/train/train_1x2_xgb.py

import os
import json
import joblib
import pandas as pd

from sklearn.metrics import accuracy_score, log_loss, classification_report, confusion_matrix
from xgboost import XGBClassifier


def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)


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
    # Load
    # -------------------------
    df = pd.read_csv(DATA_PATH)

    # Garantias mínimas
    needed_cols = {
        "date", "target_1x2",
        "elo_home_pre", "elo_away_pre", "elo_diff",
        "form_pts_home_3", "form_pts_home_5", "form_pts_away_3", "form_pts_away_5",
        "gd_home_5", "gd_away_5",
        "pool_key", "competition",
    }
    missing = needed_cols - set(df.columns)
    if missing:
        raise RuntimeError(f"Dataset está faltando colunas: {missing}")

    # Converte date
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "target_1x2"]).copy()

    # target precisa ser int 0/1/2
    df["target_1x2"] = df["target_1x2"].astype(int)

    # Ordena temporalmente
    df = df.sort_values("date").reset_index(drop=True)

    # -------------------------
    # Split temporal (sem leakage)
    # 80% treino, 10% val, 10% teste pelo tempo
    # -------------------------
    n = len(df)
    i_train_end = int(n * 0.80)
    i_val_end = int(n * 0.90)

    train_df = df.iloc[:i_train_end].copy()
    val_df   = df.iloc[i_train_end:i_val_end].copy()
    test_df  = df.iloc[i_val_end:].copy()

    # -------------------------
    # Features
    # - numéricas (Elo + forma)
    # - categóricas (pool_key, competition) como one-hot
    # -------------------------
    num_cols = [
        "elo_home_pre", "elo_away_pre", "elo_diff",
        "form_pts_home_3", "form_pts_home_5",
        "form_pts_away_3", "form_pts_away_5",
        "gd_home_5", "gd_away_5",
    ]
    cat_cols = ["pool_key", "competition"]

    def make_X(d: pd.DataFrame) -> pd.DataFrame:
        Xn = d[num_cols].copy()
        Xc = pd.get_dummies(d[cat_cols].astype(str), prefix=cat_cols, dummy_na=False)
        X = pd.concat([Xn, Xc], axis=1)
        return X

    X_train = make_X(train_df)
    y_train = train_df["target_1x2"].values

    X_val = make_X(val_df)
    y_val = val_df["target_1x2"].values

    X_test = make_X(test_df)
    y_test = test_df["target_1x2"].values

    # Alinha colunas (val/test podem ter categorias ausentes)
    all_cols = sorted(set(X_train.columns) | set(X_val.columns) | set(X_test.columns))
    X_train = X_train.reindex(columns=all_cols, fill_value=0)
    X_val   = X_val.reindex(columns=all_cols, fill_value=0)
    X_test  = X_test.reindex(columns=all_cols, fill_value=0)

    # Guarda as colunas para inferência futura
    joblib.dump(all_cols, COLS_PATH)

    # -------------------------
    # Model: XGBoost multiclass
    # -------------------------
    model = XGBClassifier(
        n_estimators=800,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        min_child_weight=1.0,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=42,
    )

    # early stopping com validação
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    # -------------------------
    # Eval
    # -------------------------
    def eval_split(name: str, X, y):
        prob = model.predict_proba(X)
        pred = prob.argmax(axis=1)

        acc = accuracy_score(y, pred)
        ll = log_loss(y, prob, labels=[0, 1, 2])

        print("\n" + "=" * 70)
        print(f"{name}")
        print("=" * 70)
        print(f"Accuracy: {acc:.4f}")
        print(f"LogLoss:  {ll:.4f}")
        print("\nConfusion matrix (linhas = real, colunas = previsto):")
        print(confusion_matrix(y, pred, labels=[0, 1, 2]))
        print("\nRelatório:")
        print(classification_report(y, pred, digits=4))

        return acc, ll

    train_acc, train_ll = eval_split("TRAIN", X_train, y_train)
    val_acc, val_ll     = eval_split("VAL", X_val, y_val)
    test_acc, test_ll   = eval_split("TEST", X_test, y_test)

    # -------------------------
    # Save model + metadata
    # -------------------------
    model.save_model(MODEL_PATH)

    meta = {
        "data_path": DATA_PATH,
        "n_rows": int(len(df)),
        "date_min": str(df["date"].min().date()),
        "date_max": str(df["date"].max().date()),
        "split": {
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
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "model_path": MODEL_PATH,
        "columns_path": COLS_PATH,
    }

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("\n" + "-" * 70)
    print("[OK] Modelo salvo em:", MODEL_PATH)
    print("[OK] Colunas salvas em:", COLS_PATH)
    print("[OK] Metadata salva em:", META_PATH)
    print("-" * 70)


if __name__ == "__main__":
    main()
