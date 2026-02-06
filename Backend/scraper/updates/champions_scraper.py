# Backend/scraper/updates/champions_ge.py

import os
import re
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime
from playwright.sync_api import sync_playwright

# ================= CONFIG =================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CAMINHO_RAIZ = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "data", "matches", "champions")
)

ARQUIVO = os.path.join(CAMINHO_RAIZ, "champions_2025_26.csv")

COLS = [
    "Matchday",   # aqui vira "Stage" quando for mata-mata
    "Day",
    "Date",
    "Home",
    "Away",
    "FullTime",
    "HalfTime",
    "Penalties",
]

BASE_URL = "https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/"

# ================= TEAM MAP (opcional) =================
# Use só se você quiser padronizar nomes para o seu padrão interno.
TEAM_MAP_CHAMPIONS_GE = {
    "PSG": "Paris Saint Germain",
    "Paris Saint-Germain": "Paris Saint Germain",
    "Atlético de Madrid": "Atlético de Madrid",
    "Internazionale": "Inter de Milão",
    "Benfica": "SL Benfica",
    "Bayer Leverkusen": "Bayer Leverkusen",
    "Bodö/Glimt": "FK Bodo/Glimt",
    "Qarabag":"Qarabağ FK",
    "Juventus":"Juventus FC",
    "Club Brugge":"Club Brugge KV",
    "Newcastle":"Newcastle United",
    # ... adicione o que fizer sentido no seu projeto
}

# ================= AUX =================

def find_system_chrome_exe() -> str:
    candidates = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return ""

def safe_text(el) -> str:
    if not el:
        return ""
    return el.get_text(strip=True) or ""

def day_of_week(date_iso: str) -> str:
    return datetime.strptime(date_iso, "%Y-%m-%d").strftime("%a")

def normalize_team(name: str) -> str:
    if not name:
        return name
    n = name.strip()
    return TEAM_MAP_CHAMPIONS_GE.get(n, n)

def is_score_like(s: str) -> bool:
    return bool(re.fullmatch(r"\d{1,2}", (s or "").strip()))

def extract_stage_label_from_soup(soup: BeautifulSoup) -> str:
    # No print do GE aparece:
    # <span class="navegacao-fase__fase">Playoffs de oitavas de final</span>
    span = soup.select_one("span.navegacao-fase__fase")
    t = safe_text(span)
    return t if t else "Champions League"

def extract_team_name(team_box) -> str:
    if not team_box:
        return ""

    meta = team_box.select_one('meta[itemprop="name"]')
    if meta and meta.get("content"):
        return meta.get("content").strip()

    # tenta vários fallbacks comuns
    for sel in [
        ".placar__equipes--nome",
        ".placar__equipes-nome",
        "span.nome",
        "strong",
        "span",
    ]:
        el = team_box.select_one(sel)
        t = safe_text(el)
        if t and not is_score_like(t):
            return t

    t = safe_text(team_box)
    return t

def parse_placares(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    stage = extract_stage_label_from_soup(soup)

    rows = []
    for p in soup.select("div.placar"):
        try:
            home_box = p.select_one("div.placar__equipes--mandante")
            away_box = p.select_one("div.placar__equipes--visitante")

            home_raw = extract_team_name(home_box)
            away_raw = extract_team_name(away_box)

            # Se GE ainda não tiver time (raro), vira N.N.
            home_raw = home_raw.strip() if home_raw else "N.N."
            away_raw = away_raw.strip() if away_raw else "N.N."

            date_meta = p.select_one('meta[itemprop="startDate"]')
            date_iso = (date_meta.get("content") if date_meta else "").strip()
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_iso):
                continue

            ft_home = safe_text(p.select_one("span.placar-box__valor--mandante"))
            ft_away = safe_text(p.select_one("span.placar-box__valor--visitante"))

            full_time = None
            if is_score_like(ft_home) and is_score_like(ft_away):
                full_time = f"{ft_home}-{ft_away}"

            rows.append({
                "Matchday": stage,
                "Day": day_of_week(date_iso),
                "Date": date_iso,
                "Home": normalize_team(home_raw),
                "Away": normalize_team(away_raw),
                "FullTime": full_time,
                "HalfTime": None,
                "Penalties": None,
            })
        except Exception:
            continue

    return rows

# ================= SCRAPER (Playwright) =================

def scrape_champions_ge():
    os.makedirs(CAMINHO_RAIZ, exist_ok=True)

    all_rows = []
    seen_phase_signatures = set()

    with sync_playwright() as p:
        chrome_exe = find_system_chrome_exe()
        if not chrome_exe:
            raise RuntimeError(
                "Não achei chrome.exe/msedge.exe no Windows. "
                "Instale Google Chrome ou Microsoft Edge."
            )

        browser = p.chromium.launch(
            headless=True,
            executable_path=chrome_exe,
            args=["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
        )

        page = browser.new_page()
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(1500)

        try:
            page.wait_for_selector("div.placar, nav.navegacao-fase", timeout=30000)
        except Exception:
            pass

        right_click_targets = [
            "span.navegacao-fase__seta-direita",
            ".navegacao-fase__seta-direita",
            ".navegacao-fase__setas--direita",
            ".navegacao-fase__setas-ativa .navegacao-fase__seta-direita",
            ".navegacao-fase__setas-ativa",
        ]

        def get_stage_text():
            loc = page.locator("span.navegacao-fase__fase")
            if loc.count() == 0:
                return ""
            return loc.first.inner_text().strip()

        page.wait_for_timeout(1200)

        for _ in range(60):
            page.wait_for_timeout(800)

            html = page.content()
            rows = parse_placares(html)
            all_rows.extend(rows)

            prev_stage = get_stage_text()
            signature = (prev_stage, len(rows))
            if signature in seen_phase_signatures:
                break
            seen_phase_signatures.add(signature)

            clicked = False
            for sel in right_click_targets:
                try:
                    loc = page.locator(sel)
                    if loc.count() == 0:
                        continue
                    loc.first.click(timeout=1500)
                    clicked = True
                    break
                except Exception:
                    continue

            if not clicked:
                break

            changed = False
            for _w in range(20):
                page.wait_for_timeout(250)
                cur_stage = get_stage_text()
                if cur_stage and cur_stage != prev_stage:
                    changed = True
                    break

            if not changed:
                break

        browser.close()

    df = pd.DataFrame(all_rows, columns=COLS)
    if not df.empty:
        df.drop_duplicates(subset=["Matchday", "Date", "Home", "Away"], inplace=True)

    print(f"Total de jogos encontrados (somando fases): {len(df)}")
    return df

# ================= UPSERT (preenche N.N. por data/fase/ordem) =================

def ensure_cols(df: pd.DataFrame) -> pd.DataFrame:
    for c in COLS:
        if c not in df.columns:
            df[c] = ""
    # padroniza tudo como string/obj para evitar dtype pandas string quebrando update
    for c in ["Matchday", "Day", "Date", "Home", "Away", "FullTime", "HalfTime", "Penalties"]:
        df[c] = df[c].astype(str).replace({"nan": "", "None": ""})
    return df

def add_slot_key(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cria uma chave estável por (Date, Matchday, slot).
    O slot é a ordem das partidas naquele dia e naquela fase.
    """
    df = df.copy()

    # NÃO ordene o local (preserva ordem do arquivo)
    # ordena o novo levemente só pra estabilidade (não muda muito pois GE já vem na ordem)
    # mas vamos manter como está e só calcular o slot por groupby/cumcount
    df["__slot__"] = df.groupby(["Date", "Matchday"], sort=False).cumcount().astype(int)

    df["__key__"] = (
        df["Date"].astype(str) + "_" +
        df["Matchday"].astype(str) + "_" +
        df["__slot__"].astype(str)
    )
    return df

def update_csv():
    df_new = scrape_champions_ge()
    if os.path.exists(ARQUIVO):
        df_local = pd.read_csv(ARQUIVO)
    else:
        df_local = pd.DataFrame(columns=COLS)

    df_new = ensure_cols(df_new)
    df_local = ensure_cols(df_local)

    # limpa lixo do local
    df_local = df_local[df_local["Date"].astype(str).str.strip() != ""].copy()

    # cria key por (Date, Matchday, slot)
    df_new_k = add_slot_key(df_new)
    df_local_k = add_slot_key(df_local)

    df_new_k.set_index("__key__", inplace=True)
    df_local_k.set_index("__key__", inplace=True)

    # garante que não vamos apagar placar com vazio
    def pick_non_empty(new_val: str, old_val: str) -> str:
        nv = (new_val or "").strip()
        ov = (old_val or "").strip()
        return nv if nv else ov

    # UPSERT controlado: preenche N.N. e atualiza FullTime quando existir
    for key in df_new_k.index:
        if key not in df_local_k.index:
            continue

        # HOME/AWAY: se local for N.N. ou vazio, troca pelo do GE
        for col in ["Home", "Away", "Day", "Date", "Matchday"]:
            nv = df_new_k.at[key, col]
            ov = df_local_k.at[key, col]
            if col in ["Home", "Away"]:
                if (ov.strip() == "" or ov.strip().upper() == "N.N.") and nv.strip() and nv.strip().upper() != "N.N.":
                    df_local_k.at[key, col] = nv
            else:
                df_local_k.at[key, col] = pick_non_empty(nv, ov)

        # placar: só escreve se GE trouxe placar
        nv_ft = df_new_k.at[key, "FullTime"]
        ov_ft = df_local_k.at[key, "FullTime"]
        df_local_k.at[key, "FullTime"] = pick_non_empty(nv_ft, ov_ft)

        # mantemos HT/Penalties vazios (se você quiser evoluir depois)
        # df_local_k.at[key, "HalfTime"] = ""
        # df_local_k.at[key, "Penalties"] = ""

    # insere chaves novas
    df_to_add = df_new_k[~df_new_k.index.isin(df_local_k.index)]
    df_final = pd.concat([df_local_k, df_to_add], axis=0)

    # remove colunas auxiliares e volta
    df_final.reset_index(drop=True, inplace=True)
    if "__slot__" in df_final.columns:
        df_final.drop(columns=["__slot__"], inplace=True, errors="ignore")
    if "__key__" in df_final.columns:
        df_final.drop(columns=["__key__"], inplace=True, errors="ignore")

    # limpeza final
    df_final = ensure_cols(df_final)
    df_final = df_final[df_final["Date"].astype(str).str.strip() != ""]
    df_final = df_final[df_final["Home"].astype(str).str.strip() != ""]
    df_final = df_final[df_final["Away"].astype(str).str.strip() != ""]

    # ordena minimamente
    df_final.sort_values(by=["Date", "Matchday", "Home"], inplace=True, kind="mergesort")
    df_final.reset_index(drop=True, inplace=True)

    os.makedirs(CAMINHO_RAIZ, exist_ok=True)
    df_final.to_csv(ARQUIVO, index=False)
    print("CSV sincronizado com sucesso (mata-mata preenchido, sem duplicações por N.N.).")

if __name__ == "__main__":
    update_csv()
