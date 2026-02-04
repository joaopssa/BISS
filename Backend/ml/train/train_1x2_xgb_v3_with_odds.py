# Backend/ml/train/train_1x2_xgb_v3_with_odds.py
# Versão v3: Modelo com Odds Implícitas + Dados de Lesões

import os
import json
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Tuple

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, log_loss, classification_report, confusion_matrix
from sklearn.model_selection import TimeSeriesSplit
from xgboost import XGBClassifier
import optuna
from optuna.pruners import MedianPruner


def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)


def main():
    # -------------------------
    # Paths
    # -------------------------
    THIS_DIR = os.path.dirname(os.path.abspath(__file__))
    ML_DIR = os.path.abspath(os.path.join(THIS_DIR, ".."))

    DATA_PATH = os.path.join(ML_DIR, "processed", "matches_enriched_with_odds_injuries.csv")
    MODELS_DIR = os.path.join(ML_DIR, "models")
    ensure_dir(MODELS_DIR)

    MODEL_PATH = os.path.join(MODELS_DIR, "xgb_1x2_v3.json")
    META_PATH = os.path.join(MODELS_DIR, "xgb_1x2_v3_meta.json")
    COLS_PATH = os.path.join(MODELS_DIR, "xgb_1x2_v3_columns.pkl")
    SCALER_PATH = os.path.join(MODELS_DIR, "xgb_1x2_v3_scaler.pkl")

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset não encontrado em: {DATA_PATH}")

    # -------------------------
    # Load
    # -------------------------
    df = pd.read_csv(DATA_PATH)

    print(f"\n[INFO] Dataset carregado com {len(df)} partidas e {len(df.columns)} features")

    # Garantias mínimas
    needed_cols = {
        "date", "target_1x2",
        "elo_home_pre", "elo_away_pre", "elo_diff",
        "form_pts_home_3", "form_pts_home_5", "form_pts_away_3", "form_pts_away_5",
        "gd_home_5", "gd_away_5",
        "pool_key", "competition",
        # NOVO: odds + lesões
        "prob_home_implied", "prob_draw_implied", "prob_away_implied",
        "injury_impact_home", "injury_impact_away",
    }
    missing = needed_cols - set(df.columns)
    if missing:
        raise RuntimeError(f"Dataset está faltando colunas: {missing}")

    # Converte date
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "target_1x2"]).copy()

    # target precisa ser int 0/1/2
    df["target_1x2"] = df["target_1x2"].astype(int)

    # Remove outliers extremos
    for col in ["elo_home_pre", "elo_away_pre"]:
        q1, q99 = df[col].quantile([0.01, 0.99])
        df = df[(df[col] >= q1) & (df[col] <= q99)]

    # Ordena temporalmente
    df = df.sort_values("date").reset_index(drop=True)

    # -------------------------
    # Split temporal (sem leakage)
    # 70% treino, 15% val, 15% teste
    # -------------------------
    n = len(df)
    i_train_end = int(n * 0.70)
    i_val_end = int(n * 0.85)

    train_df = df.iloc[:i_train_end].copy()
    val_df   = df.iloc[i_train_end:i_val_end].copy()
    test_df  = df.iloc[i_val_end:].copy()

    # -------------------------
    # Features: ORIGINAL + NOVAS (odds + lesões)
    # -------------------------
    num_cols = [
        # Original
        "elo_home_pre", "elo_away_pre", "elo_diff",
        "form_pts_home_3", "form_pts_home_5",
        "form_pts_away_3", "form_pts_away_5",
        "gd_home_5", "gd_away_5",
        # v2
        "form_avg_home_5", "form_avg_away_5",
        "gd_avg_home_5", "gd_avg_away_5",
        "momentum_home", "momentum_away",
        "consistency_home", "consistency_away",
        # ✅ V3: ODDS + LESÕES (as features mais poderosas!)
        "prob_home_implied", "prob_draw_implied", "prob_away_implied",
        "market_margin",
        "injury_impact_home", "injury_impact_away",
    ]
    
    # Filtrar apenas colunas que existem
    num_cols = [col for col in num_cols if col in df.columns]

    cat_cols = ["pool_key", "competition"]

    def make_X(d: pd.DataFrame) -> pd.DataFrame:
        Xn = d[num_cols].copy()
        Xn = Xn.fillna(0)
        
        Xc = pd.get_dummies(d[cat_cols].astype(str), prefix=cat_cols, dummy_na=False)
        X = pd.concat([Xn, Xc], axis=1)
        return X

    X_train = make_X(train_df)
    y_train = train_df["target_1x2"].values

    X_val = make_X(val_df)
    y_val = val_df["target_1x2"].values

    X_test = make_X(test_df)
    y_test = test_df["target_1x2"].values

    # Alinha colunas
    all_cols = sorted(set(X_train.columns) | set(X_val.columns) | set(X_test.columns))
    X_train = X_train.reindex(columns=all_cols, fill_value=0)
    X_val   = X_val.reindex(columns=all_cols, fill_value=0)
    X_test  = X_test.reindex(columns=all_cols, fill_value=0)

    # ✅ NORMALIZAÇÃO
    scaler = StandardScaler()
    X_train_scaled = X_train.copy()
    X_train_scaled[num_cols] = scaler.fit_transform(X_train[num_cols])
    
    X_val_scaled = X_val.copy()
    X_val_scaled[num_cols] = scaler.transform(X_val[num_cols])
    
    X_test_scaled = X_test.copy()
    X_test_scaled[num_cols] = scaler.transform(X_test[num_cols])

    # Guarda colunas e scaler
    joblib.dump(all_cols, COLS_PATH)
    joblib.dump(scaler, SCALER_PATH)

    # ✅ BALANCEAMENTO
    class_counts = np.bincount(y_train, minlength=3)
    class_weights = {i: (len(y_train) / (3 * count)) if count > 0 else 1.0 
                     for i, count in enumerate(class_counts)}
    sample_weights = np.array([class_weights[y] for y in y_train])

    print(f"\n[INFO] Distribuição de classes no treino:")
    for i, count in enumerate(class_counts):
        print(f"  Classe {i}: {count} ({100*count/len(y_train):.1f}%)")

    # ✅ HYPERPARAMETER TUNING (mais rápido desta vez, 30 trials)
    print(f"\n[INFO] Iniciando tuning automático (max 30 trials)...")
    
    def objective(trial: optuna.Trial) -> float:
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 200, 1500),
            "max_depth": trial.suggest_int("max_depth", 3, 8),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "reg_lambda": trial.suggest_float("reg_lambda", 0.1, 5.0, log=True),
            "reg_alpha": trial.suggest_float("reg_alpha", 0.1, 5.0, log=True),
            "min_child_weight": trial.suggest_float("min_child_weight", 0.5, 5.0),
            "objective": "multi:softprob",
            "num_class": 3,
            "eval_metric": "mlogloss",
            "tree_method": "hist",
            "random_state": 42,
            "verbosity": 0,
        }

        clf = XGBClassifier(**params)
        clf.fit(
            X_train_scaled, y_train,
            eval_set=[(X_val_scaled, y_val)],
            sample_weight=sample_weights,
            verbose=False,
        )
        
        prob_val = clf.predict_proba(X_val_scaled)
        val_logloss = log_loss(y_val, prob_val, labels=[0, 1, 2])
        
        return val_logloss

    sampler = optuna.samplers.TPESampler(seed=42)
    study = optuna.create_study(sampler=sampler, pruner=MedianPruner())
    study.optimize(objective, n_trials=30, show_progress_bar=True)

    best_params = study.best_params
    best_params.update({
        "objective": "multi:softprob",
        "num_class": 3,
        "eval_metric": "mlogloss",
        "tree_method": "hist",
        "random_state": 42,
    })

    print(f"\n[OK] Melhores hiperparâmetros encontrados:")
    for k, v in best_params.items():
        if k not in ["objective", "num_class", "eval_metric", "tree_method", "random_state"]:
            print(f"  {k}: {v}")

    # ✅ TREINO FINAL
    model = XGBClassifier(**best_params)
    model.fit(
        X_train_scaled, y_train,
        eval_set=[(X_val_scaled, y_val)],
        sample_weight=sample_weights,
        verbose=False,
    )

    # ✅ VALIDAÇÃO CRUZADA TEMPORAL
    print(f"\n[INFO] Executando validação cruzada temporal (5 folds)...")
    
    cv = TimeSeriesSplit(n_splits=5)
    cv_scores = []
    
    for fold, (train_idx, test_idx) in enumerate(cv.split(X_train_scaled)):
        X_cv_train = X_train_scaled.iloc[train_idx]
        y_cv_train = y_train[train_idx]
        X_cv_test = X_train_scaled.iloc[test_idx]
        y_cv_test = y_train[test_idx]
        
        cv_model = XGBClassifier(**best_params)
        cv_model.fit(X_cv_train, y_cv_train, verbose=False)
        
        cv_pred = cv_model.predict(X_cv_test)
        cv_acc = accuracy_score(y_cv_test, cv_pred)
        cv_scores.append(cv_acc)
        print(f"  Fold {fold+1}: {cv_acc:.4f}")
    
    print(f"  Média CV: {np.mean(cv_scores):.4f} (±{np.std(cv_scores):.4f})")

    # -------------------------
    # Evaluação final
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

    train_acc, train_ll = eval_split("TRAIN", X_train_scaled, y_train)
    val_acc, val_ll     = eval_split("VAL", X_val_scaled, y_val)
    test_acc, test_ll   = eval_split("TEST", X_test_scaled, y_test)

    # ✅ FEATURE IMPORTANCE
    print(f"\n[INFO] Top 15 features mais importantes:")
    importance = pd.DataFrame({
        "feature": all_cols,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)
    
    for idx, row in importance.head(15).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")

    # -------------------------
    # Save model + metadata
    # -------------------------
    model.save_model(MODEL_PATH)

    meta = {
        "version": "v3_with_odds_injuries",
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
            "cv_mean": float(np.mean(cv_scores)),
            "cv_std": float(np.std(cv_scores)),
        },
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "best_params": {k: v for k, v in best_params.items() 
                       if k not in ["objective", "num_class", "eval_metric", "tree_method", "random_state"]},
        "model_path": MODEL_PATH,
        "columns_path": COLS_PATH,
        "scaler_path": SCALER_PATH,
        "improvements": [
            "✨ v2: Normalização, balanceamento, tuning, validação cruzada",
            "✨ v3: ODDS IMPLÍCITAS (feature mais poderosa)",
            "✨ v3: DADOS DE LESÕES (impacto em desempenho)",
            "✨ Validação cruzada temporal (5 folds)",
        ]
    }

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("\n" + "-" * 70)
    print("[✅] Modelo v3 com odds salvo em:", MODEL_PATH)
    print("[✅] Colunas salvas em:", COLS_PATH)
    print("[✅] Scaler salvo em:", SCALER_PATH)
    print("[✅] Metadata salva em:", META_PATH)
    print("-" * 70)


if __name__ == "__main__":
    main()
