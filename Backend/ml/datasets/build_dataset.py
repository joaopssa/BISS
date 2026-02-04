# Backend/ml/datasets/build_dataset.py

import os
import re
import glob
from dataclasses import dataclass
from typing import Dict, Tuple, Optional, List

import pandas as pd

# =========================
# Parsing de placar e data
# =========================

SCORE_RE = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*$")


def parse_score(s: str) -> Optional[Tuple[int, int]]:
    """Converte '2-1' -> (2,1). Retorna None se vazio/inválido."""
    if not isinstance(s, str) or not s.strip():
        return None
    m = SCORE_RE.match(s.strip())
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def safe_to_datetime(x) -> Optional[pd.Timestamp]:
    """Converte Date (YYYY-MM-DD) -> Timestamp. Retorna None se vazio/inválido."""
    if pd.isna(x) or str(x).strip() == "":
        return None
    dt = pd.to_datetime(x, format="%Y-%m-%d", errors="coerce")
    if pd.isna(dt):
        return None
    return dt


def result_1x2(hg: int, ag: int) -> int:
    """0=Home, 1=Draw, 2=Away."""
    if hg > ag:
        return 0
    if hg == ag:
        return 1
    return 2


# =========================
# Elo
# =========================

@dataclass
class EloConfig:
    base_elo: float = 1500.0
    k: float = 20.0
    home_adv: float = 60.0  # vantagem de casa para feature


def elo_expected(elo_a: float, elo_b: float) -> float:
    return 1.0 / (1.0 + 10 ** ((elo_b - elo_a) / 400.0))


def elo_update(elo_home: float, elo_away: float, outcome_home: float, cfg: EloConfig) -> Tuple[float, float]:
    """
    outcome_home: 1.0 (home win), 0.5 (draw), 0.0 (home loss)
    Atualiza Elo "real" (sem home_adv).
    """
    exp_home = elo_expected(elo_home, elo_away)
    exp_away = 1.0 - exp_home

    new_home = elo_home + cfg.k * (outcome_home - exp_home)
    new_away = elo_away + cfg.k * ((1.0 - outcome_home) - exp_away)
    return new_home, new_away


# =========================
# Forma (rolling)
# =========================

def points_from_result(target_1x2: int, is_home_team: bool) -> int:
    """
    Converte resultado em pontos para o time:
    - empate: 1
    - vitória: 3
    - derrota: 0
    """
    if target_1x2 == 1:
        return 1
    if (target_1x2 == 0 and is_home_team) or (target_1x2 == 2 and not is_home_team):
        return 3
    return 0


def rolling_sum(vals: List[int], n: int) -> float:
    if not vals:
        return 0.0
    return float(sum(vals[-n:]))


# =========================
# Helpers de arquivos
# =========================

def infer_season_from_filename(path: str) -> str:
    """
    Tenta inferir a temporada pelo nome do arquivo:
    - pega 2025_26 se existir
    - senão pega 2026 etc
    """
    fname = os.path.basename(path)
    m = re.search(r"(\d{4}_\d{2})", fname)
    if m:
        return m.group(1)
    m = re.search(r"(\d{4})", fname)
    return m.group(1) if m else "unknown"


def league_from_path(path: str, matches_root: str) -> str:
    """
    Pega o nome da liga pela pasta logo abaixo de matches_root:
    data/matches/<liga>/arquivo.csv -> <liga>
    """
    rel = os.path.relpath(path, matches_root)
    return rel.split(os.sep)[0]


# =========================
# Competição (por pasta) + Pool (igual H2H)
# =========================

FOLDER_TO_COMP = {
    "brasileirao-serie-a": "Brasileirão - Série A Betano",
    "brasileirao-serie-b": "Brasileirão - Série B",
    "copa-libertadores": "Copa Libertadores",

    "premier-league": "Premier League",
    "laliga": "La Liga",
    "serie-a-tim": "Série A",
    "bundesliga": "Bundesliga",
    "ligue1": "Ligue 1",

    # se existir no seu data/matches
    "liga-dos-campeoes": "Liga dos Campeões",
    "champions-league": "Liga dos Campeões",
}

# ✅ Só essas pastas entram no dataset (remove Copa do Mundo / Internacional etc)
ALLOWED_FOLDERS = set(FOLDER_TO_COMP.keys())

BRA_A = "Brasileirão - Série A Betano"
BRA_B = "Brasileirão - Série B"
LIB   = "Copa Libertadores"
UCL   = "Liga dos Campeões"
TOP5  = {"Ligue 1", "Bundesliga", "Série A", "La Liga", "Premier League"}


def competition_from_folder(folder: str) -> str:
    return FOLDER_TO_COMP.get(folder, folder)


def pool_key_for_comp(comp: str) -> str:
    """
    Retorna a 'chave do pool' que define onde Elo/Forma são compartilhados.
    - Brasil (A/B/Lib) compartilha tudo entre si
    - Champions compartilha com Top5 + Champions
    - Top5 compartilha com a própria liga + Champions (pool da liga)
    """
    c = (comp or "").strip()

    if c in {BRA_A, BRA_B, LIB}:
        return "POOL_BRASIL"

    if c == UCL:
        return "POOL_CHAMPIONS_TOP5"

    if c in TOP5:
        return f"POOL_{c.upper().replace(' ', '_')}+UCL"

    # fallback: pool próprio por competição
    return f"POOL_{c.upper().replace(' ', '_')}" if c else "POOL_UNKNOWN"


# =========================
# Builder principal
# =========================

def build_enriched_dataset(matches_root: str, out_csv: str, elo_cfg: EloConfig = EloConfig()) -> pd.DataFrame:
    files = glob.glob(os.path.join(matches_root, "**", "*.csv"), recursive=True)
    if not files:
        raise FileNotFoundError(f"Nenhum CSV encontrado em: {matches_root}")

    dfs = []
    used_files = 0
    skipped_folder = 0

    for fp in sorted(files):
        folder = league_from_path(fp, matches_root)

        # ✅ remove Copa do Mundo / Internacional / qualquer coisa fora do escopo
        if folder not in ALLOWED_FOLDERS:
            skipped_folder += 1
            continue

        try:
            df = pd.read_csv(fp)
        except Exception:
            continue

        # Checagem mínima
        required = {"Home", "Away", "Date"}
        if not required.issubset(set(df.columns)):
            continue

        if "FullTime" not in df.columns:
            df["FullTime"] = None
        if "HalfTime" not in df.columns:
            df["HalfTime"] = None

        df["league"] = folder
        df["competition"] = competition_from_folder(folder)
        df["pool_key"] = df["competition"].apply(pool_key_for_comp)
        df["season"] = infer_season_from_filename(fp)

        dfs.append(df)
        used_files += 1

    if not dfs:
        raise RuntimeError("Nenhum CSV válido encontrado (com colunas Home/Away/Date) nas pastas permitidas.")

    raw = pd.concat(dfs, ignore_index=True)

    # Parse Date e (FT) score
    raw["date"] = raw["Date"].apply(safe_to_datetime)
    ft_scores = raw["FullTime"].apply(parse_score)
    raw["ft_home_goals"] = ft_scores.apply(lambda x: x[0] if x else None)
    raw["ft_away_goals"] = ft_scores.apply(lambda x: x[1] if x else None)

    # Histórico: só jogos com date + placar
    hist = raw.dropna(subset=["date", "ft_home_goals", "ft_away_goals"]).copy()
    if hist.empty:
        raise RuntimeError("Não há jogos com Date + FullTime para gerar dataset.")

    hist["ft_home_goals"] = hist["ft_home_goals"].astype(int)
    hist["ft_away_goals"] = hist["ft_away_goals"].astype(int)

    # Target 1X2
    hist["target_1x2"] = hist.apply(lambda r: result_1x2(r["ft_home_goals"], r["ft_away_goals"]), axis=1)

    # ✅ Dedup APENAS de duplicatas reais (cópias), sem remover ida/volta:
    # Mesma competição + mesma data + mesmos times (mandante/visitante) + mesmo placar
    before = len(hist)
    hist = hist.drop_duplicates(
        subset=["competition", "date", "Home", "Away", "ft_home_goals", "ft_away_goals"],
        keep="first"
    ).copy()
    removed = before - len(hist)

    # Ordenação temporal (essencial para não vazar futuro)
    # pool_key define onde Elo/Forma são compartilhados
    hist = hist.sort_values(["pool_key", "date", "competition", "season"]).reset_index(drop=True)

    # Estados por pool_key (não misturar Elo/Forma entre pools)
    elo_state: Dict[Tuple[str, str], float] = {}            # (pool_key, team) -> elo real
    form_points: Dict[Tuple[str, str], List[int]] = {}      # (pool_key, team) -> últimos pontos
    form_gd: Dict[Tuple[str, str], List[int]] = {}          # (pool_key, team) -> últimos saldos

    def get_elo(pool_key: str, team: str) -> float:
        return float(elo_state.get((pool_key, team), elo_cfg.base_elo))

    def push_form(pool_key: str, team: str, pts: int, gd: int):
        key = (pool_key, team)
        form_points.setdefault(key, []).append(int(pts))
        form_gd.setdefault(key, []).append(int(gd))

        # guarda no máximo 30 jogos
        if len(form_points[key]) > 30:
            form_points[key] = form_points[key][-30:]
        if len(form_gd[key]) > 30:
            form_gd[key] = form_gd[key][-30:]

    enriched_rows: List[dict] = []

    for _, r in hist.iterrows():
        pool_key = str(r["pool_key"])
        home = str(r["Home"])
        away = str(r["Away"])

        # Elo pré-jogo (para feature, aplicamos home_adv no mandante)
        elo_home_pre = get_elo(pool_key, home) + elo_cfg.home_adv
        elo_away_pre = get_elo(pool_key, away)
        elo_diff = elo_home_pre - elo_away_pre

        # Forma pré-jogo
        hp = form_points.get((pool_key, home), [])
        ap = form_points.get((pool_key, away), [])
        hgd = form_gd.get((pool_key, home), [])
        agd = form_gd.get((pool_key, away), [])

        # Features adicionais: forma e consistência
        form_avg_home = rolling_sum(hp, 5) / 5.0 if len(hp) >= 5 else 0
        form_avg_away = rolling_sum(ap, 5) / 5.0 if len(ap) >= 5 else 0
        gd_avg_home = rolling_sum(hgd, 5) / 5.0 if len(hgd) >= 5 else 0
        gd_avg_away = rolling_sum(agd, 5) / 5.0 if len(agd) >= 5 else 0
        
        # Momentum: diferença entre últimos 3 e últimos 5
        momentum_home = rolling_sum(hp, 3) - rolling_sum(hp, 5) if len(hp) >= 5 else 0
        momentum_away = rolling_sum(ap, 3) - rolling_sum(ap, 5) if len(ap) >= 5 else 0
        
        # Consistência: desvio padrão dos últimos 5 (quanto mais alto, menos consistente)
        import statistics
        consistency_home = statistics.stdev(hp[-5:]) if len(hp) >= 5 else 0
        consistency_away = statistics.stdev(ap[-5:]) if len(ap) >= 5 else 0

        row = {
            "pool_key": pool_key,
            "competition": r.get("competition", r.get("league")),
            "season": r["season"],
            "date": r["date"].strftime("%Y-%m-%d"),
            "home": home,
            "away": away,
            "ft_home_goals": int(r["ft_home_goals"]),
            "ft_away_goals": int(r["ft_away_goals"]),
            "target_1x2": int(r["target_1x2"]),
            "elo_home_pre": float(elo_home_pre),
            "elo_away_pre": float(elo_away_pre),
            "elo_diff": float(elo_diff),
            "form_pts_home_3": rolling_sum(hp, 3),
            "form_pts_home_5": rolling_sum(hp, 5),
            "form_pts_away_3": rolling_sum(ap, 3),
            "form_pts_away_5": rolling_sum(ap, 5),
            "gd_home_5": rolling_sum(hgd, 5),
            "gd_away_5": rolling_sum(agd, 5),
            "form_avg_home_5": float(form_avg_home),
            "form_avg_away_5": float(form_avg_away),
            "gd_avg_home_5": float(gd_avg_home),
            "gd_avg_away_5": float(gd_avg_away),
            "momentum_home": float(momentum_home),
            "momentum_away": float(momentum_away),
            "consistency_home": float(consistency_home),
            "consistency_away": float(consistency_away),
        }

        enriched_rows.append(row)

        # Outcome para Elo update
        if row["target_1x2"] == 0:
            outcome_home = 1.0
        elif row["target_1x2"] == 1:
            outcome_home = 0.5
        else:
            outcome_home = 0.0

        # Atualiza Elo "real" (sem home_adv)
        elo_home_real = get_elo(pool_key, home)
        elo_away_real = get_elo(pool_key, away)
        new_home, new_away = elo_update(elo_home_real, elo_away_real, outcome_home, elo_cfg)
        elo_state[(pool_key, home)] = new_home
        elo_state[(pool_key, away)] = new_away

        # Atualiza forma
        pts_home = points_from_result(row["target_1x2"], is_home_team=True)
        pts_away = points_from_result(row["target_1x2"], is_home_team=False)
        gd_home = row["ft_home_goals"] - row["ft_away_goals"]
        gd_away = -gd_home

        push_form(pool_key, home, pts_home, gd_home)
        push_form(pool_key, away, pts_away, gd_away)

    out_df = pd.DataFrame(enriched_rows)

    # Garante pasta de saída
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    out_df.to_csv(out_csv, index=False, encoding="utf-8")

    print(f"[OK] CSVs lidos (pastas permitidas): {used_files}")
    print(f"[OK] Arquivos ignorados (fora do escopo): {skipped_folder}")
    print(f"[OK] Duplicatas reais removidas: {removed}")
    print(f"[OK] Dataset enriquecido: {len(out_df)} linhas")
    print(f"[OK] Salvo em: {out_csv}")

    return out_df


if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # .../Backend/ml/datasets
    BACKEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))  # .../Backend

    MATCHES_ROOT = os.path.join(BACKEND_DIR, "data", "matches")
    OUT_CSV = os.path.join(BACKEND_DIR, "ml", "processed", "matches_enriched.csv")

    df = build_enriched_dataset(MATCHES_ROOT, OUT_CSV, EloConfig())
    print(df.head(10))
