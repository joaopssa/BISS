# Backend/scraper/updates/atualizar_jogos_v3.py
# ------------------------------------------------------------
# ✅ Nomes intuitivos
# ✅ Removido 100% Asian Handicap
# ✅ Leitura robusta REMOTA (mmz4281) + LOCAL (seu histórico salvo)
# ✅ Não perde linhas (sem on_bad_lines=skip)
# ✅ Auto-corrige CSV local malformado (regrava normalizado)
# ✅ Brasil BRA.csv: detecção automática de separador e atualização por ano
# ✅ Não derruba Matchday se já existe
# ------------------------------------------------------------

import pandas as pd
import requests
import io
import os
import re
import csv
import unicodedata
from datetime import datetime

# ================= CONFIGURAÇÕES =================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAMINHO_RAIZ = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "matches"))

BASE_COLS = ["Matchday", "Day", "Date", "Home", "Away", "FullTime", "HalfTime", "Penalties"]

EXTRA_COLS = [
    "FullTimeHomeGoals", "FullTimeAwayGoals", "FullTimeResult",
    "HalfTimeHomeGoals", "HalfTimeAwayGoals", "HalfTimeResult",

    "HomeShots", "AwayShots",
    "HomeShotsOnTarget", "AwayShotsOnTarget",
    "HomeFouls", "AwayFouls",
    "HomeCorners", "AwayCorners",
    "HomeYellowCards", "AwayYellowCards",
    "HomeRedCards", "AwayRedCards",

    "PinnacleHomeOpen", "PinnacleDrawOpen", "PinnacleAwayOpen",
    "AvgHomeOpen", "AvgDrawOpen", "AvgAwayOpen",
    "MaxHomeOpen", "MaxDrawOpen", "MaxAwayOpen",
    "Bet365HomeOpen", "Bet365DrawOpen", "Bet365AwayOpen",

    "Bet365Over25Open", "Bet365Under25Open",
    "PinnacleOver25Open", "PinnacleUnder25Open",
    "AvgOver25Open", "AvgUnder25Open",

    "PinnacleHomeClose", "PinnacleDrawClose", "PinnacleAwayClose",
    "AvgHomeClose", "AvgDrawClose", "AvgAwayClose",

    "MaxHomeClose", "MaxDrawClose", "MaxAwayClose",
    "Bet365HomeClose", "Bet365DrawClose", "Bet365AwayClose",
]

TARGET_COLS = BASE_COLS + EXTRA_COLS

LEAGUES = [
    {"nome": "Premier League", "pasta": "premier-league", "tipo_fonte": "football-data-uk", "code": "E0"},
    {"nome": "La Liga", "pasta": "laliga", "tipo_fonte": "football-data-uk", "code": "SP1"},
    {"nome": "Serie A TIM", "pasta": "serie-a-tim", "tipo_fonte": "football-data-uk", "code": "I1"},
    {"nome": "Bundesliga", "pasta": "bundesliga", "tipo_fonte": "football-data-uk", "code": "D1"},
    {"nome": "Ligue 1", "pasta": "ligue1", "tipo_fonte": "football-data-uk", "code": "F1"},
    {
        "nome": "Brasileirão Série A",
        "pasta": "brasileirao-serie-a",
        "tipo_fonte": "football-data-new",
        "url": "https://www.football-data.co.uk/new/BRA.csv",
        "league_filter": "Serie A",
    },
]

TEAM_MAP = {
    # --- BRASILEIRÃO SÉRIE A E B ---
    "Flamengo RJ": "Flamengo",
    "Cruzeiro": "Cruzeiro",
    "Botafogo RJ": "Botafogo-RJ",
    "Vasco": "Vasco da Gama",
    "Corinthians": "Corinthians",
    "Bahia": "Bahia",
    "Fluminense FC": "Fluminense",
    "Bragantino": "Bragantino",
    "Atlético Mineiro": "Atlético-MG",
    "Atletico-MG": "Atlético-MG",
    "Santos": "Santos",
    "Grêmio FBPA": "Grêmio",
    "Gremio": "Grêmio",
    "Sao Paulo": "São Paulo",
    "Internacional": "Internacional",
    "Fortaleza EC": "Fortaleza",
    "Sport Recife": "Sport Recife",
    "Ceara": "Ceará",
    "Vitoria": "Vitória",
    "Mirassol FC": "Mirassol",
    "Juventude": "Juventude-RS",
    "Palmeiras": "Palmeiras",
    "Athletico-PR":"Athletico-PR",
    "Coritiba": "Coritiba",
    "Remo": "Remo",
    "Chapecoense-SC": "Chapecoense",
    "America MG": "América-MG",
    "Atletico GO": "Atlético-GO",
    "AC Goianiense": "Atlético-GO",
    "Avai":"Avaí",
    "Parana":"Paraná",
    "Paraná Clube":"Paraná",
    "CSA AL":"CSA",
    "Goias":"Goiás",
    "Juventude-RS":"Juventude-RS",
    "Cuiaba":"Cuiabá",
    "Criciuma":"Criciúma",
    "Criciúma EC":"Criciúma",

    # --- PREMIER LEAGUE ---
    "Man City": "Manchester City",
    "Chelsea": "Chelsea",
    "FC Arsenal": "Arsenal",
    "FC Liverpool": "Liverpool",
    "Man United": "Manchester United",
    "Tottenham": "Tottenham",
    "Aston Villa": "Aston Villa",
    "Newcastle": "Newcastle United",
    "Brighton": "Brighton & Hove Albion",
    "Crystal Palace": "Crystal Palace",
    "Bournemouth": "AFC Bournemouth",
    "Nott'm Forest": "Nottingham Forest",
    "Wolves": "Wolverhampton",
    "Brentford": "Brentford",
    "West Ham": "West Ham United",
    "Everton": "Everton",
    "Fulham": "Fulham FC",
    "Burnley": "Burnley",
    "Sunderland": "Sunderland",
    "Leeds":"Leeds United",
    "Charlton":"Charlton Athletic",
    "Southampton":"Southampton FC",
    "Derby":"Derby County",
    "Coventry":"Coventry City",
    "Middlesbrough":"Middlesbrough FC",
    "Ipswich":"Ipswich Town",
    "Ipswich Town FC":"Ipswich Town",
    "Bolton":"Bolton Wanderers",
    "Bradford":"Bradford City",
    "Blackburn":"Blackburn Rovers",
    "West Brom":"West Bromwich Albion",
    "Birmingham City":"Birmingham",
    "Portsmouth":"Portsmouth FC",
    "Norwich":"Norwich City",
    "Wigan Athletic":"Wigan",
    "Watford FC":"Watford",
    "Reading FC":"Reading",
    "Hull":"Hull City",
    "Stoke": "Stoke City",
    "Blackpool":"Blackpool FC",
    "QPR":"Queens Park Rangers",
    "Swansea":"Swansea City",
    "Huddersfield":"Huddersfield Town",
    "Cardiff":"Cardiff City",
    "Sheffield United FC":"Sheffield United",
    "Luton":"Luton Town",
    "Luton Town FC":"Luton Town",

    # --- LA LIGA ---
    "Real Madrid": "Real Madrid",
    "Barcelona": "Barcelona",
    "Ath Madrid": "Atlético de Madrid",
    "Ath Bilbao": "Athletic Bilbao",
    "Sociedad": "Real Sociedad",
    "Betis": "Bétis",
    "Real Betis": "Bétis",
    "Real Betis Balompié":"Bétis",
    "Villarreal": "Villarreal CF",
    "Valencia": "Valencia",
    "Sevilla": "Sevilha FC",
    "Girona": "Girona FC",
    "Celta": "Celta de Vigo",
    "UD Las Palmas": "Las Palmas",
    "Espanol": "Espanyol",
    "CA Osasuna": "Osasuna",
    "Alaves": "Deportivo Alavés",
    "Getafe": "Getafe CF",
    "Mallorca": "Mallorca",
    "Vallecano": "Rayo Vallecano",
    "CD Leganés": "Leganés",
    "Oviedo": "Real Oviedo",
    "Levante": "Levante",
    "Elche":"Elche",
    "Malaga":"Málaga CF",
    "La Coruna":"Deportivo La Coruña",
    "Granada CF":"Granada",
    "Zaragoza":"Real Zaragoza",
    "Almeria":"UD Almería",
    "Real Valladolid":"Valladolid",
    "Real Valladolid CF": "Valladolid",
    "SD Eibar":"Eibar",
    "Cordoba":"Cordoba CF",
    "Córdoba CF":"Cordoba CF",
    "Sp Gijon":"Sporting Gijón",
    "Leganes":"Leganés",
    "SD Huesca":"Huesca",
    "Cadiz":"Cádiz CF",
    "Deportivo Alaves":"Deportivo Alavés",

    # --- SERIE A ---
    "Inter": "Inter de Milão",
    "Juventus": "Juventus FC",
    "Milan": "AC Milan",
    "Atalanta": "Atalanta",
    "Napoli": "Napoli",
    "Roma": "Roma",
    "ACF Fiorentina": "Fiorentina",
    "Bologna": "Bologna FC",
    "Lazio": "Lazio",
    "Torino": "Torino",
    "Como": "Como 1907",
    "Udinese": "Udinese",
    "Genoa": "Genoa CFC",
    "Parma": "Parma Calcio 1913",
    "Parma FC": "Parma Calcio 1913",
    "Lecce": "US Lecce",
    "Verona": "Hellas Verona",
    "FC Empoli": "FC Empoli",
    "Empoli FC": "FC Empoli",
    "Empoli":"FC Empoli",
    "AC Monza": "AC Monza",
    "Venezia FC": "Venezia",
    "Cagliari Calcio": "Cagliari",
    "Cremonese":"US Cremonese",
    "Pisa":"AC Pisa 1909",
    "Sassuolo":"Sassuolo", 
    "Sampdoria":"Sampdoria",
    "AS Livorno":"US Livorno 1915",
    "Livorno":"US Livorno 1915",
    "Chievo Verona":"AC Chievo Verona",
    "Chievo":"AC Chievo Verona",
    "Calcio Catania":"Catania",
    "AC Cesena":"Cesena",
    "US Palermo":"US Palermo",
    "Palermo":"US Palermo",
    "Frosinone Calcio":"Frosinone",
    "Carpi": "Carpi FC",
    "Crotone":"FC Crotone",
    "Pescara":"Pescara Calcio",
    "Delfino Pescara":"Pescara Calcio",
    "Spal":"SPAL 2013 Ferrara",
    "Benevento":"Benevento Calcio",
    "Brescia Calcio":"Brescia",
    "UC Sampdoria":"Sampdoria",
    "US Salernitana 1919":"Salernitana",
    "Spezia Calcio":"Spezia",
    "Monza":"AC Monza",
    
    # --- BUNDESLIGA ---
    "Bayern Munich": "Bayern de Munique",
    "Leverkusen": "Bayer Leverkusen",
    "RB Leipzig": "RB Leipzig",
    "Dortmund": "Borussia Dortmund",
    "Ein Frankfurt": "Eintracht Frankfurt",
    "Stuttgart": "VfB Stuttgart",
    "Wolfsburg": "Wolfsburg",
    "M'gladbach": "Borussia Monchengladbach",
    "Bor. Mönchengladbach": "Borussia Monchengladbach",
    "Hoffenheim": "Hoffenheim",
    "Freiburg": "Freiburg",
    "Mainz": "Mainz 05",
    "Augsburg": "Augsburg",
    "Union Berlin": "1. FC Union Berlin",
    "Werder Bremen": "Werder Bremen",
    "Heidenheim": "1. FC Heidenheim",
    "St Pauli": "FC St. Pauli",
    "VfL Bochum": "VfL Bochum",
    "Holstein Kiel": "Holstein Kiel",
    "FC Koln":"1. FC Köln",
    "FC Köln":"1. FC Köln",
    "Hamburg":"Hamburgo",
    "Hannover 96":"Hannover 96",
    "Hannover":"Hannover 96",
    "FC Kaiserslautern":"1. FC Kaiserslautern",
    "Kaiserslautern":"1. FC Kaiserslautern",
    "Nurnberg": "1. FC Nurnberg",
    "FC Nürnberg":"1. FC Nurnberg",
    "FC Schalke 04":"FC Schalke 04",
    "Schalke 04":"FC Schalke 04",
    "Hertha":"Hertha Berlin",
    "Hertha BSC":"Hertha Berlin",
    "Fortuna Düsseldorf":"Fortuna Dusseldorf",
    "Greuther Furth":"SpVgg Greuther Furth",
    "SpVgg Greuther Fürth":"SpVgg Greuther Furth",
    "SpVgg Greuther Fürth 1903":"SpVgg Greuther Furth",
    "Braunschweig":"Eintracht Braunschweig",
    "SC Paderborn 07":"SC Paderborn 07",
    "Paderborn":"SC Paderborn 07",
    "SV Darmstadt 98":"SV Darmstadt 98",
    "Darmstadt":"SV Darmstadt 98",
    "Ingolstadt":"FC Ingolstadt 04",
    "Arminia Bielefeld":"Arminia Bielefeld",
    "Bielefeld":"Arminia Bielefeld",
    "Bochum":"VfL Bochum",
    "VfL Bochum 1848":"VfL Bochum",

    # --- LIGUE 1 ---
    "Marseille": "Olympique de Marseille",
    "Paris SG": "Paris Saint Germain",
    "Paris FC": "Paris FC",
    "RC Lens": "Lens",
    "Strasbourg": "Estrasburgo",
    "Brest": "Brestois",
    "Stade Rennais FC": "Rennes",
    "Auxerre": "AJ Auxerre",
    "Angers SCO": "Angers",
    "AS Monaco": "Monaco",
    "Lorient": "FC Lorient",
    "Metz": "FC Metz",
    "FC Nantes": "Nantes",
    "Toulouse": "Toulouse FC",
    "Le Havre": "Le Havre AC",
    "Lille": "Lille",
    "OGC Nice": "Nice",
    "Olympique Lyon,Lyonnais": "Lyon",
    "Stade de Reims": "Reims",
    "Bastia": "SC Bastia",
    "EA Guingamp": "Guingamp",
    "AS Saint-Étienne":"Saint-Étienne",
    "St Etienne":"Saint-Étienne",
    "Évian Thonon Gaillard":"Evian Thonon Gaillard",
    "SM Caen":"Caen",
    "Girondins Bordeaux":"Bordeaux",
    "Amiens":"Amiens SC",
    "ESTAC Troyes":"Troyes",
    "Dijon":"Dijon FCO",
    "Nîmes Olympique":"Nimes",
    "Clermont Foot 63":"Clermont",
    "Ajaccio":"AC Ajaccio",
}

# ================= HELPERS =================

def normalize_team(name: str) -> str:
    if name is None:
        return None
    s = str(name).strip()
    return TEAM_MAP.get(s, s)

def normalize_key(text):
    if not isinstance(text, str):
        return str(text)
    text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return text.lower().replace(" ", "").strip()

def get_day_of_week(date_obj):
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days[date_obj.weekday()]

def compute_matchday_from_counts(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula Matchday quando a fonte não fornece MW.
    Estratégia: ordenar por Date e usar 'games played' por time:
      Matchday = max(jogos_do_home, jogos_do_away) + 1

    ✅ Funciona muito bem para ligas (E0, D1 etc.)
    ⚠️ Pode ficar levemente imperfeito em casos de jogos muito adiados,
       mas é MUITO melhor do que deixar tudo vazio.
    """
    if df.empty:
        return df

    out = df.copy()

    # precisa de Date/Home/Away
    if "Date" not in out.columns or "Home" not in out.columns or "Away" not in out.columns:
        return out

    dt = pd.to_datetime(out["Date"], errors="coerce")
    out["_dt_sort"] = dt

    out = out.sort_values(["_dt_sort", "Home", "Away"], na_position="last").reset_index(drop=True)

    gp = {}  # jogos já "contados" por time
    mds = []

    for _, r in out.iterrows():
        h = normalize_key(_clean_text(r.get("Home")))
        a = normalize_key(_clean_text(r.get("Away")))
        md = max(gp.get(h, 0), gp.get(a, 0)) + 1
        mds.append(md)
        gp[h] = gp.get(h, 0) + 1
        gp[a] = gp.get(a, 0) + 1

    out["Matchday"] = mds
    out = out.drop(columns=["_dt_sort"], errors="ignore")
    return out


def safe_int(x):
    try:
        if x is None:
            return None
        s = str(x).strip()
        if s == "" or s.lower() == "nan":
            return None
        s = s.replace(",", ".")
        return int(float(s))
    except:
        return None

def safe_float(x):
    try:
        if x is None:
            return None
        s = str(x).strip()
        if s == "" or s.lower() == "nan":
            return None
        return float(s.replace(",", "."))
    except:
        return None

def ensure_cols(df: pd.DataFrame, cols):
    for c in cols:
        if c not in df.columns:
            df[c] = None
    return df[cols]

# ================= CSV ROBUST (REMOTE + LOCAL) =================

def http_get_text(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=60)
    r.raise_for_status()
    try:
        return r.content.decode("utf-8")
    except:
        return r.content.decode("latin1", errors="replace")

def _detect_delimiter(sample_text: str) -> str:
    lines = [l for l in sample_text.splitlines() if l.strip()][:20]
    if not lines:
        return ","
    joined = "\n".join(lines)
    counts = {"\t": joined.count("\t"), ",": joined.count(","), ";": joined.count(";")}
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else ","

def read_csv_robust_from_text(text: str, delimiter: str = ",") -> pd.DataFrame:
    """
    Lê CSV com linhas inconsistentes sem quebrar:
    - linha com colunas a mais -> junta excedente na última coluna
    - linha com colunas a menos -> completa com vazio
    """
    buf = io.StringIO(text)
    reader = csv.reader(buf, delimiter=delimiter)
    try:
        header = next(reader)
    except StopIteration:
        return pd.DataFrame()

    header = [h.strip() for h in header]
    n = len(header)
    rows = []

    for row in reader:
        if not row:
            continue
        if len(row) < n:
            row = row + [""] * (n - len(row))
        elif len(row) > n:
            row = row[: n - 1] + [delimiter.join(row[n - 1 :])]
        rows.append(row)

    return pd.DataFrame(rows, columns=header)

def read_local_csv_robust(file_path: str) -> pd.DataFrame:
    """
    ✅ Lê o CSV local sem perder linhas mesmo se estiver malformado.
    ✅ Detecta delimitador (",", ";", TAB) e usa parser robusto.
    """
    with open(file_path, "rb") as f:
        raw = f.read()
    try:
        text = raw.decode("utf-8")
    except:
        text = raw.decode("latin1", errors="replace")

    delim = _detect_delimiter(text)
    df = read_csv_robust_from_text(text, delimiter=delim)
    # normaliza colunas
    df.columns = [str(c).strip() for c in df.columns]
    return df

# ================= FOOTBALL-DATA.CO.UK (mmz4281) =================

def build_fd_uk_url(season_code: str, league_code: str) -> str:
    return f"https://www.football-data.co.uk/mmz4281/{season_code}/{league_code}.csv"

def parse_football_data_uk(url: str) -> pd.DataFrame:
    print(f"   [Download] {url}...")
    try:
        text = http_get_text(url)
        df_raw = read_csv_robust_from_text(text, delimiter=",")
    except Exception as e:
        print(f"   [Erro] {e}")
        return pd.DataFrame()

    df_raw.columns = [str(c).strip() for c in df_raw.columns]

    matches = []
    for _, row in df_raw.iterrows():
        date_str = str(row.get("Date", "")).strip()
        home_raw = row.get("HomeTeam")
        away_raw = row.get("AwayTeam")

        if date_str == "" or home_raw in [None, ""] or away_raw in [None, ""]:
            continue

        try:
            dt = datetime.strptime(date_str, "%d/%m/%Y")
        except:
            try:
                dt = datetime.strptime(date_str, "%d/%m/%y")
            except:
                continue

        date_iso = dt.strftime("%Y-%m-%d")
        day = get_day_of_week(dt)

        home = normalize_team(home_raw)
        away = normalize_team(away_raw)

        fthg = safe_int(row.get("FTHG"))
        ftag = safe_int(row.get("FTAG"))
        hthg = safe_int(row.get("HTHG"))
        htag = safe_int(row.get("HTAG"))

        matches.append({
            "Matchday": safe_int(row.get("MW")) if "MW" in df_raw.columns else None,
            "Day": day,
            "Date": date_iso,
            "Home": home,
            "Away": away,
            "FullTime": f"{fthg}-{ftag}" if fthg is not None and ftag is not None else None,
            "HalfTime": f"{hthg}-{htag}" if hthg is not None and htag is not None else None,
            "Penalties": None,

            "FullTimeHomeGoals": fthg,
            "FullTimeAwayGoals": ftag,
            "FullTimeResult": row.get("FTR"),

            "HalfTimeHomeGoals": hthg,
            "HalfTimeAwayGoals": htag,
            "HalfTimeResult": row.get("HTR"),

            "HomeShots": safe_int(row.get("HS")),
            "AwayShots": safe_int(row.get("AS")),
            "HomeShotsOnTarget": safe_int(row.get("HST")),
            "AwayShotsOnTarget": safe_int(row.get("AST")),

            "HomeFouls": safe_int(row.get("HF")),
            "AwayFouls": safe_int(row.get("AF")),
            "HomeCorners": safe_int(row.get("HC")),
            "AwayCorners": safe_int(row.get("AC")),

            "HomeYellowCards": safe_int(row.get("HY")),
            "AwayYellowCards": safe_int(row.get("AY")),
            "HomeRedCards": safe_int(row.get("HR")),
            "AwayRedCards": safe_int(row.get("AR")),

            "PinnacleHomeOpen": safe_float(row.get("PSH")),
            "PinnacleDrawOpen": safe_float(row.get("PSD")),
            "PinnacleAwayOpen": safe_float(row.get("PSA")),

            "AvgHomeOpen": safe_float(row.get("AvgH")),
            "AvgDrawOpen": safe_float(row.get("AvgD")),
            "AvgAwayOpen": safe_float(row.get("AvgA")),

            "MaxHomeOpen": safe_float(row.get("MaxH")),
            "MaxDrawOpen": safe_float(row.get("MaxD")),
            "MaxAwayOpen": safe_float(row.get("MaxA")),

            "Bet365HomeOpen": safe_float(row.get("B365H")),
            "Bet365DrawOpen": safe_float(row.get("B365D")),
            "Bet365AwayOpen": safe_float(row.get("B365A")),

            "Bet365Over25Open": safe_float(row.get("B365>2.5")),
            "Bet365Under25Open": safe_float(row.get("B365<2.5")),
            "PinnacleOver25Open": safe_float(row.get("P>2.5")),
            "PinnacleUnder25Open": safe_float(row.get("P<2.5")),
            "AvgOver25Open": safe_float(row.get("Avg>2.5")),
            "AvgUnder25Open": safe_float(row.get("Avg<2.5")),

            "PinnacleHomeClose": safe_float(row.get("PSCH")),
            "PinnacleDrawClose": safe_float(row.get("PSCD")),
            "PinnacleAwayClose": safe_float(row.get("PSCA")),

            "AvgHomeClose": safe_float(row.get("AvgCH")),
            "AvgDrawClose": safe_float(row.get("AvgCD")),
            "AvgAwayClose": safe_float(row.get("AvgCA")),

            "MaxHomeClose": None, "MaxDrawClose": None, "MaxAwayClose": None,
            "Bet365HomeClose": None, "Bet365DrawClose": None, "Bet365AwayClose": None,
        })

        df = pd.DataFrame(matches)

        # ✅ se a fonte não traz MW e Matchday ficou toda vazia, calculamos
        if not df.empty:
            if "Matchday" in df.columns:
                all_empty = df["Matchday"].isna().all()
                if all_empty:
                    df = compute_matchday_from_counts(df)

    return df

# ================= BRAZIL (new/BRA.csv) =================

def parse_brazil_all_seasons(url: str, league_filter: str = "Serie A") -> pd.DataFrame:
    print(f"   [Download] {url}...")
    try:
        text = http_get_text(url)
        delim = _detect_delimiter(text)
        df_raw = read_csv_robust_from_text(text, delimiter=delim)
    except Exception as e:
        print(f"   [Erro] {e}")
        return pd.DataFrame()

    df_raw.columns = [str(c).strip() for c in df_raw.columns]

    if "Country" in df_raw.columns:
        df_raw = df_raw[df_raw["Country"].astype(str).str.strip().str.lower() == "brazil"]

    if "League" in df_raw.columns:
        df_raw = df_raw[df_raw["League"].astype(str).str.strip().str.lower() == str(league_filter).strip().lower()]

    if "Season" not in df_raw.columns:
        print("   [Erro] BRA.csv sem coluna Season.")
        return pd.DataFrame()

    matches = []
    seasons = []

    for _, row in df_raw.iterrows():
        season = str(row.get("Season", "")).strip()
        if season == "":
            continue

        date_str = str(row.get("Date", "")).strip()
        if date_str == "":
            continue

        try:
            dt = datetime.strptime(date_str, "%d/%m/%Y")
        except:
            continue

        home = normalize_team(row.get("Home"))
        away = normalize_team(row.get("Away"))

        hg = safe_int(row.get("HG"))
        ag = safe_int(row.get("AG"))

        matches.append({
            "Matchday": None,
            "Day": get_day_of_week(dt),
            "Date": dt.strftime("%Y-%m-%d"),
            "Home": home,
            "Away": away,
            "FullTime": f"{hg}-{ag}" if hg is not None and ag is not None else None,
            "HalfTime": None,
            "Penalties": None,

            "FullTimeHomeGoals": hg,
            "FullTimeAwayGoals": ag,
            "FullTimeResult": str(row.get("Res")).strip() if row.get("Res") is not None else None,

            "HalfTimeHomeGoals": None,
            "HalfTimeAwayGoals": None,
            "HalfTimeResult": None,

            "HomeShots": None,
            "AwayShots": None,
            "HomeShotsOnTarget": None,
            "AwayShotsOnTarget": None,
            "HomeFouls": None,
            "AwayFouls": None,
            "HomeCorners": None,
            "AwayCorners": None,
            "HomeYellowCards": None,
            "AwayYellowCards": None,
            "HomeRedCards": None,
            "AwayRedCards": None,

            "PinnacleHomeOpen": None,
            "PinnacleDrawOpen": None,
            "PinnacleAwayOpen": None,
            "AvgHomeOpen": None,
            "AvgDrawOpen": None,
            "AvgAwayOpen": None,
            "MaxHomeOpen": None,
            "MaxDrawOpen": None,
            "MaxAwayOpen": None,
            "Bet365HomeOpen": None,
            "Bet365DrawOpen": None,
            "Bet365AwayOpen": None,

            "Bet365Over25Open": None,
            "Bet365Under25Open": None,
            "PinnacleOver25Open": None,
            "PinnacleUnder25Open": None,
            "AvgOver25Open": None,
            "AvgUnder25Open": None,

            "PinnacleHomeClose": safe_float(row.get("PSCH")),
            "PinnacleDrawClose": safe_float(row.get("PSCD")),
            "PinnacleAwayClose": safe_float(row.get("PSCA")),

            "AvgHomeClose": safe_float(row.get("AvgCH")),
            "AvgDrawClose": safe_float(row.get("AvgCD")),
            "AvgAwayClose": safe_float(row.get("AvgCA")),

            "MaxHomeClose": safe_float(row.get("MaxCH")),
            "MaxDrawClose": safe_float(row.get("MaxCD")),
            "MaxAwayClose": safe_float(row.get("MaxCA")),

            "Bet365HomeClose": safe_float(row.get("B365CH")),
            "Bet365DrawClose": safe_float(row.get("B365CD")),
            "Bet365AwayClose": safe_float(row.get("B365CA")),
        })
        seasons.append(season)

    out = pd.DataFrame(matches)
    if out.empty:
        return out

    out["__Season"] = seasons
    return out

# ================= MERGE / UPDATE =================
def _clean_text(v):
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "nan":
        return None
    # remove lixo comum que quebra chave
    s = s.replace("\ufeff", "").strip()
    s = re.sub(r'[")]+$', "", s)         # remove ) ou " no final
    s = re.sub(r'^[("]+', "", s)         # remove ( ou " no começo
    s = s.strip()
    return s or None


def _norm_date(v):
    """
    Normaliza para YYYY-MM-DD.
    ✅ Entende:
      - YYYY-MM-DD
      - DD/MM/YYYY e DD/MM/YY
      - strings com horário (timestamp)
    ✅ NÃO retorna None se houver um texto de data válido mas fora do formato esperado.
    """
    s = _clean_text(v)
    if not s:
        return None

    # já está ISO?
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return s

    # dd/mm/yyyy ou dd/mm/yy -> dayfirst=True
    if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{2,4}", s):
        dt = pd.to_datetime(s, errors="coerce", dayfirst=True)
        if pd.isna(dt):
            return None
        return dt.strftime("%Y-%m-%d")

    # fallback geral
    dt = pd.to_datetime(s, errors="coerce", dayfirst=False)
    if pd.isna(dt):
        return None
    return dt.strftime("%Y-%m-%d")



def _row_completeness(row: pd.Series, cols) -> int:
    score = 0
    for c in cols:
        v = row.get(c, None)
        if v is None:
            continue
        if isinstance(v, float) and pd.isna(v):
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        score += 1
    return score


def dedup_matches(df: pd.DataFrame, season_key: str) -> pd.DataFrame:
    """
    Remove duplicados por (Date, Home, Away, season_key), mantendo a melhor linha
    e mesclando campos (primeiro valor não-vazio por coluna).

    ✅ Preferência:
    1) linha com Date válida
    2) linha mais completa (mais campos preenchidos)
    """
    if df.empty:
        return df

    df = df.copy()

    # normaliza chave
    df["_k_date"] = df["Date"].apply(_norm_date)
    df["_k_home"] = df["Home"].apply(lambda x: normalize_key(_clean_text(x)))
    df["_k_away"] = df["Away"].apply(lambda x: normalize_key(_clean_text(x)))
    df["_k_season"] = season_key

    # se Date não existe/ inválida, cai para Matchday
    df["_k_md"] = df["Matchday"].apply(lambda x: _clean_text(x))
    df["_k"] = df.apply(
        lambda r: (r["_k_home"], r["_k_away"], r["_k_date"], r["_k_season"])
        if r["_k_date"] else (r["_k_home"], r["_k_away"], r["_k_md"], r["_k_season"]),
        axis=1
    )

    # ✅ ordenação: primeiro quem tem Date, depois quem é mais completo
    df["_has_date"] = df["_k_date"].apply(lambda x: 1 if x else 0)
    df["_score"] = df.apply(lambda r: _row_completeness(r, TARGET_COLS), axis=1)
    df = df.sort_values(["_k", "_has_date", "_score"], ascending=[True, False, False])

    # mescla por chave
    rows = []
    for _, g in df.groupby("_k", sort=False):
        base = g.iloc[0].copy()  # preferida
        # preenche buracos com as outras
        for _, rr in g.iloc[1:].iterrows():
            for col in TARGET_COLS:
                bv = base.get(col, None)
                if bv is None or (isinstance(bv, float) and pd.isna(bv)) or (isinstance(bv, str) and bv.strip() == ""):
                    nv = rr.get(col, None)
                    if nv is None or (isinstance(nv, float) and pd.isna(nv)) or (isinstance(nv, str) and str(nv).strip() == ""):
                        continue
                    # ✅ respeita regra: não derrubar Matchday existente
                    if col == "Matchday" and bv not in [None, "", "nan", "NaN"]:
                        continue
                    base[col] = nv
        rows.append(base)

    out = pd.DataFrame(rows)

    # limpa colunas auxiliares
    drop_aux = [c for c in out.columns if c.startswith("_k") or c in ["_score", "_has_date"]]
    out = out.drop(columns=drop_aux, errors="ignore")

    # ✅ normaliza Date final SEM apagar: se não conseguir normalizar, mantém o valor original limpo
    out["Date"] = out["Date"].apply(lambda x: _norm_date(x) or _clean_text(x))

    return out


def make_match_key_date(row, season_key: str):
    home = normalize_key(_clean_text(row.get("Home")))
    away = normalize_key(_clean_text(row.get("Away")))
    date = _norm_date(row.get("Date"))
    if not date:
        return None
    return (home, away, date, season_key)


def make_match_key_md(row, season_key: str):
    home = normalize_key(_clean_text(row.get("Home")))
    away = normalize_key(_clean_text(row.get("Away")))
    md = _clean_text(row.get("Matchday"))
    if not md:
        return None
    return (home, away, md, season_key)


def smart_update_row(df_local: pd.DataFrame, idx: int, row_new: pd.Series):
    """
    ✅ Só atualiza com valores não-vazios (não apaga dado local)
    ✅ Não derruba Matchday já existente
    """
    for col in df_local.columns:
        newv = row_new.get(col, None)
        if newv is None or (isinstance(newv, float) and pd.isna(newv)):
            continue
        if isinstance(newv, str) and newv.strip() == "":
            continue

        oldv = df_local.at[idx, col]

        # ✅ não derruba Matchday já existente
        if col == "Matchday":
            if oldv not in [None, "", "nan", "NaN"] and str(oldv).strip() != "":
                continue

        if oldv is None or (isinstance(oldv, float) and pd.isna(oldv)) or str(oldv).strip() == "" or str(oldv) != str(newv):
            df_local.at[idx, col] = newv


def update_csv_merge(file_path: str, df_new: pd.DataFrame, season_key: str):
    df_new = ensure_cols(df_new, TARGET_COLS)

    if os.path.exists(file_path):
        df_local = read_local_csv_robust(file_path)
        df_local = ensure_cols(df_local, TARGET_COLS)

        # ✅ 1) dedup do CSV local antes de indexar (remove repetidos antigos)
        df_local = dedup_matches(df_local, season_key)

        # ✅ regrava já “limpo”
        df_local.to_csv(file_path, index=False, encoding="utf-8")
    else:
        df_local = pd.DataFrame(columns=TARGET_COLS)

    df_local = ensure_cols(df_local, TARGET_COLS)

    # ✅ 2) index duplo (Date e Matchday) para casar mesmo se Date vier vazia/zoada
    local_index_date = {}
    local_index_md = {}

    for idx, r in df_local.iterrows():
        kd = make_match_key_date(r, season_key)
        if kd:
            local_index_date[kd] = idx
        km = make_match_key_md(r, season_key)
        if km:
            local_index_md[km] = idx

    added = 0
    updated = 0

    for _, rnew in df_new.iterrows():
        kd = make_match_key_date(rnew, season_key)
        km = make_match_key_md(rnew, season_key)

        idx = None
        if kd and kd in local_index_date:
            idx = local_index_date[kd]
        elif km and km in local_index_md:
            idx = local_index_md[km]

        if idx is not None:
            before = df_local.loc[idx].copy()
            smart_update_row(df_local, idx, rnew)
            if not before.equals(df_local.loc[idx]):
                updated += 1
        else:
            df_local = pd.concat([df_local, pd.DataFrame([rnew])], ignore_index=True)
            added += 1

    # ✅ 3) dedup de novo depois do merge (casos sujos / duplicados residuais)
    df_local = dedup_matches(df_local, season_key)

    # ✅ 4) ordenar por Matchday (quando existir) e depois por Date
    if "Matchday" in df_local.columns:
        df_local["_md_sort"] = pd.to_numeric(df_local["Matchday"], errors="coerce")
    else:
        df_local["_md_sort"] = None

    df_local["_md_sort"] = df_local["_md_sort"].fillna(9999)  # sem matchday vai pro fim

    if "Date" in df_local.columns:
        df_local["_date_sort"] = pd.to_datetime(df_local["Date"], errors="coerce")
    else:
        df_local["_date_sort"] = pd.NaT

    if "Date" in df_local.columns and "Day" in df_local.columns:
        dt = pd.to_datetime(df_local["Date"], errors="coerce")
        mask = df_local["Day"].isna() | (df_local["Day"].astype(str).str.strip() == "")
        df_local.loc[mask & dt.notna(), "Day"] = dt[mask & dt.notna()].dt.day_name().str[:3]
        # vai ficar Mon/Tue/... em inglês; se quiser pt-BR eu adapto

    # ✅ agrupa naturalmente por Matchday e ordena dentro
    df_local = df_local.sort_values(
        ["_md_sort", "_date_sort", "Home", "Away"],
        ascending=[True, True, True, True],
        na_position="last"
    ).drop(columns=["_md_sort", "_date_sort"], errors="ignore")


    df_local.to_csv(file_path, index=False, encoding="utf-8")
    print(f"   [Sucesso] {updated} jogos atualizados, {added} novos adicionados. -> {os.path.basename(file_path)}")


# ================= FILENAME HELPERS =================

def infer_season_code_from_filename(filename: str):
    m = re.search(r"(\d{4})_(\d{2})", filename)
    if not m:
        return None
    y1 = int(m.group(1))
    y2 = int(m.group(2))
    return f"{str(y1)[-2:]}{y2:02d}"

def infer_year_from_brazil_filename(fname: str):
    m = re.search(r"(\d{4})", fname)
    if not m:
        return None
    return int(m.group(1))

# ================= UPDATERS =================

def update_league_fd_uk(config: dict):
    folder_path = os.path.join(CAMINHO_RAIZ, config["pasta"])
    os.makedirs(folder_path, exist_ok=True)

    print(f"\n--- {config['nome']} (FD-UK {config['code']}) ---")

    existing = [f for f in os.listdir(folder_path) if f.lower().endswith(".csv")]
    if not existing:
        print("   [Info] Nenhum CSV existente nessa pasta.")
        return

    for fname in sorted(existing):
        season_code = infer_season_code_from_filename(fname)
        if not season_code:
            continue

        file_path = os.path.join(folder_path, fname)
        url = build_fd_uk_url(season_code, config["code"])

        df_new = parse_football_data_uk(url)
        if df_new.empty:
            continue

        update_csv_merge(file_path, df_new, season_key=season_code)

def update_league_brasil(config: dict):
    folder_path = os.path.join(CAMINHO_RAIZ, config["pasta"])
    os.makedirs(folder_path, exist_ok=True)

    print(f"\n--- {config['nome']} (Brasil) ---")

    df_all = parse_brazil_all_seasons(
        config["url"],
        league_filter=config.get("league_filter", "Serie A"),
    )

    if df_all.empty:
        print("   [Info] Nenhum dado novo.")
        return

    existing = [f for f in os.listdir(folder_path) if f.lower().endswith(".csv")]

    years_done = set()
    for fname in sorted(existing):
        year = infer_year_from_brazil_filename(fname)
        if not year:
            continue

        df_year = df_all[df_all["__Season"] == str(year)].copy()
        df_year = df_year.drop(columns=["__Season"], errors="ignore")

        if df_year.empty:
            continue

        df_year = ensure_cols(df_year, TARGET_COLS)
        update_csv_merge(os.path.join(folder_path, fname), df_year, season_key=str(year))
        years_done.add(year)

    if not years_done:
        last_year = max([int(x) for x in df_all["__Season"].dropna().unique()])
        df_year = df_all[df_all["__Season"] == str(last_year)].copy()
        df_year = df_year.drop(columns=["__Season"], errors="ignore")
        df_year = ensure_cols(df_year, TARGET_COLS)

        out_name = f"brasileirao_{last_year}.csv"
        update_csv_merge(os.path.join(folder_path, out_name), df_year, season_key=str(last_year))

# ================= MAIN =================

if __name__ == "__main__":
    for league in LEAGUES:
        if league["tipo_fonte"] == "football-data-uk":
            update_league_fd_uk(league)
        else:
            update_league_brasil(league)
