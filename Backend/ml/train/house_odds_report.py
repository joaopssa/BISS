# Backend/ml/train/house_odds_report.py
# ------------------------------------------------------------
# Objetivo:
# - Percorrer TODOS os CSVs em Backend/data/matches/**.csv
# - Filtrar apenas jogos com odds pré-jogo completas (H/D/A)
# - Calcular:
#     * odd média por "posição" (H/D/A) do trio selecionado
#     * odd média do universo (todas as odds H/D/A juntas)
#     * odd média do favorito (menor odd do trio)
#     * probs implícitas médias (raw e normalizadas) + overround médio
# - Medir "assertividade da casa":
#     a casa "chuta" o resultado de MAIOR probabilidade (menor odd)
#     e acerta quando isso bate com o resultado real (1X2).
#
# Saída:
#   prints no console + CSV resumo em Backend/ml/train/house_odds_summary.csv
# ------------------------------------------------------------

import os
import re
import glob
from dataclasses import dataclass
from typing import Optional, Tuple, Dict

import pandas as pd


SCORE_RE = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*$")


def parse_score(s: str) -> Optional[Tuple[int, int]]:
    if not isinstance(s, str) or not s.strip():
        return None
    m = SCORE_RE.match(s.strip())
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def result_1x2(hg: int, ag: int) -> int:
    # 0=Home, 1=Draw, 2=Away
    if hg > ag:
        return 0
    if hg == ag:
        return 1
    return 2


def safe_float(x) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, float) and pd.isna(x):
        return None
    s = str(x).strip()
    if s == "" or s.lower() == "nan":
        return None
    try:
        return float(s.replace(",", "."))
    except Exception:
        return None


def implied_prob(odds: Optional[float]) -> Optional[float]:
    if odds is None:
        return None
    if odds <= 1e-9:
        return None
    return 1.0 / odds


def normalize_probs(ph, pd_, pa) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    # retorna (ph, pd, pa, overround) onde overround = soma - 1
    if ph is None or pd_ is None or pa is None:
        return None, None, None, None
    s = ph + pd_ + pa
    if s <= 1e-9:
        return None, None, None, None
    return ph / s, pd_ / s, pa / s, (s - 1.0)


def pick_odds_1x2(row: pd.Series) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Seleciona odds pré-jogo para H/D/A com prioridade:
      Pinnacle Close -> Pinnacle Open -> Avg Open -> Bet365 Open
    (mesma lógica do build_dataset.py)
    """
    oh = row.get("PinnacleHomeClose") or row.get("PinnacleHomeOpen") or row.get("AvgHomeOpen") or row.get("Bet365HomeOpen")
    od = row.get("PinnacleDrawClose") or row.get("PinnacleDrawOpen") or row.get("AvgDrawOpen") or row.get("Bet365DrawOpen")
    oa = row.get("PinnacleAwayClose") or row.get("PinnacleAwayOpen") or row.get("AvgAwayOpen") or row.get("Bet365AwayOpen")

    oh = safe_float(oh)
    od = safe_float(od)
    oa = safe_float(oa)

    # Odds válidas (evita lixo tipo 0, 1.0, etc)
    if oh is None or od is None or oa is None:
        return None, None, None
    if oh <= 1.01 or od <= 1.01 or oa <= 1.01:
        return None, None, None

    return oh, od, oa


def read_csv_robust(fp: str) -> Optional[pd.DataFrame]:
    # tenta leitura normal (vírgula), depois ;, depois auto sep (python)
    try:
        return pd.read_csv(fp)
    except Exception:
        pass
    try:
        return pd.read_csv(fp, sep=";")
    except Exception:
        pass
    try:
        return pd.read_csv(fp, sep=None, engine="python")
    except Exception:
        return None


@dataclass
class Stats:
    n_rows_read: int = 0
    n_rows_with_odds: int = 0
    n_rows_with_result: int = 0
    house_correct: int = 0

    # odds por posição do trio (média simples das odds selecionadas)
    sum_oh: float = 0.0
    sum_od: float = 0.0
    sum_oa: float = 0.0

    # universo (todas odds juntas)
    sum_odds_all: float = 0.0
    n_odds_all: int = 0

    # favorito (menor odd do trio)
    sum_fav_odds: float = 0.0
    n_fav: int = 0

    # probs implícitas raw por classe
    sum_iph: float = 0.0
    sum_ipd: float = 0.0
    sum_ipa: float = 0.0

    # universo (todas probs juntas)
    sum_ip_all: float = 0.0
    n_ip_all: int = 0

    # probs normalizadas (médias)
    sum_ph: float = 0.0
    sum_pd: float = 0.0
    sum_pa: float = 0.0

    sum_overround: float = 0.0
    n_norm: int = 0


def main():
    THIS_DIR = os.path.dirname(os.path.abspath(__file__))  # .../Backend/ml/train
    ML_DIR = os.path.abspath(os.path.join(THIS_DIR, ".."))  # .../Backend/ml
    BACKEND_DIR = os.path.abspath(os.path.join(ML_DIR, ".."))  # .../Backend

    MATCHES_ROOT = os.path.join(BACKEND_DIR, "data", "matches")

    # ✅ saída pedida (no train)
    OUT_SUMMARY = os.path.join(THIS_DIR, "house_odds_summary.csv")

    files = glob.glob(os.path.join(MATCHES_ROOT, "**", "*.csv"), recursive=True)
    if not files:
        raise FileNotFoundError(f"Nenhum CSV encontrado em: {MATCHES_ROOT}")

    stats = Stats()
    per_comp: Dict[str, Stats] = {}

    for fp in sorted(files):
        df = read_csv_robust(fp)
        if df is None or df.empty:
            continue

        if not {"Home", "Away", "Date"}.issubset(set(df.columns)):
            continue

        if "FullTime" not in df.columns:
            df["FullTime"] = None

        # garante colunas de odds
        needed_odds_cols = [
            "PinnacleHomeOpen", "PinnacleDrawOpen", "PinnacleAwayOpen",
            "AvgHomeOpen", "AvgDrawOpen", "AvgAwayOpen",
            "Bet365HomeOpen", "Bet365DrawOpen", "Bet365AwayOpen",
            "PinnacleHomeClose", "PinnacleDrawClose", "PinnacleAwayClose",
        ]
        for c in needed_odds_cols:
            if c not in df.columns:
                df[c] = None

        comp = os.path.relpath(fp, MATCHES_ROOT).split(os.sep)[0]
        if comp not in per_comp:
            per_comp[comp] = Stats()

        for _, r in df.iterrows():
            stats.n_rows_read += 1
            per_comp[comp].n_rows_read += 1

            oh, od, oa = pick_odds_1x2(r)
            if oh is None:
                continue

            stats.n_rows_with_odds += 1
            per_comp[comp].n_rows_with_odds += 1

            stats.sum_oh += oh
            stats.sum_od += od
            stats.sum_oa += oa
            per_comp[comp].sum_oh += oh
            per_comp[comp].sum_od += od
            per_comp[comp].sum_oa += oa

            stats.sum_odds_all += (oh + od + oa)
            stats.n_odds_all += 3
            per_comp[comp].sum_odds_all += (oh + od + oa)
            per_comp[comp].n_odds_all += 3

            fav = min(oh, od, oa)
            stats.sum_fav_odds += fav
            stats.n_fav += 1
            per_comp[comp].sum_fav_odds += fav
            per_comp[comp].n_fav += 1

            iph = implied_prob(oh)
            ipd = implied_prob(od)
            ipa = implied_prob(oa)

            if iph is not None and ipd is not None and ipa is not None:
                stats.sum_iph += iph
                stats.sum_ipd += ipd
                stats.sum_ipa += ipa
                per_comp[comp].sum_iph += iph
                per_comp[comp].sum_ipd += ipd
                per_comp[comp].sum_ipa += ipa

                stats.sum_ip_all += (iph + ipd + ipa)
                stats.n_ip_all += 3
                per_comp[comp].sum_ip_all += (iph + ipd + ipa)
                per_comp[comp].n_ip_all += 3

                ph, pd_, pa, over = normalize_probs(iph, ipd, ipa)
                if ph is not None and pd_ is not None and pa is not None and over is not None:
                    stats.sum_ph += ph
                    stats.sum_pd += pd_
                    stats.sum_pa += pa
                    stats.sum_overround += over
                    stats.n_norm += 1

                    per_comp[comp].sum_ph += ph
                    per_comp[comp].sum_pd += pd_
                    per_comp[comp].sum_pa += pa
                    per_comp[comp].sum_overround += over
                    per_comp[comp].n_norm += 1

            # assertividade da casa (precisa de placar)
            sc = parse_score(r.get("FullTime"))
            if sc is None:
                continue

            hg, ag = sc
            true_y = result_1x2(hg, ag)

            # casa "aposta" no maior prob = menor odd
            house_pick = min([(oh, 0), (od, 1), (oa, 2)], key=lambda t: t[0])[1]

            stats.n_rows_with_result += 1
            per_comp[comp].n_rows_with_result += 1

            if house_pick == true_y:
                stats.house_correct += 1
                per_comp[comp].house_correct += 1

    def summarize(s: Stats) -> Dict[str, float]:
        d: Dict[str, float] = {}

        if s.n_rows_with_odds > 0:
            d["mean_odd_home"] = s.sum_oh / s.n_rows_with_odds
            d["mean_odd_draw"] = s.sum_od / s.n_rows_with_odds
            d["mean_odd_away"] = s.sum_oa / s.n_rows_with_odds

        if s.n_odds_all > 0:
            d["mean_odd_universe"] = s.sum_odds_all / s.n_odds_all

        if s.n_fav > 0:
            d["mean_odd_favorite"] = s.sum_fav_odds / s.n_fav

        if s.n_rows_with_odds > 0:
            d["mean_imp_prob_home_raw"] = (s.sum_iph / s.n_rows_with_odds) if s.sum_iph else 0.0
            d["mean_imp_prob_draw_raw"] = (s.sum_ipd / s.n_rows_with_odds) if s.sum_ipd else 0.0
            d["mean_imp_prob_away_raw"] = (s.sum_ipa / s.n_rows_with_odds) if s.sum_ipa else 0.0

        if s.n_ip_all > 0:
            d["mean_imp_prob_universe_raw"] = s.sum_ip_all / s.n_ip_all

        if s.n_norm > 0:
            d["mean_prob_home_norm"] = s.sum_ph / s.n_norm
            d["mean_prob_draw_norm"] = s.sum_pd / s.n_norm
            d["mean_prob_away_norm"] = s.sum_pa / s.n_norm
            d["mean_overround"] = s.sum_overround / s.n_norm

        if s.n_rows_with_result > 0:
            d["house_accuracy"] = s.house_correct / s.n_rows_with_result

        return d

    total = summarize(stats)

    print("\n" + "=" * 90)
    print("[HOUSE ODDS] Resumo geral (todos os CSVs)")
    print("=" * 90)
    print(f"Arquivos varridos: {len(files)}")
    print(f"Linhas lidas: {stats.n_rows_read}")
    print(f"Jogos com odds 1x2 completas: {stats.n_rows_with_odds} ({(stats.n_rows_with_odds/max(1,stats.n_rows_read))*100:.1f}%)")
    print(f"Jogos com odds + resultado (FullTime): {stats.n_rows_with_result}")

    if stats.n_rows_with_odds == 0:
        print("\n[ERRO] Não encontrei jogos com odds 1x2 completas (H/D/A) usando as colunas padrão.")
        return

    if stats.n_rows_with_result > 0 and "house_accuracy" in total:
        print("\nAssertividade da casa (pick = maior prob / menor odd):")
        print(f" - Acertos: {stats.house_correct} / {stats.n_rows_with_result}")
        print(f" - Accuracy: {total['house_accuracy']*100:.2f}%")

    # -------------------------
    # Salva CSV resumo por competição/pasta
    # -------------------------
    rows = [{
        "competition_folder": "__ALL__",
        "rows_read": stats.n_rows_read,
        "rows_with_odds": stats.n_rows_with_odds,
        "rows_with_result": stats.n_rows_with_result,
        "house_correct": stats.house_correct,
        **total,
    }]

    for comp, st in sorted(per_comp.items(), key=lambda kv: kv[0]):
        if st.n_rows_with_odds == 0:
            continue
        summ = summarize(st)
        rows.append({
            "competition_folder": comp,
            "rows_read": st.n_rows_read,
            "rows_with_odds": st.n_rows_with_odds,
            "rows_with_result": st.n_rows_with_result,
            "house_correct": st.house_correct,
            **summ,
        })

    out_df = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(OUT_SUMMARY), exist_ok=True)
    out_df.to_csv(OUT_SUMMARY, index=False, encoding="utf-8")

    print("\n" + "-" * 90)
    print("[OK] CSV salvo em:", OUT_SUMMARY)
    print("-" * 90)


if __name__ == "__main__":
    main()
