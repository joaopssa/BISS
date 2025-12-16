import requests
import pandas as pd
import os
from datetime import datetime

# ================= CONFIG =================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAMINHO_RAIZ = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "data", "matches","champions")
)


ARQUIVO = os.path.join(CAMINHO_RAIZ, "champions_2025_26.csv")


COLS = [
    "Matchday",
    "Day",
    "Date",
    "Home",
    "Away",
    "FullTime",
    "HalfTime",
    "Penalties",
]

BASE_URL = "https://match.uefa.com/v5/matches"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}

# ================= TEAM MAP =================

TEAM_MAP_CHAMPIONS = {
    "Paris":"Paris Saint Germain",
    "Marseille":"Olympique de Marseille",

    "Bayern München":"Bayern de Munique",
    "B. Dortmund": "Borussia Dortmund",
    "Leverkusen":"Bayer Leverkusen",
    "Frankfurt":"Eintracht Frankfurt",

    "Inter":"Inter de Milão",
    "Juventus": "Juventus FC",
    "Atalanta": "Atalanta",
    "Napoli": "Napoli",

    "Real Madrid": "Real Madrid",
    "Barcelona": "Barcelona",
    "Atleti": "Atlético de Madrid",
    "Athletic Club": "Athletic Bilbao",
    "Villarreal": "Villarreal CF",

    "Man City": "Manchester City",
    "Liverpool": "Liverpool",
    "Arsenal": "Arsenal",
    "Chelsea": "Chelsea",
    "Tottenham": "Tottenham",
    "Newcastle": "Newcastle United",

    "Benfica": "SL Benfica",
    "Sporting CP": "Sporting CP",

    "PSV": "PSV Eindhoven",
    "Ajax": "AFC Ajax",

    "Club Brugge": "Club Brugge KV",
    "Union SG": "Union Saint-Gilloise",

    "Copenhagen": "FC Copenhagen",
    "Olympiacos": "Olympiacos",
    "Galatasaray": "Galatasaray",
    "Slavia Praha": "Slavia Praga",
    "Bodø/Glimt":"FK Bodo/Glimt",
    "Pafos": "Pafos FC",
    "Qarabağ":"Qarabağ FK",
    "Kairat Almaty":"FC Kairat",
}

# ================= AUX =================

def normalize_team(name: str) -> str:
    return TEAM_MAP_CHAMPIONS.get(name.strip(), name.strip())

def day_of_week(date_iso: str) -> str:
    return datetime.strptime(date_iso, "%Y-%m-%d").strftime("%a")

# ================= FETCH =================

def fetch_matches():
    matches = []
    offset = 0
    limit = 50

    while True:
        params = {
            "competitionId": 1,          # UCL
            "seasonYear": 2026,          # temporada 2025/26
            "phase": "ALL",
            "limit": limit,
            "offset": offset,
            "order": "ASC",
        }

        r = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()

        if not isinstance(data, list) or not data:
            break

        matches.extend(data)
        offset += limit

    return matches

# ================= SCRAPER =================

def scrape_champions():
    os.makedirs(CAMINHO_RAIZ, exist_ok=True)
    rows = []

    matches = fetch_matches()
    print(f"Total de jogos encontrados: {len(matches)}")

    for m in matches:
        try:
            # FILTRO 1 — somente fase de liga
            group = m.get("group", {})
            meta = group.get("metaData", {})
            if meta.get("groupName") != "League":
                continue

            # FILTRO 2 — ignora jogos sem times definidos
            if m["homeTeam"].get("isPlaceHolder") or m["awayTeam"].get("isPlaceHolder"):
                continue
            kickoff = m["kickOffTime"]["dateTime"]
            date_iso = kickoff[:10]

            home_raw = m["homeTeam"]["internationalName"]
            away_raw = m["awayTeam"]["internationalName"]

            home = normalize_team(home_raw)
            away = normalize_team(away_raw)

            score = m.get("score", {})
            reg = score.get("regular")

            full_time = (
                f"{reg['home']}-{reg['away']}"
                if reg and reg.get("home") is not None
                else None
            )

            half_time = None  # UEFA não fornece HT de forma confiável

            pen = score.get("penalties")
            penalties = (
                f"{pen['home']}-{pen['away']}"
                if pen else None
            )

            rows.append({
                "Matchday": int(m["sessionNumber"]),
                "Day": day_of_week(date_iso),
                "Date": date_iso,
                "Home": home,
                "Away": away,
                "FullTime": full_time,
                "HalfTime": half_time,
                "Penalties": penalties,
            })

        except Exception:
            continue

    return pd.DataFrame(rows, columns=COLS)

# ================= UPDATE CSV =================

def update_csv():
    df_new = scrape_champions()

    if os.path.exists(ARQUIVO):
        df_local = pd.read_csv(ARQUIVO)
    else:
        df_local = pd.DataFrame(columns=COLS)

    # cria chave real do jogo (identidade estável)
    df_new["__key__"] = df_new["Date"] + "_" + df_new["Home"] + "_" + df_new["Away"]
    df_local["__key__"] = df_local["Date"] + "_" + df_local["Home"] + "_" + df_local["Away"]

    # indexa pela chave
    df_new.set_index("__key__", inplace=True)
    df_local.set_index("__key__", inplace=True)

    # UPSERT — atualiza jogos existentes
    df_local.update(df_new)

    # INSERE jogos novos
    df_final = pd.concat([
        df_local,
        df_new[~df_new.index.isin(df_local.index)]
    ])

    # volta para DataFrame limpo
    df_final.reset_index(drop=True, inplace=True)
    df_final["Matchday"] = df_final["Matchday"].astype(str)
    df_final["Matchday"] = df_final["Matchday"].str.replace(r"\.0$", "", regex=True)

    df_final.to_csv(ARQUIVO, index=False)
    print("CSV sincronizado com sucesso (sem duplicações).")

# ================= MAIN =================

if __name__ == "__main__":
    update_csv()
