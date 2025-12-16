import requests
import pandas as pd
import os
from datetime import datetime

# ================= CONFIG =================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAMINHO_RAIZ = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "data", "matches","brasileirao-serie-b")
)


ARQUIVO = os.path.join(CAMINHO_RAIZ, "brasileiraoB_2025.csv")

COLS = ['Matchday', 'Day', 'Date', 'Home', 'Away', 'FullTime', 'HalfTime']

CAMPEONATO_ID = 12607
TOTAL_RODADAS = 38

BASE_URL = "https://www.cbf.com.br/api/proxy"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json"
}

# ================= TEAM MAP (20 CONVERSÕES) =================

TEAM_MAP = {
    "Athletico Paranaense": "Athletico-PR",
    "Atlético Goianiense Saf": "Atlético-GO",
    "Coritiba S.a.f.": "Coritiba",
    "Cuiabá Saf": "Cuiabá",
    "America Saf": "América-MG",
    "Amazonas Saf": "Amazonas AM",
    "Crb": "CRB",
    "Operário": "Operário-PR",
    "Athletic Saf": "Athletic Club MG",
    "Gremio Novorizontino - Saf": "Grêmio Novorizontino",
    "Botafogo": "Botafogo-SP",
    "Avaí": "Avaí",
    "Chapecoense": "Chapecoense",
    "Criciúma": "Criciúma",
    "Ferroviária": "Ferroviária",
    "Goiás": "Goiás",
    "Paysandu": "Paysandu",
    "Remo": "Remo",
    "Vila Nova": "Vila Nova",
    "Volta Redonda": "Volta Redonda"
}

# ================= AUX =================

def normalize_team(name: str) -> str:
    if not name:
        return None
    name = name.strip()
    return TEAM_MAP.get(name, name)

def parse_date(date_br: str) -> str:
    # Ex: " 19/11/2025"
    return datetime.strptime(date_br.strip(), "%d/%m/%Y").strftime("%Y-%m-%d")

def day_of_week(date_iso: str) -> str:
    dt = datetime.strptime(date_iso, "%Y-%m-%d")
    return dt.strftime("%a")

# ================= SCRAPER =================

def scrape_serie_b():
    os.makedirs(CAMINHO_RAIZ, exist_ok=True)
    rows = []

    for rodada in range(1, TOTAL_RODADAS + 1):
        print(f"Rodada {rodada}")

        url = f"{BASE_URL}?path=/jogos/campeonato/{CAMPEONATO_ID}/rodada/{rodada}/fase"
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        data = r.json()

        blocos = data.get("jogos", [])
        seen = set()
        count = 0

        for bloco in blocos:
            partidas = bloco.get("jogo", [])
            if not isinstance(partidas, list):
                continue

            for jogo in partidas:
                try:
                    if not jogo.get("data"):
                        continue

                    date_iso = parse_date(jogo["data"])
                    day = day_of_week(date_iso)

                    home = normalize_team(jogo["mandante"]["nome"])
                    away = normalize_team(jogo["visitante"]["nome"])

                    key = f"{rodada}_{home}_{away}"
                    if key in seen:
                        continue
                    seen.add(key)

                    g_home = jogo["mandante"].get("gols")
                    g_away = jogo["visitante"].get("gols")

                    full_time = (
                        f"{g_home}-{g_away}"
                        if g_home not in (None, "", "-") and g_away not in (None, "", "-")
                        else None
                    )

                    rows.append({
                        "Matchday": rodada,
                        "Day": day,
                        "Date": date_iso,
                        "Home": home,
                        "Away": away,
                        "FullTime": full_time,
                        "HalfTime": None
                    })

                    count += 1

                except Exception:
                    continue

        print(f" {count} jogos capturados")

    return pd.DataFrame(rows, columns=COLS)

# ================= MAIN =================

if __name__ == "__main__":
    df_new = scrape_serie_b()

    if os.path.exists(ARQUIVO):
        df_local = pd.read_csv(ARQUIVO)
    else:
        df_local = pd.DataFrame(columns=COLS)

    def make_key(row):
        return (
            int(row["Matchday"]),
            row["Home"].strip(),
            row["Away"].strip()
        )

    local_index = {
        make_key(row): idx
        for idx, row in df_local.iterrows()
    }

    added = 0
    updated = 0

    for _, row in df_new.iterrows():
        key = make_key(row)

        if key in local_index:
            idx = local_index[key]

            if (
                (pd.isna(df_local.at[idx, "FullTime"]) or df_local.at[idx, "FullTime"] == "")
                and pd.notna(row["FullTime"])
            ):
                df_local.at[idx, "FullTime"] = row["FullTime"]
                df_local.at[idx, "HalfTime"] = row["HalfTime"]
                updated += 1
        else:
            df_local = pd.concat([df_local, pd.DataFrame([row])], ignore_index=True)
            added += 1

    df_local.to_csv(ARQUIVO, index=False)

    print(f"{updated} jogos atualizados")
    print(f"{added} jogos adicionados")
