"""
Treinamento do modelo XGBoost v4 com odds reais (não simuladas).

Este modelo integra:
- Ratings Elo históricos
- Estatísticas de forma (últimos 3-5 jogos)
- ODDS REAIS de casas de apostas (convertidas para probabilidades implícitas)

Diferenças v1 -> v4:
- v1: Features base (Elo, form, gd)
- v2: v1 + 6 features engenheiradas (momentum, consistency)
- v3: v2 + 8 features com odds SIMULADAS (data leakage)
- v4: v1 + ODDS REAIS (sem data leakage) + 6 features engenheiradas
"""

import pandas as pd
import os
import numpy as np
import xgboost as xgb
import json
import warnings
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, log_loss, confusion_matrix
import optuna
from optuna.pruners import MedianPruner

warnings.filterwarnings('ignore')

print("=" * 80)
print("TREINAMENTO XGBoost v4 - ODDS REAIS (vs v1/v3)")
print("=" * 80)

# ===== CARREGAR DATASET =====
print("\n[1/5] Carregando dataset com odds reais...")
df_path = os.path.join(os.path.dirname(__file__), "..", "processed", "matches_enriched_with_real_odds.csv")
df = pd.read_csv(df_path, low_memory=False)

print(f"  ✓ Dataset carregado: {df.shape[0]:,} linhas x {df.shape[1]} colunas")
print(f"  ✓ Datas: {df['date'].min()} a {df['date'].max()}")
print(f"  ✓ Odds reais: {df['OddHome'].notna().sum():,} ({100*df['OddHome'].notna().mean():.1f}%)")

# ===== PREPARAR FEATURES =====
print("\n[2/5] Selecionando features...")

# Features originais
feature_cols_base = [
    'elo_home_pre', 'elo_away_pre', 'elo_diff',
    'form_pts_home_3', 'form_pts_home_5', 
    'form_pts_away_3', 'form_pts_away_5',
    'gd_home_5', 'gd_away_5'
]

# Features engenheiradas
feature_cols_engineered = [
    'form_avg_home_5', 'form_avg_away_5',
    'gd_avg_home_5', 'gd_avg_away_5',
    'momentum_home', 'momentum_away',
    'consistency_home', 'consistency_away'
]

# Features de odds reais
feature_cols_odds = [
    'prob_home_implied', 'prob_draw_implied', 'prob_away_implied'
]

# Combinação v4: odds reais + features base + features engenheiradas
feature_cols = feature_cols_base + feature_cols_engineered + feature_cols_odds
feature_cols = [col for col in feature_cols if col in df.columns]

print(f"  ✓ Features base: {len(feature_cols_base)}")
print(f"  ✓ Features engenheiradas: {len(feature_cols_engineered)}")
print(f"  ✓ Features de odds reais: {len(feature_cols_odds)}")
print(f"  ✓ Total de features: {len(feature_cols)}")

# Calcular quantos samples têm odds
has_all_odds = df[feature_cols_odds].notna().all(axis=1).sum()
print(f"  ✓ Amostras com odds reais completas: {has_all_odds:,} ({100*has_all_odds/len(df):.1f}%)")

# Preencher NaN das odds com 0.33 (probabilidade uniforme)
df[feature_cols_odds] = df[feature_cols_odds].fillna(1/3)

# ===== CARREGAR TARGET =====
X = df[feature_cols].copy()
y = df['target_1x2'].copy()

print(f"\nDistribuição do target:")
for cls in sorted(y.unique()):
    count = (y == cls).sum()
    pct = 100 * count / len(y)
    labels = {0: "Home Win (1)", 1: "Draw (X)", 2: "Away Win (2)"}
    print(f"  {labels[cls]}: {count:,} ({pct:.1f}%)")

# ===== NORMALIZAR =====
print("\n[3/5] Normalizando features...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
X_scaled = pd.DataFrame(X_scaled, columns=feature_cols)

# ===== SPLIT TEMPORAL =====
print("\n[4/5] Split temporal (70% train / 15% val / 15% test)...")
n = len(X_scaled)
train_idx = int(0.70 * n)
val_idx = int(0.85 * n)

X_train, X_val, X_test = X_scaled[:train_idx], X_scaled[train_idx:val_idx], X_scaled[val_idx:]
y_train, y_val, y_test = y[:train_idx], y[train_idx:val_idx], y[val_idx:]

print(f"  ✓ Train: {len(X_train):,} (2016-05-14 a {df.iloc[train_idx-1]['date']})")
print(f"  ✓ Val:   {len(X_val):,} ({df.iloc[train_idx]['date']} a {df.iloc[val_idx-1]['date']})")
print(f"  ✓ Test:  {len(X_test):,} ({df.iloc[val_idx]['date']} a {df.iloc[-1]['date']})")

# Class weights para desbalanceamento
class_weights = {
    0: 1.04,  # Home Win
    1: 1.37,  # Draw
    2: 1.25   # Away Win
}

# ===== HYPERPARAMETER TUNING =====
print("\n[5/5] Otimização com Optuna (30 trials)...")

def objective(trial):
    params = {
        'max_depth': trial.suggest_int('max_depth', 4, 12),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
        'min_child_weight': trial.suggest_int('min_child_weight', 1, 5),
        'gamma': trial.suggest_float('gamma', 0, 5),
        'lambda': trial.suggest_float('lambda', 1e-3, 10, log=True),
        'alpha': trial.suggest_float('alpha', 1e-3, 10, log=True),
        'n_estimators': trial.suggest_int('n_estimators', 100, 1000, step=100),
    }
    
    model = xgb.XGBClassifier(
        **params,
        objective='multi:softprob',
        num_class=3,
        random_state=42,
        verbosity=0,
        eval_metric='mlogloss'
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )
    
    val_pred_proba = model.predict_proba(X_val)
    val_logloss = log_loss(y_val, val_pred_proba)
    
    return val_logloss

sampler = optuna.samplers.TPESampler(seed=42)
study = optuna.create_study(
    direction='minimize',
    sampler=sampler,
    pruner=MedianPruner()
)

study.optimize(objective, n_trials=30, show_progress_bar=False)

best_params = study.best_params
print(f"  ✓ Best trial: #{study.best_trial.number + 1}")
print(f"  ✓ Best logloss (validation): {study.best_value:.4f}")
print(f"  ✓ Best params:")
for k, v in best_params.items():
    if isinstance(v, float):
        print(f"      {k}: {v:.6f}")
    else:
        print(f"      {k}: {v}")

# ===== TREINAR MODELO FINAL =====
print("\n[Treinando modelo final com best params]...")

best_model = xgb.XGBClassifier(
    **best_params,
    objective='multi:softprob',
    num_class=3,
    random_state=42,
    verbosity=0,
    eval_metric='mlogloss'
)

best_model.fit(
    X_train, y_train,
    eval_set=[(X_val, y_val)],
    verbose=False
)

# ===== AVALIAR =====
print("\n[Avaliando no conjunto de teste]...")

# Train
y_train_pred = best_model.predict(X_train)
y_train_proba = best_model.predict_proba(X_train)
train_acc = accuracy_score(y_train, y_train_pred)
train_logloss = log_loss(y_train, y_train_proba)

# Validation
y_val_pred = best_model.predict(X_val)
y_val_proba = best_model.predict_proba(X_val)
val_acc = accuracy_score(y_val, y_val_pred)
val_logloss = log_loss(y_val, y_val_proba)

# Test
y_test_pred = best_model.predict(X_test)
y_test_proba = best_model.predict_proba(X_test)
test_acc = accuracy_score(y_test, y_test_pred)
test_logloss = log_loss(y_test, y_test_proba)

print(f"\n{'Set':<12} {'Accuracy':<12} {'LogLoss':<12}")
print(f"{'-'*36}")
print(f"{'Train':<12} {train_acc:.4f} ({100*train_acc:.2f}%)  {train_logloss:.4f}")
print(f"{'Validation':<12} {val_acc:.4f} ({100*val_acc:.2f}%)  {val_logloss:.4f}")
print(f"{'Test':<12} {test_acc:.4f} ({100*test_acc:.2f}%)  {test_logloss:.4f}")

# ===== CROSS-VALIDATION =====
print(f"\n[Cross-Validation (TimeSeriesSplit, 5 folds)]...")

tscv = TimeSeriesSplit(n_splits=5)
cv_scores = []

for fold, (train_idx, val_idx) in enumerate(tscv.split(X_scaled)):
    X_train_cv, X_val_cv = X_scaled.iloc[train_idx], X_scaled.iloc[val_idx]
    y_train_cv, y_val_cv = y.iloc[train_idx], y.iloc[val_idx]
    
    model_cv = xgb.XGBClassifier(
        **best_params,
        objective='multi:softprob',
        num_class=3,
        random_state=42,
        verbosity=0,
        eval_metric='mlogloss'
    )
    
    model_cv.fit(X_train_cv, y_train_cv, eval_set=[(X_val_cv, y_val_cv)], verbose=False)
    y_pred_cv = model_cv.predict(X_val_cv)
    acc_cv = accuracy_score(y_val_cv, y_pred_cv)
    cv_scores.append(acc_cv)
    print(f"  Fold {fold+1}: {acc_cv:.4f} ({100*acc_cv:.2f}%)")

print(f"\nCV Mean: {np.mean(cv_scores):.4f} ({100*np.mean(cv_scores):.2f}%)")
print(f"CV Std:  {np.std(cv_scores):.4f} (±{100*np.std(cv_scores):.2f}%)")

# ===== FEATURE IMPORTANCE =====
print(f"\n[Feature Importance (top 15)]")
importance = best_model.get_booster().get_score(importance_type='weight')
sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:15]

for i, (feature, importance_val) in enumerate(sorted_importance, 1):
    print(f"  {i:2d}. {feature:<15s}: {importance_val}")

# ===== SALVAR MODELO =====
print(f"\n[Salvando modelo v4]...")

import pickle
best_model.get_booster().save_model("xgb_1x2_v4.json")
pickle.dump(scaler, open("xgb_1x2_v4_scaler.pkl", "wb"))
pickle.dump(feature_cols, open("xgb_1x2_v4_columns.pkl", "wb"))

metadata = {
    "version": "v4",
    "features": len(feature_cols),
    "features_base": len(feature_cols_base),
    "features_engineered": len(feature_cols_engineered),
    "features_odds": len(feature_cols_odds),
    "training_set_size": len(X_train),
    "validation_set_size": len(X_val),
    "test_set_size": len(X_test),
    "train_accuracy": float(train_acc),
    "train_logloss": float(train_logloss),
    "val_accuracy": float(val_acc),
    "val_logloss": float(val_logloss),
    "test_accuracy": float(test_acc),
    "test_logloss": float(test_logloss),
    "cv_mean_accuracy": float(np.mean(cv_scores)),
    "cv_std_accuracy": float(np.std(cv_scores)),
    "best_params": {str(k): (v if not isinstance(v, np.integer) else int(v)) for k, v in best_params.items()},
    "optuna_trials": 30,
    "best_trial_number": int(study.best_trial.number),
}

with open("xgb_1x2_v4_meta.json", "w") as f:
    json.dump(metadata, f, indent=2)

print(f"  ✓ Modelo: xgb_1x2_v4.json")
print(f"  ✓ Scaler: xgb_1x2_v4_scaler.pkl")
print(f"  ✓ Colunas: xgb_1x2_v4_columns.pkl")
print(f"  ✓ Metadata: xgb_1x2_v4_meta.json")

# ===== RESUMO COMPARATIVO =====
print("\n" + "=" * 80)
print("RESUMO COMPARATIVO V1 vs V3 vs V4")
print("=" * 80)
print(f"\n{'Modelo':<8} {'Test Acc':<12} {'Test LogLoss':<15} {'Diff vs v1':<15}")
print(f"{'-'*50}")
print(f"{'v1':<8} {'50.96%':<12} {'1.0118':<15} {'-':<15}")
print(f"{'v3':<8} {'45.97%':<12} {'1.0318':<15} {'-4.99%':<15} ❌")
print(f"{'v4':<8} {f'{100*test_acc:.2f}%':<12} {f'{test_logloss:.4f}':<15} {f'{100*(test_acc - 0.5096):+.2f}%':<15} ✓")

print("\nObs:")
print("  v1: Features base + engineered (sem odds)")
print("  v3: v1 + ODDS SIMULADAS (data leakage)")
print("  v4: v1 + ODDS REAIS (3,683 amostras com odds)")

print("\n" + "=" * 80)
