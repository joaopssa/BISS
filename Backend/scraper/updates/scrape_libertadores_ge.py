# Backend/scraper/updates/scrape_libertadores_ge.py

import os
import re
import time
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime

from playwright.sync_api import sync_playwright


# ================= CONFIG =================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CAMINHO_RAIZ = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "data", "matches", "libertadores")
)

ARQUIVO = os.path.join(CAMINHO_RAIZ, "libertadores_2026.csv")

COLS = [
    "Matchday",   # vamos usar como "Stage" (Primeira fase, etc.)
    "Day",
    "Date",
    "Home",
    "Away",
    "FullTime",
    "HalfTime",
    "Penalties",
]

BASE_URL = "https://ge.globo.com/futebol/libertadores/"

# ================= TEAM MAP =================

TEAM_MAP_LIBERTADORES = {
    "The Strongest": "The Strongest",
    "Deportivo Táchira": "Deportivo Tachira",
    "Juventud": "Juventud de Las Piedras",
    "Universidad de Quito": "Universidad Catolica Ecuador",
    "Alianza Lima": "Alianza Lima",
    "2 de Mayo": "2 de Mayo",
    "Liverpool-URU": "Liverpool Montevideo",
    "Guaraní-PAR": "Guarani Asuncion",
    "Tolima": "Deportes Tolima",
    "O'Higgins": "O'Higgins",
    "Bahia": "Bahia",
    "Sporting Cristal": "Sporting Cristal",
    "Botafogo-RJ": "Botafogo",
    "Nacional Potosí": "CA Nacional Potosi",
    "Barcelona de Guayaquil": "Barcelona Guayaquil",
    "Argentinos Juniors": "Argentinos Juniors",
    "Carabobo": "Carabobo",
    "Huachipato": "Huachipato",
}

# ================= AUX =================

def find_system_chrome_exe() -> str:
    """
    Tenta encontrar o chrome.exe já instalado no Windows.
    """
    candidates = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        # Edge também funciona com playwright.chromium
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return ""

def normalize_team(name: str) -> str:
    if not name:
        return name
    n = name.strip()
    return TEAM_MAP_LIBERTADORES.get(n, n)

def day_of_week(date_iso: str) -> str:
    return datetime.strptime(date_iso, "%Y-%m-%d").strftime("%a")

def safe_text(el) -> str:
    if not el:
        return ""
    return el.get_text(strip=True) or ""

def is_score_like(s: str) -> bool:
    return bool(re.fullmatch(r"\d{1,2}", (s or "").strip()))

def extract_stage_label_from_soup(soup: BeautifulSoup) -> str:
    # pelo seu print:
    # <span class="navegacao-fase__fase">Primeira fase</span>
    span = soup.select_one("span.navegacao-fase__fase")
    t = safe_text(span)
    return t if t else "Libertadores"


def parse_placares(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    stage = extract_stage_label_from_soup(soup)

    rows = []
    for p in soup.select("div.placar"):
        try:
            home_box = p.select_one("div.placar__equipes--mandante")
            away_box = p.select_one("div.placar__equipes--visitante")

            def extract_team_name(team_box):
                if not team_box:
                    return ""
                # 1) tenta o meta (quando existir)
                meta = team_box.select_one('meta[itemprop="name"]')
                if meta and meta.get("content"):
                    return meta.get("content").strip()

                # 2) fallback: tenta texto visível (nome do time)
                # no GE, normalmente tem algo como span com nome do time
                # a gente tenta algumas classes comuns e, se falhar, pega o texto geral do bloco
                for sel in [
                    ".placar__equipes--nome",       # algumas variações
                    ".placar__equipes-nome",
                    "span.nome",
                    "strong",
                    "span",
                ]:
                    el = team_box.select_one(sel)
                    t = safe_text(el)
                    if t and not is_score_like(t):
                        return t

                # 3) último recurso: texto do bloco (limpo)
                t = safe_text(team_box)
                return t

            home_raw = extract_team_name(home_box)
            away_raw = extract_team_name(away_box)

            # AGORA NÃO EXCLUI placeholders
            if not home_raw or not away_raw:
                # se mesmo assim não achou, ignora
                continue

            date_meta = p.select_one('meta[itemprop="startDate"]')
            date_iso = (date_meta.get("content") if date_meta else "").strip()
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_iso):
                continue

            # FullTime vem do placar (quando existir número)
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
                "HalfTime": None,    # SEMPRE None
                "Penalties": None,   # SEMPRE None
            })
        except Exception:
            continue

    return rows


# ================= SCRAPER (Playwright) =================

def scrape_libertadores():
    os.makedirs(CAMINHO_RAIZ, exist_ok=True)

    all_rows = []
    seen_phase_signatures = set()

    with sync_playwright() as p:
        chrome_exe = find_system_chrome_exe()
        if not chrome_exe:
            raise RuntimeError(
                "Não achei chrome.exe/msedge.exe no Windows. "
                "Instale Google Chrome ou Microsoft Edge, ou informe o caminho manualmente."
            )

        browser = p.chromium.launch(
            headless=True,
            executable_path=chrome_exe,
            args=[
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        page = browser.new_page()

        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)

        # espera a navegação/fases ou ao menos a estrutura base
        page.wait_for_timeout(1500)

        # se existir placar, esperamos; se não existir ainda, seguimos mesmo
        # (mas no seu caso EXISTE no browser)
        try:
            page.wait_for_selector("div.placar, section#classificacao_wrapper, nav.navegacao-fase", timeout=30000)
        except Exception:
            pass

        # Vamos iterar fases clicando na seta-direita até parar de mudar
        # Setores (de acordo com seu print):
        # .navegacao-fase__seta-direita  (quando ativa tem classe navecacao-fase__setas-ativa)
        right_arrow = "span.navegacao-fase__seta-direita"

        right_click_targets = [
            "span.navegacao-fase__seta-direita",
            ".navegacao-fase__seta-direita",
            ".navegacao-fase__setas--direita",
            ".navegacao-fase__setas-ativa .navegacao-fase__seta-direita",
            ".navegacao-fase__setas-ativa",  # às vezes o clique é no container ativo
        ]

        def get_stage_text():
            # pega texto direto do DOM (mais confiável do que reparsear soup)
            loc = page.locator("span.navegacao-fase__fase")
            if loc.count() == 0:
                return ""
            t = loc.first.inner_text().strip()
            return t

        # força carregar placares da primeira fase visível
        page.wait_for_timeout(1200)

        for _ in range(50):  # bastante para percorrer todas as fases
            page.wait_for_timeout(800)

            html = page.content()
            rows = parse_placares(html)
            all_rows.extend(rows)

            prev_stage = get_stage_text()

            # evita loop infinito: usa stage + contagem de rows
            signature = (prev_stage, len(rows))
            if signature in seen_phase_signatures:
                break
            seen_phase_signatures.add(signature)

            # tenta clicar para avançar fase
            clicked = False
            for sel in right_click_targets:
                try:
                    loc = page.locator(sel)
                    if loc.count() == 0:
                        continue
                    # tenta clicar no primeiro que existir
                    loc.first.click(timeout=1500)
                    clicked = True
                    break
                except Exception:
                    continue

            if not clicked:
                break

            # espera a fase mudar DE VERDADE
            changed = False
            for _w in range(20):
                page.wait_for_timeout(250)
                cur_stage = get_stage_text()
                if cur_stage and cur_stage != prev_stage:
                    changed = True
                    break

            if not changed:
                # se não mudou, acabou
                break


        browser.close()

    df = pd.DataFrame(all_rows, columns=COLS)
    if not df.empty:
        df.drop_duplicates(subset=["Matchday", "Date", "Home", "Away"], inplace=True)

    print(f"Total de jogos encontrados (somando fases/páginas): {len(df)}")
    return df


# ================= UPDATE CSV =================

def update_csv():
    df_new = scrape_libertadores()

    if os.path.exists(ARQUIVO):
        df_local = pd.read_csv(ARQUIVO)
    else:
        df_local = pd.DataFrame(columns=COLS)

        # ===== LIMPEZA DO CSV LOCAL (remove linhas lixo/nan) =====
    if not df_local.empty:
        # garante colunas
        for c in COLS:
            if c not in df_local.columns:
                df_local[c] = ""

        # remove linhas totalmente vazias / nan
        df_local = df_local.fillna("")
        df_local = df_local[df_local["Date"].astype(str).str.strip() != ""]
        df_local = df_local[df_local["Home"].astype(str).str.strip() != ""]
        df_local = df_local[df_local["Away"].astype(str).str.strip() != ""]


    if df_new.empty and df_local.empty:
        print("Nenhum jogo encontrado (normal em fases futuras sem jogos).")
        return

    def build_key(df: pd.DataFrame) -> pd.Series:
        for c in ["Matchday", "Date", "Home", "Away"]:
            if c not in df.columns:
                df[c] = ""
            df[c] = df[c].astype(str).fillna("")
        return df["Date"] + "_" + df["Home"] + "_" + df["Away"] + "_" + df["Matchday"]

    df_new["__key__"] = build_key(df_new)
    df_local["__key__"] = build_key(df_local)

    df_new.set_index("__key__", inplace=True)
    df_local.set_index("__key__", inplace=True)

    # UPSERT seguro: não apaga FullTime com vazio
    if not df_new.empty and not df_local.empty:
        for col in ["Matchday", "Day", "Date", "Home", "Away"]:
            if col in df_new.columns:
                df_local[col] = df_local[col].where(df_new[col].isna(), df_new[col])

        if "FullTime" in df_new.columns:
            new_ft = df_new["FullTime"]
            df_local["FullTime"] = df_local["FullTime"].where(
                new_ft.isna() | (new_ft.astype(str).str.strip() == ""),
                new_ft
            )

        df_local["HalfTime"] = None
        df_local["Penalties"] = None

    df_final = pd.concat([df_local, df_new[~df_new.index.isin(df_local.index)]])
    df_final.reset_index(drop=True, inplace=True)

    df_final["Matchday"] = df_final["Matchday"].astype(str).str.replace(r"\.0$", "", regex=True)

    if "Date" in df_final.columns:
        df_final.sort_values(by=["Date", "Matchday", "Home"], inplace=True, kind="mergesort")
        df_final.reset_index(drop=True, inplace=True)

        # ===== LIMPEZA FINAL =====
    df_final = df_final.fillna("")
    df_final = df_final[df_final["Date"].astype(str).str.strip() != ""]
    df_final = df_final[df_final["Home"].astype(str).str.strip() != ""]
    df_final = df_final[df_final["Away"].astype(str).str.strip() != ""]

    df_final.to_csv(ARQUIVO, index=False)
    print("CSV sincronizado com sucesso (sem duplicações).")


if __name__ == "__main__":
    update_csv()
