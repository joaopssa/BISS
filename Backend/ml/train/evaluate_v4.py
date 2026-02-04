import os
import pandas as pd
import numpy as np
import pickle
import xgboost as xgb
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score

BASE = os.path.dirname(__file__)
processed_path = os.path.join(os.path.dirname(BASE), 'processed', 'matches_enriched_with_real_odds.csv')
model_path = os.path.join(BASE, 'xgb_1x2_v4.json')
scaler_path = os.path.join(BASE, 'xgb_1x2_v4_scaler.pkl')
cols_path = os.path.join(BASE, 'xgb_1x2_v4_columns.pkl')

print('Carregando dataset...')
df = pd.read_csv(processed_path, low_memory=False)
print(f'  rows: {len(df)}')

print('Carregando artefatos do modelo...')
model = xgb.XGBClassifier()
model.load_model(model_path)
scaler = pickle.load(open(scaler_path, 'rb'))
feature_cols = pickle.load(open(cols_path, 'rb'))

# Garantir colunas
feature_cols = [c for c in feature_cols if c in df.columns]
print(f'Features usadas: {len(feature_cols)}')

# Preencher odds ausentes com 1/3 (mesmo tratamento do treino)
for col in ['prob_home_implied', 'prob_draw_implied', 'prob_away_implied']:
    if col in df.columns:
        df[col] = df[col].fillna(1/3)

X = df[feature_cols].copy()
# Se alguma coluna faltar, preencher com zeros
for c in feature_cols:
    if c not in X.columns:
        X[c] = 0.0

# Normalizar com scaler treinado
X_scaled = scaler.transform(X)

# Target e split temporal (mesma regra do treino)
y = df['target_1x2']
n = len(X_scaled)
train_idx = int(0.70 * n)
val_idx = int(0.85 * n)

X_test = X_scaled[val_idx:]
y_test = y[val_idx:]
df_test = df.iloc[val_idx:].copy()

print('\nAvaliando no conjunto de teste...')
proba = model.predict_proba(X_test)
y_pred = np.argmax(proba, axis=1)
acc = accuracy_score(y_test, y_pred)
print(f'  Test accuracy: {acc:.4f} ({acc*100:.2f}%)')

cm = confusion_matrix(y_test, y_pred)
print('\nConfusion Matrix:\n', cm)

print('\nClassification Report:')
print(classification_report(y_test, y_pred, target_names=['Home(1)', 'Draw(X)', 'Away(2)']))

# Por competição (apenas competições com >= 10 jogos no teste)
print('\nCalculando acurácia por competição (test set)...')
by_comp = df_test.groupby('competition').apply(lambda g: pd.Series({
    'n': len(g),
    'accuracy': accuracy_score(g['target_1x2'], model.predict(scaler.transform(g[feature_cols])))
}))
by_comp = by_comp.sort_values(['n','accuracy'], ascending=[False, False])
processed_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'processed')
os.makedirs(processed_dir, exist_ok=True)
by_comp.to_csv(os.path.join(processed_dir, 'v4_evaluation_by_competition.csv'))
print('  Saved: processed/v4_evaluation_by_competition.csv')

# Mostrar top 10 competições por número de jogos com suas acurácias
top10 = by_comp.sort_values('n', ascending=False).head(10)
print('\nTop 10 competitions (test set):')
print(top10[['n','accuracy']])

# Salvar resumo
summary = {
    'test_accuracy': float(acc),
    'n_test': int(len(y_test))
}
pd.Series(summary).to_csv(os.path.join(BASE, 'v4_evaluation_summary.csv'))
print('\nSaved summary: train/v4_evaluation_summary.csv')
print('Concluído')
