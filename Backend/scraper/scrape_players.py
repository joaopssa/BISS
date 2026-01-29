# Backend/scraper/scrape_players.py

import os
import csv
import time
import random
import warnings
from typing import Dict, List, Optional
from datetime import datetime, date

import requests
from bs4 import BeautifulSoup

# ==========================
# CONFIGURAÇÕES GERAIS
# ==========================

BASE_URL = "https://www.transfermarkt.com.br"
VERIFY_SSL = False  # Seu ambiente corporativo exige isso desligado

if not VERIFY_SSL:
    from urllib3.exceptions import InsecureRequestWarning
    warnings.simplefilter("ignore", InsecureRequestWarning)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        " AppleWebKit/537.36 (KHTML, like Gecko)"
        " Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}

# ==========================
# LIGAS NACIONAIS SUPORTADAS
# ==========================

LEAGUES_CONFIG: Dict[str, Dict[str, str]] = {
    "Brasileirão - Série A Betano": {"code": "BRA1", "slug": "campeonato-brasileiro-serie-a"},
    "Brasileirão - Série B": {"code": "BRA2", "slug": "campeonato-brasileiro-serie-b"},
    "Premier League": {"code": "GB1", "slug": "premier-league"},
    "La Liga": {"code": "ES1", "slug": "laliga"},
    "Série A": {"code": "IT1", "slug": "serie-a"},
    "Bundesliga": {"code": "L1", "slug": "1-bundesliga"},
    "Ligue 1": {"code": "FR1", "slug": "ligue-1"},
}

# ==========================
# MAPEAMENTO Transfermarkt → seu clubs-map.json
# ==========================

TM_TO_JSON: Dict[str, str] = {
    # --- BRASILEIRÃO SÉRIE A E B ---
    "CR Flamengo": "Flamengo",
    "Cruzeiro EC": "Cruzeiro",
    "Botafogo FR": "Botafogo-RJ",
    "CR Vasco da Gama": "Vasco da Gama",
    "SC Corinthians": "Corinthians",
    "EC Bahia": "Bahia",
    "Fluminense FC": "Fluminense",
    "RB Bragantino": "Bragantino",
    "Atlético Mineiro": "Atlético-MG",
    "Santos FC": "Santos",
    "Grêmio FBPA": "Grêmio",
    "São Paulo FC": "São Paulo",
    "SC Internacional": "Internacional",
    "Fortaleza EC": "Fortaleza",
    "Sport Recife": "Sport Recife",
    "Ceará SC": "Ceará",
    "EC Vitória": "Vitória",
    "Mirassol FC": "Mirassol",
    "EC Juventude": "Juventude-RS",
    "SE Palmeiras": "Palmeiras",
    "Athletico Paranaense": "Athletico-PR",
    "Coritiba FC": "Coritiba",
    "Clube do Remo": "Remo",
    "Atlético Goianiense": "Atlético-GO",
    "América Mineiro": "América-MG",
    "Cuiabá EC": "Cuiabá",
    "Grêmio Novorizontino": "Grêmio Novorizontino",
    "CRB": "CRB",
    "Criciúma EC": "Criciúma",
    "Goiás EC": "Goiás",
    "Avaí FC": "Avaí",
    "Chapecoense": "Chapecoense",
    "Operário FEC": "Operário-PR",
    "Athletic Club": "Athletic Club MG",
    "Vila Nova FC": "Vila Nova",
    "Paysandu SC": "Paysandu",
    "Amazonas FC": "Amazonas AM",
    "Botafogo FC": "Botafogo-SP",
    "Ferroviária": "Ferroviária",
    "Volta Redonda FC": "Volta Redonda",
    "AA Ponte Preta": "Ponte Preta",
    "Londrina EC": "Londrina",
    "São Bernardo FC": "São Bernardo",
    # --- PREMIER LEAGUE ---
    "Manchester City FC": "Manchester City",
    "Chelsea FC": "Chelsea",
    "FC Arsenal": "Arsenal",
    "FC Liverpool": "Liverpool",
    "Manchester United FC": "Manchester United",
    "Tottenham Hotspur": "Tottenham",
    "Aston Villa FC": "Aston Villa",
    "Newcastle United": "Newcastle United",
    "Brighton & Hove Albion": "Brighton & Hove Albion",
    "Crystal Palace FC": "Crystal Palace",
    "AFC Bournemouth": "AFC Bournemouth",
    "Nottingham Forest": "Nottingham Forest",
    "Wolverhampton Wanderers": "Wolverhampton",
    "Brentford FC": "Brentford",
    "West Ham United": "West Ham United",
    "FC Everton": "Everton",
    "FC Fulham": "Fulham FC",
    "Southampton FC": "Southampton",
    "Leicester City": "Leicester City",

    # --- LA LIGA ---
    "Real Madrid CF": "Real Madrid",
    "FC Barcelona": "Barcelona",
    "Atlético de Madrid": "Atlético de Madrid",
    "Athletic Bilbao": "Athletic Bilbao",
    "Real Sociedad": "Real Sociedad",
    "Real Betis Balompié": "Bétis",
    "FC Villarreal": "Villarreal CF",
    "Valencia CF": "Valencia",
    "Sevilla FC": "Sevilha FC",
    "Girona FC": "Girona FC",
    "Celta de Vigo": "Celta de Vigo",
    "UD Las Palmas": "Las Palmas",
    "RCD Espanyol": "Espanyol",
    "CA Osasuna": "Osasuna",
    "Deportivo Alavés": "Deportivo Alavés",
    "Getafe CF": "Getafe CF",
    "RCD Mallorca": "Mallorca",
    "Real Valladolid CF": "Real Valladolid CF",
    "Rayo Vallecano": "Rayo Vallecano",
    "CD Leganés": "Leganés",

    # --- SERIE A ---
    "Inter de Milão": "Inter de Milão",
    "Juventus FC": "Juventus FC",
    "AC Milan": "AC Milan",
    "Atalanta BC": "Atalanta",
    "Napoli": "Napoli",
    "AS Roma": "Roma",
    "ACF Fiorentina": "Fiorentina",
    "Bologna": "Bologna FC",
    "SS Lazio": "Lazio",
    "Torino FC": "Torino",
    "Como 1907": "Como 1907",
    "Udinese Calcio": "Udinese",
    "Genoa": "Genoa CFC",
    "Parma Calcio 1913": "Parma Calcio 1913",
    "US Lecce": "US Lecce",
    "Hellas Verona": "Hellas Verona",
    "FC Empoli": "FC Empoli",
    "AC Monza": "AC Monza",
    "Venezia FC": "Venezia FC",
    "Cagliari Calcio": "Cagliari",

    # --- BUNDESLIGA ---
    "FC Bayern Munique": "Bayern de Munique",
    "Bayer 04 Leverkusen": "Bayer Leverkusen",
    "RB Leipzig": "RB Leipzig",
    "Borussia Dortmund": "Borussia Dortmund",
    "SG Eintracht Frankfurt": "Eintracht Frankfurt",
    "VfB Stuttgart": "VfB Stuttgart",
    "VfL Wolfsburg": "Wolfsburg",
    "Borussia Mönchengladbach": "Borussia Monchengladbach",
    "TSG 1899 Hoffenheim": "Hoffenheim",
    "SC Freiburg": "Freiburg",
    "1.FSV Mainz 05": "Mainz 05",
    "FC Augsburg": "Augsburg",
    "1.FC Union Berlim": "1.FC Union Berlin",
    "SV Werder Bremen": "Werder Bremen",
    "1.FC Heidenheim 1846": "1. FC Heidenheim",
    "FC St. Pauli": "FC St. Pauli",
    "VfL Bochum": "VfL Bochum",
    "Holstein Kiel": "Holstein Kiel",

    # --- LIGUE 1 ---
    "Olympique Marseille": "Olympique de Marseille",
    "Paris Saint-Germain": "Paris Saint Germain",
    "Paris FC": "Paris FC",
    "RC Lens": "Lens",
    "RC Strasbourg Alsace": "Estrasburgo",
    "Stade Brestois 29": "Brestois",
    "Stade Rennais FC": "Rennes",
    "AJ Auxerre": "AJ Auxerre",
    "Angers SCO": "Angers",
    "AS Monaco": "Monaco",
    "FC Lorient": "FC Lorient",
    "FC Metz": "FC Metz",
    "FC Nantes": "Nantes",
    "Toulouse FC": "Toulouse FC",
    "Le Havre AC": "Le Havre AC",
    "LOSC Lille": "Lille",
    "OGC Nice": "Nice",
    "Olympique Lyon,Lyonnais": "Lyon",
}

# ==========================
# FUNÇÕES AUXILIARES
# ==========================

def safe_get(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20, verify=VERIFY_SSL)
        if resp.status_code != 200:
            print(f"⚠️ HTTP {resp.status_code} → {url}")
            return None
        return resp.text
    except Exception as e:
        print(f"⚠️ Erro ao acessar {url}: {e}")
        return None


def extract_season_id_from_href(href: str) -> Optional[str]:
    """
    Ex.: /manchester-city/startseite/verein/281/saison_id/2025
    """
    if not href:
        return None
    parts = href.strip("/").split("/")
    try:
        idx = parts.index("saison_id")
        return parts[idx + 1]
    except Exception:
        return None


def get_clubs_from_league(league_name: str, config: Dict[str, str]) -> List[Dict[str, str]]:
    """
    Sempre pega a lista de clubes da página 'atual' da liga (sem saison_id).
    Essa página já aponta os clubes com o saison_id vigente no href. (ex.: saison_id/2025)
    """
    code = config["code"]
    slug = config["slug"]

    # ✅ sem saison_id → “temporada atual” do Transfermarkt
    url = f"{BASE_URL}/{slug}/startseite/wettbewerb/{code}"
    html = safe_get(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"class": "items"})
    if not table:
        return []

    clubs = []
    rows = table.find_all("tr", {"class": ["odd", "even"]})

    for row in rows:
        td = row.find("td", {"class": "hauptlink"})
        if not td:
            continue

        a = td.find("a")
        if not a or not a.get("href"):
            continue

        href = a["href"]
        name = a.get_text(strip=True)
        if not name:
            continue

        parts = href.strip("/").split("/")
        # esperamos: <club_slug>/startseite/verein/<id>/saison_id/<season>
        try:
            club_slug = parts[0]
            club_id = parts[3]
        except Exception:
            continue

        season_id = extract_season_id_from_href(href)  # pode vir None se mudarem o padrão

        clubs.append({
            "id": club_id,
            "slug": club_slug,
            "name": name,
            "season_id": season_id or "",  # string vazia como fallback
        })

    print(f"✔ {league_name}: {len(clubs)} clubes encontrados (temporada atual)")
    return clubs


def get_players_from_club(club: Dict[str, str], league_name: str) -> List[Dict[str, str]]:
    """
    Usa a página /kader (Detailed squad), que é a mais “elenco”.
    Se season_id vier vazio, cai para /kader/verein/<id> sem saison_id.
    """
    club_id = club["id"]
    slug = club["slug"]
    club_name = club["name"]
    season_id = club.get("season_id", "").strip()

    if season_id:
        url = f"{BASE_URL}/{slug}/kader/verein/{club_id}/saison_id/{season_id}"
    else:
        url = f"{BASE_URL}/{slug}/kader/verein/{club_id}"

    html = safe_get(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"class": "items"})
    if not table:
        return []

    rows = table.find_all("tr", {"class": ["odd", "even"]})
    players: List[Dict[str, str]] = []

    for row in rows:
        td = row.find("td", {"class": "hauptlink"})
        if not td:
            continue

        a = td.find("a")
        if not a:
            continue

        name = a.get_text(strip=True)
        if not name:
            continue

        json_club = TM_TO_JSON.get(club_name, "")

        players.append({
            "player_name": name,
            "club_name": club_name,
            "json_club": json_club,
            "league_name": league_name,
        })

    print(f"   👥 {club_name}: {len(players)} jogadores")
    return players


# ==========================
# MAIN
# ==========================

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "data", "players")
    os.makedirs(output_dir, exist_ok=True)

    run_date = date.today().isoformat()
    output_csv = os.path.join(output_dir, f"players_by_club.csv")

    all_rows: List[Dict[str, str]] = []

    print("\n=== INICIANDO SCRAPER DE JOGADORES (ELENCO ATUAL) ===\n")
    print(f"📅 Data da coleta: {run_date}\n")

    for league, config in LEAGUES_CONFIG.items():
        print(f"\n🏆 {league}\n")
        clubs = get_clubs_from_league(league, config)

        for club in clubs:
            players = get_players_from_club(club, league)
            all_rows.extend(players)
            time.sleep(random.uniform(1.0, 2.0))

        time.sleep(random.uniform(1.5, 3.0))

    # Salvar CSV final
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["player_name", "club_name", "json_club", "league_name"]
        )
        writer.writeheader()
        writer.writerows(all_rows)

    print("\n============================================")
    print(f"🎉 CSV FINAL GERADO: {output_csv}")
    print(f"📦 Total de linhas: {len(all_rows)}")
    print("============================================\n")


if __name__ == "__main__":
    main()
