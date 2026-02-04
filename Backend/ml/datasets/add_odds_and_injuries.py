# Backend/ml/datasets/add_odds_and_injuries.py
# Adiciona odds implícitas e dados de lesões para melhorar predições

import os
import pandas as pd
import numpy as np
from typing import Dict, Tuple

"""
ODDS IMPLÍCITAS: Convertem odds de apostas em probabilidades reais
- Odds 1.50 para Casa → 66.7% chance
- Odds 3.00 para Empate → 33.3% chance
- Odds 2.50 para Visitante → 40% chance

Essas são as probabilidades que o mercado de apostas "diz" que são as chances reais.
Feature muito poderosa porque já incorpora análise de especialistas!
"""


def odds_to_probability(odds: float) -> float:
    """
    Converte odd em probabilidade decimal
    
    Ex: odd 2.0 → 50% de probabilidade
        odd 1.5 → 66.7% de probabilidade
    """
    if odds <= 0:
        return 0.0
    return 1.0 / odds


def calculate_implied_probabilities(odd_home: float, odd_draw: float, odd_away: float) -> Dict[str, float]:
    """
    Calcula probabilidades implícitas a partir de odds
    
    Args:
        odd_home: Odd para vitória da casa
        odd_draw: Odd para empate
        odd_away: Odd para vitória do visitante
    
    Returns:
        {"prob_home": 0.xx, "prob_draw": 0.xx, "prob_away": 0.xx, "margin": 0.xx}
    """
    # Probabilidades brutas
    prob_home = 1.0 / odd_home if odd_home > 0 else 0
    prob_draw = 1.0 / odd_draw if odd_draw > 0 else 0
    prob_away = 1.0 / odd_away if odd_away > 0 else 0
    
    total = prob_home + prob_draw + prob_away
    margin = total - 1.0  # Margin da casa = quanto acima de 100%
    
    if total > 0:
        # Normaliza para somar 1.0
        prob_home = prob_home / total
        prob_draw = prob_draw / total
        prob_away = prob_away / total
    
    return {
        "prob_home": prob_home,
        "prob_draw": prob_draw,
        "prob_away": prob_away,
        "margin": margin,
    }


def generate_mock_odds(df: pd.DataFrame) -> pd.DataFrame:
    """
    Gera odds simuladas baseadas em Elo (para demonstração)
    
    Em produção, você conectaria à API de uma casa de apostas real:
    - Betano API
    - Pinnacle API
    - Odds Portal API
    """
    df = df.copy()
    
    odds_home_list = []
    odds_draw_list = []
    odds_away_list = []
    prob_home_list = []
    prob_draw_list = []
    prob_away_list = []
    margin_list = []
    
    for _, row in df.iterrows():
        elo_diff = row.get('elo_diff', 0)
        
        # Modelo simplificado: converter Elo em probabilidades
        # P(Home) aumenta com elo_diff positivo
        p_home = 0.5 + (elo_diff / 1000.0) * 0.2  # ~0.5 quando igual, até ~0.7 com 1000 diff
        p_home = max(0.25, min(0.75, p_home))  # Limita entre 25-75%
        
        # Distribuir resto entre empate e visitante
        p_remaining = 1.0 - p_home
        p_draw = 0.27  # Empates são ~27% das partidas
        p_away = p_remaining - p_draw
        
        # Converter probabilities em odds (com margem de 5% da casa)
        margin = 1.05
        odd_home = (margin / p_home) if p_home > 0 else 999
        odd_draw = (margin / p_draw) if p_draw > 0 else 999
        odd_away = (margin / p_away) if p_away > 0 else 999
        
        # Limitar odds realistas (1.01 a 100)
        odd_home = max(1.01, min(100, odd_home))
        odd_draw = max(1.01, min(100, odd_draw))
        odd_away = max(1.01, min(100, odd_away))
        
        odds_home_list.append(float(odd_home))
        odds_draw_list.append(float(odd_draw))
        odds_away_list.append(float(odd_away))
        
        # Calcular probabilidades implícitas (normalizadas)
        probs = calculate_implied_probabilities(odd_home, odd_draw, odd_away)
        prob_home_list.append(probs["prob_home"])
        prob_draw_list.append(probs["prob_draw"])
        prob_away_list.append(probs["prob_away"])
        margin_list.append(probs["margin"])
    
    # Adicionar ao dataframe
    df['odd_home'] = odds_home_list
    df['odd_draw'] = odds_draw_list
    df['odd_away'] = odds_away_list
    df['prob_home_implied'] = prob_home_list
    df['prob_draw_implied'] = prob_draw_list
    df['prob_away_implied'] = prob_away_list
    df['market_margin'] = margin_list
    
    return df


def generate_mock_injuries(df: pd.DataFrame) -> pd.DataFrame:
    """
    Gera dados simulados de lesões (para demonstração)
    
    Em produção, você conectaria a uma API de lesões:
    - ESPN API
    - Flashscore API
    - API própria scrapeada
    """
    df = df.copy()
    
    # Simulação: 10% de chance de haver lesão importante
    # Reduz probabilidade de vitória em ~5%
    np.random.seed(42)  # Para reprodutibilidade
    
    df['injuries_home'] = (np.random.random(len(df)) < 0.1).astype(int)
    df['injuries_away'] = (np.random.random(len(df)) < 0.1).astype(int)
    df['injury_impact_home'] = df['injuries_home'] * (-0.05)  # -5% se lesionado
    df['injury_impact_away'] = df['injuries_away'] * (-0.05)
    
    return df


def add_odds_and_injuries_to_dataset(matches_enriched_csv: str, output_csv: str = None) -> pd.DataFrame:
    """
    Carrega dataset enriquecido e adiciona odds + lesões
    """
    if output_csv is None:
        output_csv = matches_enriched_csv.replace('.csv', '_with_odds_injuries.csv')
    
    print(f"\n[INFO] Carregando dataset: {matches_enriched_csv}")
    df = pd.read_csv(matches_enriched_csv)
    
    print(f"[INFO] Adicionando odds implícitas...")
    df = generate_mock_odds(df)
    
    print(f"[INFO] Adicionando dados de lesões (simulados)...")
    df = generate_mock_injuries(df)
    
    # Verificação
    print(f"\n[INFO] Dataset atualizado!")
    print(f"  Total de partidas: {len(df)}")
    print(f"  Novas features:")
    print(f"    - odd_home, odd_draw, odd_away")
    print(f"    - prob_home_implied, prob_draw_implied, prob_away_implied")
    print(f"    - market_margin")
    print(f"    - injuries_home, injuries_away")
    print(f"    - injury_impact_home, injury_impact_away")
    
    # Mostrar exemplo
    print(f"\n[INFO] Exemplo de dados:")
    sample_cols = ['date', 'home', 'away', 'elo_diff', 'odd_home', 'odd_draw', 'odd_away', 
                   'prob_home_implied', 'injuries_home', 'injury_impact_home']
    print(df[sample_cols].head(10))
    
    # Salvar
    os.makedirs(os.path.dirname(output_csv) if os.path.dirname(output_csv) else '.', exist_ok=True)
    df.to_csv(output_csv, index=False, encoding='utf-8')
    print(f"\n[OK] Dataset com odds salvo em: {output_csv}")
    
    return df


if __name__ == "__main__":
    # __file__ = Backend/ml/datasets/add_odds_and_injuries.py
    # dirname(__file__) = Backend/ml/datasets
    # dirname(dirname(__file__)) = Backend/ml
    ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MATCHES_ENRICHED = os.path.join(ML_DIR, "processed", "matches_enriched.csv")
    OUTPUT_CSV = os.path.join(ML_DIR, "processed", "matches_enriched_with_odds_injuries.csv")
    
    df = add_odds_and_injuries_to_dataset(MATCHES_ENRICHED, OUTPUT_CSV)
