# Backend/scraper/updates/atualizar_jogos.py
# ------------------------------------------------------------
# ✅ Atualiza APENAS a temporada mais recente (por liga)
# ✅ Reusa o "core FULL" (parsers + merge robusto)
# ✅ NÃO apaga jogos futuros
# ✅ Adiciona novos jogos (fixtures) + atualiza jogos existentes (sem apagar dados)
# ✅ Usa TEAM_MAP do atualizar_jogos_full.py (obrigatório)
# ------------------------------------------------------------

import os
import sys

# Garante que o diretório atual (updates/) está no sys.path (para importar o full)
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if THIS_DIR not in sys.path:
    sys.path.insert(0, THIS_DIR)

# Reusa tudo do full (sem duplicar regras / bugfixes)
from atualizar_jogos_full import (  # noqa: E402
    CAMINHO_RAIZ,
    TARGET_COLS,
    parse_football_data_uk,
    parse_brazil_all_seasons,
    compute_matchday_from_counts,
    update_csv_merge,
    ensure_cols,
    _norm_date,
)

# ============================================================
# CONFIG: temporada mais recente por liga (você controla aqui)
# ============================================================
# Para FD-UK:
# - season_code é o diretório mmz4281 (ex: 2526)
# - season_key do merge deve ser o mesmo season_code (ex: "2526")
#
# Para BR (new/BRA.csv):
# - season_key é o ano (ex: "2026")
#
LEAGUES = [
    {
        "nome": "Premier League",
        "pasta": "premier-league",
        "arquivo": "2025_26_premierleague.csv",
        "tipo_fonte": "football-data-uk",
        "season_code": "2526",
        "code": "E0",
    },
    {
        "nome": "La Liga",
        "pasta": "laliga",
        "arquivo": "laliga_2025_26.csv",
        "tipo_fonte": "football-data-uk",
        "season_code": "2526",
        "code": "SP1",
    },
    {
        "nome": "Serie A TIM",
        "pasta": "serie-a-tim",
        "arquivo": "seriea_2025_26.csv",
        "tipo_fonte": "football-data-uk",
        "season_code": "2526",
        "code": "I1",
    },
    {
        "nome": "Bundesliga",
        "pasta": "bundesliga",
        "arquivo": "2025_26_bundesliga.csv",
        "tipo_fonte": "football-data-uk",
        "season_code": "2526",
        "code": "D1",
    },
    {
        "nome": "Ligue 1",
        "pasta": "ligue1",
        "arquivo": "ligue1_2025_26.csv",
        "tipo_fonte": "football-data-uk",
        "season_code": "2526",
        "code": "F1",
    },
    {
        "nome": "Brasileirão Série A",
        "pasta": "brasileirao-serie-a",
        "arquivo": "brasileirao_2026.csv",
        "tipo_fonte": "football-data-new",
        "url": "https://www.football-data.co.uk/new/BRA.csv",
        "filtro_ano": 2026,
        "league_filter": "Serie A",
    },
]


def build_fd_uk_url(season_code: str, league_code: str) -> str:
    return f"https://www.football-data.co.uk/mmz4281/{season_code}/{league_code}.csv"


def update_one_league(config: dict):
    folder_path = os.path.join(CAMINHO_RAIZ, config["pasta"])
    os.makedirs(folder_path, exist_ok=True)

    file_path = os.path.join(folder_path, config["arquivo"])
    print(f"\n--- {config['nome']} ---")

    if config["tipo_fonte"] == "football-data-uk":
        season_code = str(config["season_code"]).strip()
        league_code = str(config["code"]).strip()
        url = build_fd_uk_url(season_code, league_code)

        df_new = parse_football_data_uk(url)
        if df_new is None or df_new.empty:
            print("   [Info] Nenhum dado novo.")
            return

        # Garante colunas completas (FULL)
        df_new = ensure_cols(df_new, TARGET_COLS)

        # season_key do merge = season_code (ex: "2526")
        update_csv_merge(
            file_path=file_path,
            df_new=df_new,
            season_key=season_code,
            force_recompute_matchday=False,
            overwrite_if_inconsistent=True,
        )
        return

    # Brazil (new/BRA.csv)
    url = config["url"]
    ano = int(config["filtro_ano"])
    league_filter = config.get("league_filter", "Serie A")

    df_all = parse_brazil_all_seasons(url, league_filter=league_filter)
    if df_all is None or df_all.empty:
        print("   [Info] Nenhum dado novo.")
        return

    # Filtra só o ano mais recente configurado
    df_year = df_all[df_all["__Season"] == str(ano)].copy()
    df_year = df_year.drop(columns=["__Season"], errors="ignore")

    if df_year.empty:
        print(f"   [Info] Nenhum dado para {ano}.")
        return

    # BRA.csv não fornece MW -> recomputa Matchday (como no full)
    df_year["Date"] = df_year["Date"].apply(_norm_date)
    df_year = compute_matchday_from_counts(df_year)

    # Mantém Matchday como Int64 (nullable)
    df_year["Matchday"] = (
        df_year["Matchday"]
        .apply(lambda x: x if x is None else x)
    )

    df_year = ensure_cols(df_year, TARGET_COLS)

    update_csv_merge(
        file_path=file_path,
        df_new=df_year,
        season_key=str(ano),
        force_recompute_matchday=True,          # recomendado para BR
        overwrite_if_inconsistent=True,
    )


if __name__ == "__main__":
    for league in LEAGUES:
        update_one_league(league)
