#!/usr/bin/env python3
# Backend/ml/example_prediction.py
# Exemplo interativo de predição com modelo v2

import os
import sys
import json
from predict import MatchPredictor


def print_header(text):
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}\n")


def get_example_matches():
    """Retorna exemplos de partidas com diferentes cenários"""
    return {
        "favoritismo_claro": {
            "nome": "Flamengo (forte) vs time fraco",
            "elo_home_pre": 1650.0,      # Flamengo forte
            "elo_away_pre": 1300.0,      # Visitante fraco
            "elo_diff": 350.0,
            "form_pts_home_3": 9.0,      # Ganhou 3/3
            "form_pts_home_5": 13.0,     # Ganhou 4/5
            "form_pts_away_3": 1.0,      # Perdeu 2/3
            "form_pts_away_5": 3.0,      # Mal
            "gd_home_5": 7,              # Saldo positivo
            "gd_away_5": -5,             # Saldo negativo
            "pool_key": "POOL_BRASIL",
            "competition": "Brasileirão - Série A Betano",
        },
        "incerteza_alta": {
            "nome": "Dois times equilibrados",
            "elo_home_pre": 1500.0,      # Igual
            "elo_away_pre": 1510.0,
            "elo_diff": -10.0,
            "form_pts_home_3": 7.0,      # 2 wins, 1 draw
            "form_pts_home_5": 11.0,     # Consistente
            "form_pts_away_3": 6.0,      # 1 win, 3 draws
            "form_pts_away_5": 10.0,     # Também consistente
            "gd_home_5": 1,              # Saldo próximo
            "gd_away_5": 0,
            "pool_key": "POOL_BRASIL",
            "competition": "Brasileirão - Série A Betano",
        },
        "visitante_em_forma": {
            "nome": "Casa favorita mas visitante em forma",
            "elo_home_pre": 1550.0,      # Casa ligeiramente melhor
            "elo_away_pre": 1500.0,
            "elo_diff": 50.0,
            "form_pts_home_3": 4.0,      # Casa em mau momento
            "form_pts_home_5": 6.0,      # Fraco
            "form_pts_away_3": 9.0,      # Visitante em excelente forma
            "form_pts_away_5": 14.0,     # Muito bom
            "gd_home_5": -2,             # Saldo negativo
            "gd_away_5": 4,              # Saldo muito positivo
            "pool_key": "POOL_BRASIL",
            "competition": "Brasileirão - Série A Betano",
        },
        "time_inconsistente": {
            "nome": "Casa com Elo bom mas muito inconsistente",
            "elo_home_pre": 1580.0,      # Elo alto
            "elo_away_pre": 1450.0,
            "elo_diff": 130.0,
            "form_pts_home_3": 0.0,      # Perdeu 3/3! (inconsistência)
            "form_pts_home_5": 6.0,      # Mas histórico é ok
            "form_pts_away_3": 6.0,      # Visitante estável
            "form_pts_away_5": 9.0,
            "gd_home_5": -3,             # Saldo ruim recentemente
            "gd_away_5": 0,
            "pool_key": "POOL_BRASIL",
            "competition": "Brasileirão - Série A Betano",
        },
        "empate_provavel": {
            "nome": "Dois times bem pareados, ambos jogando bem",
            "elo_home_pre": 1520.0,      # Praticamente iguais
            "elo_away_pre": 1530.0,
            "elo_diff": -10.0,
            "form_pts_home_3": 7.0,      # Ambos em forma
            "form_pts_home_5": 12.0,
            "form_pts_away_3": 8.0,
            "form_pts_away_5": 11.0,
            "gd_home_5": 2,              # Saldos parecidos
            "gd_away_5": 1,
            "pool_key": "POOL_BRASIL",
            "competition": "Brasileirão - Série A Betano",
        },
    }


def format_prediction(result, nome_cenario):
    """Formata resultado da predição de forma legível"""
    
    pred_map = {"1": "🏠 Vitória Casa", "X": "🤝 Empate", "2": "✈️ Visitante"}
    
    print(f"\n📊 Cenário: {nome_cenario}")
    print("-" * 70)
    
    print(f"\nPredição: {pred_map[result['prediction']]}")
    print(f"Confiança: {result['confidence']:.1%}")
    
    print(f"\nProbabilidades:")
    print(f"  🏠 Casa:     {result['probabilities']['home']:.1%} {'█' * int(result['probabilities']['home']*30)}")
    print(f"  🤝 Empate:   {result['probabilities']['draw']:.1%} {'█' * int(result['probabilities']['draw']*30)}")
    print(f"  ✈️ Visitante: {result['probabilities']['away']:.1%} {'█' * int(result['probabilities']['away']*30)}")
    
    print(f"\nInterpretação:")
    probs = result['probabilities']
    max_prob = max(probs.values())
    
    if max_prob < 0.40:
        print("  ⚠️  Baixa confiança - Jogo muito incerto!")
    elif max_prob < 0.50:
        print("  ⚠️  Confiança moderada - Resultado poderia ir para qualquer lado")
    elif max_prob < 0.60:
        print("  ✅ Boa confiança - Resultado provável mas não garantido")
    else:
        print("  ✅✅ Muito boa confiança - Resultado bastante provável!")


def main():
    # =====================================================
    # Setup
    # =====================================================
    print_header("🎯 EXEMPLO DE PREDIÇÃO - MODELO ML v2")
    
    # Verificar que modelo existe
    THIS_DIR = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(THIS_DIR, "models")
    
    if not os.path.exists(os.path.join(MODELS_DIR, "xgb_1x2_v2_meta.json")):
        print("❌ ERRO: Modelo v2 não encontrado!")
        print("\nPrimeiro execute:")
        print("  python train/train_1x2_xgb_v2_improved.py")
        sys.exit(1)
    
    # Carregar predictor
    try:
        predictor = MatchPredictor(MODELS_DIR, version="v2")
        print("✅ Modelo v2 carregado com sucesso!\n")
    except Exception as e:
        print(f"❌ Erro ao carregar modelo: {e}")
        sys.exit(1)
    
    # =====================================================
    # Informações do Modelo
    # =====================================================
    print_header("📊 INFORMAÇÕES DO MODELO")
    
    info = predictor.get_model_info()
    print(f"Versão: {info['version']}")
    print(f"Acurácia Teste: {info['metrics']['test']['accuracy']:.2%}")
    print(f"LogLoss Teste: {info['metrics']['test']['logloss']:.4f}")
    print(f"CV Média: {info['metrics']['cv_mean']:.2%}")
    print(f"\nPeríodo de Treinamento:")
    print(f"  Início: {info['date_range']['min']}")
    print(f"  Fim: {info['date_range']['max']}")
    print(f"\nTotal de Partidas: {info['training_info']['total_matches']}")
    
    # =====================================================
    # Exemplos de Predição
    # =====================================================
    print_header("🔮 EXEMPLOS DE PREDIÇÃO")
    
    examples = get_example_matches()
    
    for key, match_data in examples.items():
        nome = match_data.pop("nome")
        
        try:
            result = predictor.predict(match_data)
            format_prediction(result, nome)
        except Exception as e:
            print(f"❌ Erro ao predizer {nome}: {e}")
    
    # =====================================================
    # Batch Prediction
    # =====================================================
    print_header("⚡ PREDIÇÃO EM BATCH (5 partidas)")
    
    matches_for_batch = list(get_example_matches().values())[:5]
    
    try:
        batch_results = predictor.predict_batch(matches_for_batch)
        
        for i, result in enumerate(batch_results, 1):
            pred_map = {"1": "Casa", "X": "Empate", "2": "Visitante"}
            print(f"{i}. Predição: {pred_map[result['prediction']]} "
                  f"(Confiança: {result['confidence']:.1%})")
        
        print(f"\n✅ {len(batch_results)} partidas processadas com sucesso!")
    except Exception as e:
        print(f"❌ Erro em batch: {e}")
    
    # =====================================================
    # Instruções de Uso
    # =====================================================
    print_header("💡 COMO USAR EM SEU CÓDIGO")
    
    print("""
# Importar
from Backend.ml.predict import MatchPredictor

# Carregar modelo
predictor = MatchPredictor("Backend/ml/models", version="v2")

# Fazer predição
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

# Usar resultado
print(result["prediction"])        # "1", "X" ou "2"
print(result["confidence"])        # 0.0-1.0
print(result["probabilities"])     # {"home": ..., "draw": ..., "away": ...}
""")
    
    # =====================================================
    # Conclusão
    # =====================================================
    print_header("✅ PRONTO PARA USAR!")
    
    print("""
Seu modelo ML v2 está funcionando perfeitamente!

Próximos passos:
1. Integre em seus endpoints Express.js
2. Use para fazer predições em produção
3. Retreine a cada 2-4 semanas com novos dados
4. Execute 'python diagnose.py' mensalmente para monitorar

Documentação:
- README_ML.md → Guia completo
- MELHORIAS.md → Detalhes técnicos
- IMPLEMENTACAO.md → Passo a passo
""")


if __name__ == "__main__":
    main()
