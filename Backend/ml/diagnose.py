# Backend/ml/diagnose.py
# Script para diagnosticar problemas e sugerir melhorias

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path


def diagnose_ml_system():
    """Analisa o sistema de ML e sugere melhorias"""
    
    BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_PATH = os.path.join(BACKEND_DIR, "ml", "processed", "matches_enriched.csv")
    MODELS_DIR = os.path.join(BACKEND_DIR, "ml", "models")
    META_PATH = os.path.join(MODELS_DIR, "xgb_1x2_meta.json")
    
    print("\n" + "="*80)
    print("DIAGNÓSTICO DO SISTEMA DE MACHINE LEARNING")
    print("="*80)
    
    # ==================
    # 1. Verificar dados
    # ==================
    print("\n[1️⃣ DADOS]")
    print("-" * 80)
    
    if not os.path.exists(DATA_PATH):
        print("❌ Dataset não encontrado!")
        return
    
    df = pd.read_csv(DATA_PATH)
    print(f"✅ Dataset carregado: {len(df)} partidas")
    print(f"   Período: {df['date'].min()} até {df['date'].max()}")
    
    # Distribuição de resultados
    target_counts = df['target_1x2'].value_counts().sort_index()
    print(f"\n   Distribuição de resultados:")
    classes = {0: "Vitória Casa", 1: "Empate", 2: "Vitória Visitante"}
    for cls, count in target_counts.items():
        pct = 100 * count / len(df)
        print(f"     {classes[cls]}: {count} ({pct:.1f}%)")
    
    # Ligas
    print(f"\n   Competições no dataset:")
    for comp, count in df['competition'].value_counts().items():
        print(f"     {comp}: {count}")
    
    # Features
    num_cols = [c for c in df.columns if 'home' in c or 'away' in c or 'elo' in c or 'form' in c or 'gd' in c or 'momentum' in c or 'consistency' in c]
    print(f"\n   Features numéricas: {len(num_cols)}")
    for col in sorted(num_cols):
        nan_pct = 100 * df[col].isna().sum() / len(df)
        if nan_pct > 0:
            print(f"     ⚠️  {col}: {nan_pct:.1f}% missing")
    
    # ==================
    # 2. Verificar modelo
    # ==================
    print("\n[2️⃣ MODELO]")
    print("-" * 80)
    
    if not os.path.exists(META_PATH):
        print("⚠️  Modelo v1 não encontrado (esperado se só treinou v2)")
    else:
        with open(META_PATH) as f:
            meta_v1 = json.load(f)
        
        print("✅ Modelo v1 detectado:")
        print(f"   Acurácia Teste: {meta_v1['metrics']['test']['accuracy']:.2%}")
        print(f"   LogLoss Teste: {meta_v1['metrics']['test']['logloss']:.4f}")
    
    meta_v2_path = os.path.join(MODELS_DIR, "xgb_1x2_v2_meta.json")
    if os.path.exists(meta_v2_path):
        with open(meta_v2_path) as f:
            meta_v2 = json.load(f)
        
        print("\n✅ Modelo v2 (melhorado) detectado:")
        print(f"   Acurácia Teste: {meta_v2['metrics']['test']['accuracy']:.2%}")
        print(f"   LogLoss Teste: {meta_v2['metrics']['test']['logloss']:.4f}")
        print(f"   CV Média: {meta_v2['metrics']['cv_mean']:.2%}")
        print(f"   Features: {len(meta_v2['num_cols'])} numéricas + {len(meta_v2['cat_cols'])} categóricas")
        print(f"   Melhorias aplicadas:")
        for improvement in meta_v2.get('improvements', []):
            print(f"     ✨ {improvement}")
    
    # ==================
    # 3. Problemas detectados
    # ==================
    print("\n[3️⃣ PROBLEMAS DETECTADOS]")
    print("-" * 80)
    
    problems = []
    
    # Desbalanceamento
    if target_counts.max() / target_counts.min() > 2.0:
        problems.append(f"⚠️  Desbalanceamento de classes (razão {target_counts.max() / target_counts.min():.1f}x)")
    
    # Poucos dados por competição
    min_comp_size = df['competition'].value_counts().min()
    if min_comp_size < 100:
        problems.append(f"⚠️  Algumas competições têm <100 partidas (dados insuficientes)")
    
    # Features com muitos NaN
    for col in num_cols:
        if df[col].isna().sum() / len(df) > 0.5:
            problems.append(f"⚠️  {col} tem >50% valores faltantes")
    
    # Acurácia baixa
    if os.path.exists(META_PATH):
        if meta_v1['metrics']['test']['accuracy'] < 0.52:
            problems.append(f"⚠️  Modelo v1 apenas {meta_v1['metrics']['test']['accuracy']:.2%} (pouco melhor que acaso)")
    
    if not problems:
        print("✅ Nenhum problema crítico detectado!")
    else:
        for p in problems:
            print(p)
    
    # ==================
    # 4. Recomendações
    # ==================
    print("\n[4️⃣ RECOMENDAÇÕES]")
    print("-" * 80)
    
    recommendations = [
        "✅ Use o modelo v2 em produção (tem melhorias implementadas)",
        "📊 Colete mais dados históricos se possível (atual: 34k partidas)",
        "🎯 Experimente ensemble com modelos complementares (LightGBM, CatBoost)",
        "📈 Adicione features: odd implícitas, tendências sazonais, lesões/suspensões",
        "🔄 Retreine o modelo a cada 2-4 semanas com novos dados",
        "📉 Para competições com <100 partidas, combine pools ou use transfer learning",
        "🚀 Considere modelos mais complexos (Neural Networks, Transformers) se acurácia platear",
    ]
    
    for rec in recommendations:
        print(rec)
    
    # ==================
    # 5. Próximos passos
    # ==================
    print("\n[5️⃣ PRÓXIMOS PASSOS]")
    print("-" * 80)
    
    print("\n1️⃣  Treinar modelo v2 melhorado:")
    print("   python Backend/ml/train/train_1x2_xgb_v2_improved.py")
    print("\n2️⃣  Testar predições:")
    print("   python Backend/ml/predict.py")
    print("\n3️⃣  Integrar em APIs:")
    print("   from Backend.ml.predict import MatchPredictor")
    print("   predictor = MatchPredictor('Backend/ml/models', version='v2')")
    print("   result = predictor.predict({...match_data...})")
    
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    diagnose_ml_system()
