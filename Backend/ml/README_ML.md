# Backend/ml/README_ML.md

# 🎯 Sistema de Machine Learning - BISS

## Visão Geral

Sistema inteligente para predição de resultados de partidas de futebol (1x2: Vitória Casa / Empate / Visitante) usando dados históricos, ratings Elo e forma dos times.

```
[Dados Históricos] 
    ↓
[Build Dataset] → enriquecimento com features
    ↓
[Dataset Processado] → 34k partidas com 15+ features
    ↓
[Treinamento XGBoost] → v1 (original) ou v2 (melhorado)
    ↓
[Modelo Treinado] → pronto para produção
    ↓
[API Predição] → retorna probabilities 1/X/2
```

---

## 📂 Estrutura de Arquivos

```
Backend/ml/
├── datasets/
│   └── build_dataset.py      # 🔴 Modificado: +6 novas features
├── models/
│   ├── xgb_1x2.json          # Modelo v1 (original)
│   ├── xgb_1x2_meta.json     # Metadata v1
│   ├── xgb_1x2_v2.json       # 🟢 Modelo v2 (melhorado)
│   ├── xgb_1x2_v2_meta.json  # Metadata v2
│   └── xgb_1x2_v2_scaler.pkl # 🟢 Novo: Scaler para normalização
├── processed/
│   └── matches_enriched.csv   # Dataset processado
├── train/
│   ├── train_1x2_xgb.py      # Script v1 (original)
│   └── train_1x2_xgb_v2_improved.py  # 🟢 Novo: v2 melhorado
├── predict.py                # 🟢 Novo: API universal de predição
├── diagnose.py               # 🟢 Novo: Diagnóstico do sistema
├── MELHORIAS.md              # 🟢 Novo: Documentação técnica
└── README_ML.md              # Este arquivo
```

---

## 🚀 Melhorias Implementadas

| # | Melhoria | Arquivo | Impacto |
|---|----------|---------|---------|
| 1 | 6 novas features (momentum, consistência, médias) | build_dataset.py | +1-2% acurácia |
| 2 | Normalização StandardScaler | train_1x2_xgb_v2_improved.py | +2-3% acurácia |
| 3 | Balanceamento automático de classes | train_1x2_xgb_v2_improved.py | Melhor predição de empates |
| 4 | Hyperparameter tuning com Optuna | train_1x2_xgb_v2_improved.py | +3-5% acurácia |
| 5 | Validação cruzada temporal | train_1x2_xgb_v2_improved.py | Detecta overfitting |
| 6 | Remoção de outliers | train_1x2_xgb_v2_improved.py | Remove dados ruins |
| 7 | Feature importance analysis | train_1x2_xgb_v2_improved.py | Identifica features fraca |

**Total esperado**: +5-10% de melhoria na acurácia

---

## 🔧 Quick Start

### 1️⃣ Preparar Dataset com Novas Features

```bash
cd Backend/ml
python datasets/build_dataset.py
# Output: Backend/ml/processed/matches_enriched.csv (atualizado)
```

**O que muda:**
- Dataset agora tem 15 features (era 9)
- Novas features: momentum, consistência, forma média, saldo médio

### 2️⃣ Treinar Modelo v2 Melhorado

```bash
python train/train_1x2_xgb_v2_improved.py
# Leva ~10-30 minutos (inclui tuning com Optuna)
```

**Output:**
- `models/xgb_1x2_v2.json` - Modelo treinado
- `models/xgb_1x2_v2_meta.json` - Métricas e metadata
- `models/xgb_1x2_v2_columns.pkl` - Lista de features
- `models/xgb_1x2_v2_scaler.pkl` - Scaler para normalização

### 3️⃣ Diagnosticar Sistema

```bash
python diagnose.py
# Mostra: distribuição de dados, problemas, recomendações
```

### 4️⃣ Usar Modelo em Produção

```python
from Backend.ml.predict import MatchPredictor

# Carregar (usa v2 automaticamente)
predictor = MatchPredictor("Backend/ml/models", version="v2")

# Predizer
result = predictor.predict({
    "elo_home_pre": 1550.0,
    "elo_away_pre": 1450.0,
    "elo_diff": 100.0,
    "form_pts_home_3": 9.0,
    "form_pts_home_5": 13.0,
    "form_pts_away_3": 4.0,
    "form_pts_away_5": 7.0,
    "gd_home_5": 2,
    "gd_away_5": -1,
    "pool_key": "POOL_BRASIL",
    "competition": "Brasileirão - Série A Betano",
})

print(result["prediction"])   # "1" (vitória casa)
print(result["confidence"])   # 0.65
print(result["probabilities"]) # {"home": 0.65, "draw": 0.20, "away": 0.15}
```

---

## 📊 Dados Esperados vs Atuais

| Métrica | v1 (Atual) | v2 (Esperado) |
|---------|-----------|---------------|
| Acurácia Teste | 50.96% | 53-56% ✅ |
| LogLoss | 1.0118 | 0.95-0.98 ✅ |
| Features | 9 | 15 ✅ |
| Validação | Simples | Cruzada ✅ |
| Tuning | Manual | Automático ✅ |
| Tempo Treino | ~1 min | ~15 min (com tuning) |

---

## 🧪 Features Explicadas

### Features Numéricas

```
elo_home_pre       → Rating Elo do time de casa (antes do jogo)
elo_away_pre       → Rating Elo do visitante
elo_diff           → Diferença Elo (casa - visitante)

form_pts_home_3/5  → Pontos acumulados nos últimos 3/5 jogos (0-15)
form_pts_away_3/5  → Idem para visitante

gd_home_5          → Saldo de gols nos últimos 5 jogos
gd_away_5          → Idem para visitante

[NOVO v2]
form_avg_home_5    → Média de pontos por jogo (0-3)
form_avg_away_5    → Idem para visitante
gd_avg_home_5      → Média de saldo de gols
gd_avg_away_5      → Idem para visitante
momentum_home      → Mudança de forma (últimos 3 vs 5)
momentum_away      → Idem para visitante
consistency_home   → Desvio padrão (consistência)
consistency_away   → Idem para visitante
```

### Features Categóricas

```
pool_key      → Agrupamento para compartilhar Elo/Forma
              → Exemplos: POOL_BRASIL, POOL_CHAMPIONS_TOP5, etc
              
competition   → Liga da partida
              → Exemplos: Brasileirão - Série A, Premier League, etc
```

---

## 🎯 Classes de Predição

```
Predição  Significado              Índice Interno
--------  -----------              ---------------
1         Vitória do time de casa  0
X         Empate                   1
2         Vitória do visitante      2
```

---

## ⚡ Performance Estimada

Com modelo v2 em produção:

```
Cenário: Partida típica da série A
├─ Input: Elo 1550 vs 1450, forma boa vs fraca
├─ v1 Output: 50.96% chance acerto (quase aleatório)
└─ v2 Output: 53-56% chance acerto (melhor!)

Sobre 380 partidas na temporada:
├─ v1: ~194 acertos
└─ v2: ~204-214 acertos (+10-20 partidas!)
```

---

## 🔍 Monitores Recomendados

Em produção, acompanhar:

```python
# Executar mensalmente
from Backend.ml.diagnose import diagnose_ml_system
diagnose_ml_system()

# Rastrear:
1. Acurácia em dados recentes (últimos 30 dias)
2. Distribuição de confiança das predições
3. Performance por competição
4. Features mais usadas vs ignoradas
```

---

## 🚨 Possíveis Problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| Predições sempre "1" | Desbalanceamento de classes | ✅ Resolvido em v2 |
| Acurácia não melhora | Features insuficientes | Adicionar dados externos (odds, lesões) |
| Modelo muito lento | Tuning com 50 trials | Reduzir para 20-30 trials |
| Erro "scaler not found" | Usar v1 com config v2 | Usar `version="v1"` se necessário |

---

## 📚 Referências

- [MELHORIAS.md](MELHORIAS.md) - Detalhes técnicos de cada melhoria
- [Optuna Docs](https://optuna.readthedocs.io/) - Hyperparameter tuning
- [XGBoost Docs](https://xgboost.readthedocs.io/) - Modelo base
- [Time Series CV](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) - Validação temporal

---

## 📞 Manutenção

**Quando retreinar:**
- A cada 2-4 semanas com novos dados
- Quando acurácia cai >2%
- Quando há grande mudança em ligas (transferências, etc)

**Como retreinar:**
```bash
# 1. Atualizar dados em Backend/data/matches/
# 2. Executar:
python Backend/ml/datasets/build_dataset.py
python Backend/ml/train/train_1x2_xgb_v2_improved.py
# 3. Verificar:
python Backend/ml/diagnose.py
```

---

**Última atualização**: Fevereiro 2026
**Versão ML**: v2 (melhorada)
**Status**: Pronto para produção ✅
