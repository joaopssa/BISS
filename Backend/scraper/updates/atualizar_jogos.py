import pandas as pd
import requests
import io
import os
import unicodedata
from datetime import datetime

# ================= CONFIGURAÇÕES =================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAMINHO_RAIZ = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "data", "matches")
)


COLS_PADRAO = ['Matchday', 'Day', 'Date', 'Home', 'Away', 'FullTime', 'HalfTime']
COLS_COM_PENALTIS = ['Matchday', 'Day', 'Date', 'Home', 'Away', 'FullTime', 'HalfTime', 'Penalties']

# ================= NORMALIZAÇÃO DE CLUBES =================

LEAGUES = [
    {
        "nome": "Premier League",
        "pasta": "premier-league",
        "arquivo": "2025_26_premierleague.csv",
        "tipo_fonte": "football-data-uk",
        "url": "https://www.football-data.co.uk/mmz4281/2526/E0.csv",
        "has_penalties": False
    },
    {
        "nome": "La Liga",
        "pasta": "laliga",
        "arquivo": "laliga_2025_26.csv",
        "tipo_fonte": "football-data-uk",
        "url": "https://www.football-data.co.uk/mmz4281/2526/SP1.csv",
        "has_penalties": False
    },
    {
        "nome": "Serie A TIM",
        "pasta": "serie-a-tim",
        "arquivo": "seriea_2025_26.csv",
        "tipo_fonte": "football-data-uk",
        "url": "https://www.football-data.co.uk/mmz4281/2526/I1.csv",
        "has_penalties": False
    },
    {
        "nome": "Brasileirão Série A",
        "pasta": "brasileirao-serie-a",
        "arquivo": "brasileirao_2026.csv",
        "tipo_fonte": "football-data-new",
        "url": "https://www.football-data.co.uk/new/BRA.csv",
        "filtro_ano": 2026,
        "divisao_filtro": "Serie A",
        "has_penalties": False
    },
    {
        "nome": "Bundesliga",
        "pasta": "bundesliga",
        "arquivo": "2025_26_bundesliga.csv",
        "tipo_fonte": "football-data-uk",
        "url": "https://www.football-data.co.uk/mmz4281/2526/D1.csv",
        "has_penalties": False
    }

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
    "Santos": "Santos",
    "Grêmio FBPA": "Grêmio",
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

    # --- LA LIGA ---
    "Real Madrid": "Real Madrid",
    "Barcelona": "Barcelona",
    "Ath Madrid": "Atlético de Madrid",
    "Ath Bilbao": "Athletic Bilbao",
    "Sociedad": "Real Sociedad",
    "Betis": "Bétis",
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
    "Real Valladolid CF": "Real Valladolid CF",
    "Vallecano": "Rayo Vallecano",
    "CD Leganés": "Leganés",
    "Oviedo": "Real Oviedo",
    "Levante": "Levante",
    "Elche":"Elche",

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
    "Lecce": "US Lecce",
    "Verona": "Hellas Verona",
    "FC Empoli": "FC Empoli",
    "AC Monza": "AC Monza",
    "Venezia FC": "Venezia FC",
    "Cagliari Calcio": "Cagliari",
    "Cremonese":"US Cremonese",
    "Pisa":"AC Pisa 1909",
    "Sassuolo":"Sassuolo", 

    # --- BUNDESLIGA ---
    "Bayern Munich": "Bayern de Munique",
    "Leverkusen": "Bayer Leverkusen",
    "RB Leipzig": "RB Leipzig",
    "Dortmund": "Borussia Dortmund",
    "Ein Frankfurt": "Eintracht Frankfurt",
    "Stuttgart": "VfB Stuttgart",
    "Wolfsburg": "Wolfsburg",
    "M'gladbach": "Borussia Monchengladbach",
    "Hoffenheim": "Hoffenheim",
    "Freiburg": "Freiburg",
    "Mainz": "Mainz 05",
    "Augsburg": "Augsburg",
    "Union Berlin": "1.FC Union Berlin",
    "Werder Bremen": "Werder Bremen",
    "Heidenheim": "1. FC Heidenheim",
    "St Pauli": "FC St. Pauli",
    "VfL Bochum": "VfL Bochum",
    "Holstein Kiel": "Holstein Kiel",
    "FC Koln":"1. FC Köln",
    "Hamburg":"Hamburgo",
    

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

def normalize_team(name: str) -> str:
    return TEAM_MAP.get(name, name)

def normalize_key(text):
    if not isinstance(text, str):
        return str(text)
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return text.lower().replace(" ", "").strip()

def get_day_of_week(date_obj):
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days[date_obj.weekday()]

# ================= PARSERS =================

def parse_football_data_uk(url):
    print(f"   [Download] {url}...")
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        r.raise_for_status()
        df_raw = pd.read_csv(io.StringIO(r.text))
    except Exception as e:
        print(f"   [Erro] {e}")
        return pd.DataFrame()

    matches = []
    for _, row in df_raw.iterrows():
        if pd.isna(row.get('Date')):
            continue
        try:
            dt = datetime.strptime(row['Date'], "%d/%m/%Y")
        except:
            continue

        matches.append({
            'Matchday': None,
            'Day': get_day_of_week(dt),
            'Date': dt.strftime("%Y-%m-%d"),
            'Home': normalize_team(row['HomeTeam']),
            'Away': normalize_team(row['AwayTeam']),
            'FullTime': f"{int(row['FTHG'])}-{int(row['FTAG'])}" if not pd.isna(row['FTHG']) else None,
            'HalfTime': f"{int(row['HTHG'])}-{int(row['HTAG'])}" if not pd.isna(row['HTHG']) else None,
            'Penalties': None
        })
    return pd.DataFrame(matches)

def parse_football_data_new(url, ano_filtro, divisao_filtro=None):
    print(f"   [Download] {url}...")
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        r.raise_for_status()
        df_raw = pd.read_csv(io.StringIO(r.text))
    except Exception as e:
        print(f"   [Erro] {e}")
        return pd.DataFrame()

    matches = []
    for _, row in df_raw.iterrows():
        if int(row.get('Season', 0)) != ano_filtro:
            continue
        if divisao_filtro and divisao_filtro.lower() not in str(row.get('League', '')).lower():
            continue
        try:
            dt = datetime.strptime(row['Date'], "%d/%m/%Y")
        except:
            continue

        matches.append({
            'Matchday': None,
            'Day': get_day_of_week(dt),
            'Date': dt.strftime("%Y-%m-%d"),
            'Home': normalize_team(row['Home']),
            'Away': normalize_team(row['Away']),
            'FullTime': f"{int(row['HG'])}-{int(row['AG'])}",
            'HalfTime': None,
            'Penalties': None
        })
    return pd.DataFrame(matches)

# ================= UPDATE LOGIC =================

# ================= UPDATE LOGIC =================

def update_csv_file(config):
    folder_path = os.path.join(CAMINHO_RAIZ, config['pasta'])
    file_path = os.path.join(folder_path, config['arquivo'])

    print(f"\n--- {config['nome']} ---")
    os.makedirs(folder_path, exist_ok=True)

    if config['tipo_fonte'] == 'football-data-uk':
        df_new = parse_football_data_uk(config['url'])
        season_key = "2025_26"
    else:
        df_new = parse_football_data_new(
            config['url'],
            config.get('filtro_ano'),
            config.get('divisao_filtro')
        )
        season_key = str(config.get("filtro_ano", ""))

    if df_new.empty:
        print("   [Info] Nenhum dado novo.")
        return

    target_cols = COLS_COM_PENALTIS if config.get('has_penalties') else COLS_PADRAO
    for col in target_cols:
        if col not in df_new.columns:
            df_new[col] = None
    df_new = df_new[target_cols]

    if os.path.exists(file_path):
        df_local = pd.read_csv(
            file_path,
            sep=",",
            engine="python",
            encoding="utf-8",
            on_bad_lines="skip"
        )
    else:
        df_local = pd.DataFrame(columns=target_cols)

    for col in target_cols:
        if col not in df_local.columns:
            df_local[col] = None
    df_local = df_local[target_cols]

    # ✅ FIX: garantir dtypes (evita FutureWarning e futuros erros)
    STRING_COLS = ["Day", "Date", "Home", "Away", "FullTime", "HalfTime"]
    if "Penalties" in target_cols:
        STRING_COLS.append("Penalties")

    for c in STRING_COLS:
        if c in df_new.columns:
            df_new[c] = df_new[c].astype("string")
        if c in df_local.columns:
            df_local[c] = df_local[c].astype("string")

    # Matchday: mantém numérico nullable (se você quiser)
    if "Matchday" in target_cols:
        df_new["Matchday"] = pd.to_numeric(df_new["Matchday"], errors="coerce").astype("Int64")
        df_local["Matchday"] = pd.to_numeric(df_local["Matchday"], errors="coerce").astype("Int64")

    # 🔑 CHAVE REAL DO JOGO (SEM DATA)
    def make_key(row):
        return (
            normalize_key(row['Home']),
            normalize_key(row['Away']),
            season_key
        )

    local_index = {
        make_key(row): idx for idx, row in df_local.iterrows()
    }

    added = 0
    updated = 0

    for _, row in df_new.iterrows():
        key = make_key(row)

        if key in local_index:
            idx = local_index[key]

            # 🔄 ATUALIZA DATE/DAY (para Brasileirão 2026 preencher do zero também)
            new_date = row.get("Date")
            old_date = df_local.at[idx, "Date"]

            # Só tenta atualizar se o feed trouxe uma data válida
            if pd.notna(new_date) and str(new_date).strip() != "":
                # Atualiza se o local está vazio OU a data mudou
                if pd.isna(old_date) or str(old_date).strip() == "" or str(old_date) != str(new_date):
                    df_local.at[idx, "Date"] = new_date
                    try:
                        dt = datetime.strptime(str(new_date), "%Y-%m-%d")
                        df_local.at[idx, "Day"] = get_day_of_week(dt)
                    except:
                        pass
                    updated += 1
                else:
                    # Date igual, mas Day vazio -> recalcula
                    old_day = df_local.at[idx, "Day"]
                    if pd.isna(old_day) or str(old_day).strip() == "":
                        try:
                            dt = datetime.strptime(str(old_date), "%Y-%m-%d")
                            df_local.at[idx, "Day"] = get_day_of_week(dt)
                            updated += 1
                        except:
                            pass



            # 🔄 ATUALIZA PLACAR SE NECESSÁRIO
            if pd.isna(df_local.at[idx, 'FullTime']) and pd.notna(row['FullTime']):
                df_local.at[idx, 'FullTime'] = row['FullTime']
                df_local.at[idx, 'HalfTime'] = row['HalfTime']
                updated += 1
        else:
            df_local = pd.concat([df_local, pd.DataFrame([row])], ignore_index=True)
            added += 1

    df_local.to_csv(file_path, index=False)
    print(f"   [Sucesso] {updated} jogos atualizados, {added} novos adicionados.")


# ================= MAIN =================

if __name__ == "__main__":
    for league in LEAGUES:
        update_csv_file(league)
