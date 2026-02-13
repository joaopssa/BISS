# Backend/ml/prediction/predict_from_betano_odds.py
# ------------------------------------------------------------
# Output (colunas, na ordem):
# campeonato,casa,fora,odds_h,odds_a,odds_d,
# betano_ph,betano_pa,betano_pd,betano_overround,
# ai_ph,ai_pd,ai_pa,ai_pick_label,ai_confidence_pct,ai_bucket,score_estimated
#
# Obs:
# - probs e overround saem em porcentagem (0-100), com 1 casa decimal
# - odds também saem com 1 casa decimal
# ------------------------------------------------------------

import os
import math
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
import json
from typing import Optional, Tuple

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.abspath(os.path.join(THIS_DIR, ".."))
BACKEND_DIR = os.path.abspath(os.path.join(ML_DIR, ".."))

DEFAULT_ODDS_CSV = os.path.join(BACKEND_DIR, "data", "odds_betano_final.csv")
MODELS_DIR = os.path.join(ML_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "xgb_1x2.json")
COLS_PATH = os.path.join(MODELS_DIR, "xgb_1x2_columns.pkl")
ELO_STATE_PATH = os.path.join(ML_DIR, "datasets", "elo_ratings.json")

OUT_CSV = os.path.join(THIS_DIR, "predictions_betano.csv")

BRA_A = "Brasileirão - Série A Betano"
BRA_B = "Brasileirão - Série B"
LIB   = "Copa Libertadores"
UCL   = "Liga dos Campeões"
TOP5  = {"Ligue 1", "Bundesliga", "Série A", "La Liga", "Premier League"}

def pool_key_for_comp(comp: str) -> str:
    c = (comp or "").strip()
    if c in {BRA_A, BRA_B, LIB}:
        return "POOL_BRASIL"
    if c == UCL:
        return "POOL_CHAMPIONS_TOP5"
    if c in TOP5:
        return f"POOL_{c.upper().replace(' ', '_')}+UCL"
    return f"POOL_{c.upper().replace(' ', '_')}" if c else "POOL_UNKNOWN"

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
    if odds is None or odds <= 1e-9:
        return None
    return 1.0 / odds

def normalize_probs(ph, pd_, pa) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    if ph is None or pd_ is None or pa is None:
        return None, None, None, None
    s = ph + pd_ + pa
    if s <= 1e-9:
        return None, None, None, None
    return ph / s, pd_ / s, pa / s, (s - 1.0)

def entropy_1x2(ph, pd_, pa) -> float:
    for v in (ph, pd_, pa):
        if v is None or (isinstance(v, float) and np.isnan(v)) or v <= 0:
            return np.nan
    s = float(ph + pd_ + pa)
    if s <= 0:
        return np.nan
    ph2, pd2, pa2 = float(ph) / s, float(pd_) / s, float(pa) / s
    return -(ph2 * math.log(ph2) + pd2 * math.log(pd2) + pa2 * math.log(pa2))

def load_elo_state(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f) or {}
    except Exception:
        return {}

def get_elo(elo_state: dict, pool_key: str, team: str, base=1500.0) -> float:
    try:
        v = elo_state.get(pool_key, {}).get(team, None)
        return float(v) if v is not None else float(base)
    except Exception:
        return float(base)

def confidence_bucket(conf: float) -> str:
    if conf >= 0.70:
        return "ALTA"
    if conf >= 0.57:
        return "MÉDIA"
    return "BAIXA"

def estimate_score(ph, pd_, pa, elo_diff=0.0, p_over25=None):
    base_total = 2.55
    total = base_total
    total = max(1.6, min(3.4, total + 0.0015 * float(elo_diff)))

    if ph is None or pa is None:
        ph = 0.34
        pa = 0.33

    ph = max(1e-6, float(ph))
    pa = max(1e-6, float(pa))
    strength = math.log(ph / pa)

    share_home = 0.50 + 0.18 * math.tanh(strength)
    share_home = max(0.33, min(0.67, share_home))

    lam_h = total * share_home
    lam_a = total * (1.0 - share_home)

    gh = int(round(lam_h))
    ga = int(round(lam_a))

    gh = max(0, min(5, gh))
    ga = max(0, min(5, ga))
    return gh, ga

def _to_pct_1d(x):
    """decimal -> porcentagem com 1 casa (ex: 0.305 -> 30.5). Mantém NaN."""
    if x is None:
        return np.nan
    try:
        if isinstance(x, float) and np.isnan(x):
            return np.nan
        return round(float(x) * 100.0, 1)
    except Exception:
        return np.nan

def _round_1d(x):
    """arredonda numérico p/ 1 casa (mantém NaN)."""
    try:
        if x is None:
            return np.nan
        if isinstance(x, float) and np.isnan(x):
            return np.nan
        return round(float(x), 1)
    except Exception:
        return np.nan

def main():
    odds_csv = os.getenv("BETANO_CSV_PATH", DEFAULT_ODDS_CSV)
    odds_csv = os.path.abspath(odds_csv)

    if not os.path.exists(odds_csv):
        raise FileNotFoundError(f"Não encontrei odds CSV em: {odds_csv}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Modelo não encontrado: {MODEL_PATH}")
    if not os.path.exists(COLS_PATH):
        raise FileNotFoundError(f"Colunas do modelo não encontradas: {COLS_PATH}")

    df = pd.read_csv(odds_csv)

    df = df[df["mercado"].astype(str).str.upper().eq("1X2")].copy()
    if df.empty:
        raise RuntimeError("CSV não tem linhas mercado=1X2.")

    key_cols = ["campeonato", "casa", "fora", "data_hora"]
    df["selecao"] = df["selecao"].astype(str).str.strip().str.upper()

    piv = df.pivot_table(
        index=key_cols,
        columns="selecao",
        values="odd",
        aggfunc="last"
    ).reset_index()

    piv = piv.rename(columns={"1": "odds_h", "X": "odds_d", "2": "odds_a"})
    for c in ["odds_h", "odds_d", "odds_a"]:
        if c not in piv.columns:
            piv[c] = np.nan

    piv["odds_h"] = piv["odds_h"].apply(safe_float)
    piv["odds_d"] = piv["odds_d"].apply(safe_float)
    piv["odds_a"] = piv["odds_a"].apply(safe_float)

    piv["ip_h_raw"] = piv["odds_h"].apply(implied_prob)
    piv["ip_d_raw"] = piv["odds_d"].apply(implied_prob)
    piv["ip_a_raw"] = piv["odds_a"].apply(implied_prob)

    ph_list, pd_list, pa_list, ov_list = [], [], [], []
    for iph, ipd, ipa in zip(piv["ip_h_raw"].values, piv["ip_d_raw"].values, piv["ip_a_raw"].values):
        ph, pd_, pa, over = normalize_probs(iph, ipd, ipa)
        ph_list.append(ph); pd_list.append(pd_); pa_list.append(pa); ov_list.append(over)

    piv["betano_ph"] = ph_list
    piv["betano_pd"] = pd_list
    piv["betano_pa"] = pa_list
    piv["betano_overround"] = ov_list

    piv["pool_key"] = piv["campeonato"].apply(pool_key_for_comp)

    elo_state = load_elo_state(ELO_STATE_PATH)
    HOME_ADV = 60.0
    BASE_ELO = 1500.0

    piv["elo_home_pre"] = [
        get_elo(elo_state, str(pk), str(home), base=BASE_ELO) + HOME_ADV
        for pk, home in zip(piv["pool_key"].values, piv["casa"].values)
    ]
    piv["elo_away_pre"] = [
        get_elo(elo_state, str(pk), str(away), base=BASE_ELO)
        for pk, away in zip(piv["pool_key"].values, piv["fora"].values)
    ]
    piv["elo_diff"] = piv["elo_home_pre"] - piv["elo_away_pre"]
    piv["abs_elo_diff"] = piv["elo_diff"].abs()

    piv["has_odds_1x2"] = (~piv["betano_ph"].isna() & ~piv["betano_pd"].isna() & ~piv["betano_pa"].isna()).astype(int)

    piv["imp_ph"] = piv["betano_ph"]
    piv["imp_pd"] = piv["betano_pd"]
    piv["imp_pa"] = piv["betano_pa"]
    piv["imp_overround_1x2"] = piv["betano_overround"]

    piv["imp_ph_minus_pa"] = (piv["betano_ph"] - piv["betano_pa"]).astype(float)
    piv["abs_imp_ph_minus_pa"] = piv["imp_ph_minus_pa"].abs()

    piv["imp_entropy_1x2"] = [
        entropy_1x2(ph, pd_, pa)
        for ph, pd_, pa in zip(piv["betano_ph"].values, piv["betano_pd"].values, piv["betano_pa"].values)
    ]

    piv["fav_prob"] = np.nan
    m = piv["has_odds_1x2"] == 1
    if m.any():
        piv.loc[m, "fav_prob"] = np.maximum(piv.loc[m, "betano_ph"].values, piv.loc[m, "betano_pa"].values)

    piv["draw_edge"] = np.nan
    piv.loc[m, "draw_edge"] = piv.loc[m, "betano_pd"].values - piv.loc[m, "fav_prob"].values

    piv["balanced_flag"] = 0
    piv.loc[m, "balanced_flag"] = (piv.loc[m, "fav_prob"].values < 0.45).astype(int)

    piv["form_pts_home_3"] = 0.0
    piv["form_pts_home_5"] = 0.0
    piv["form_pts_away_3"] = 0.0
    piv["form_pts_away_5"] = 0.0
    piv["gd_home_5"] = 0.0
    piv["gd_away_5"] = 0.0

    piv["ou_p_over25"] = np.nan
    piv["ou_p_under25"] = np.nan
    piv["ou_overround"] = np.nan
    piv["ou_p_over_minus_under"] = np.nan
    piv["has_ou_25"] = 0

    num_cols = [
        "elo_home_pre", "elo_away_pre", "elo_diff", "abs_elo_diff",
        "form_pts_home_3", "form_pts_home_5",
        "form_pts_away_3", "form_pts_away_5",
        "gd_home_5", "gd_away_5",
        "odds_h", "odds_d", "odds_a",
        "imp_ph", "imp_pd", "imp_pa",
        "imp_overround_1x2",
        "imp_ph_minus_pa",
        "abs_imp_ph_minus_pa",
        "imp_entropy_1x2",
        "fav_prob",
        "draw_edge",
        "balanced_flag",
        "ou_p_over25", "ou_p_under25",
        "ou_overround",
        "ou_p_over_minus_under",
        "has_odds_1x2",
        "has_ou_25",
    ]

    Xn = piv[num_cols].copy()

    Xc = pd.get_dummies(
        pd.DataFrame({
            "pool_key": piv["pool_key"].astype(str),
            "competition": piv["campeonato"].astype(str),
        }),
        prefix=["pool_key", "competition"],
        dummy_na=False,
    )

    X = pd.concat([Xn, Xc], axis=1)

    all_cols = joblib.load(COLS_PATH)
    X = X.reindex(columns=all_cols, fill_value=0)

    booster = xgb.Booster()
    booster.load_model(MODEL_PATH)

    dmat = xgb.DMatrix(X.values.astype(np.float32))
    prob = booster.predict(dmat)

    piv["ai_ph"] = prob[:, 0]
    piv["ai_pd"] = prob[:, 1]
    piv["ai_pa"] = prob[:, 2]

    piv["ai_pick"] = np.argmax(prob, axis=1)
    piv["ai_pick_label"] = piv["ai_pick"].map({0: "HOME", 1: "DRAW", 2: "AWAY"})

    piv["ai_confidence"] = np.max(prob, axis=1)
    piv["ai_confidence_pct"] = piv["ai_confidence"].apply(_to_pct_1d)
    piv["ai_bucket"] = piv["ai_confidence"].apply(confidence_bucket)

    scores = [
        estimate_score(ph, pd_, pa, elo_diff=ed, p_over25=None)
        for ph, pd_, pa, ed in zip(piv["ai_ph"].values, piv["ai_pd"].values, piv["ai_pa"].values, piv["elo_diff"].values)
    ]
    piv["score_estimated"] = [f"{gh} - {ga}" for gh, ga in scores]

    # -----------------------------
    # Output enxuto + % + 1 decimal
    # -----------------------------
    out = piv[[
        "campeonato", "casa", "fora",
        "odds_h", "odds_a", "odds_d",
        "betano_ph", "betano_pa", "betano_pd", "betano_overround",
        "ai_ph", "ai_pd", "ai_pa",
        "ai_pick_label", "ai_confidence_pct", "ai_bucket",
        "score_estimated",
    ]].copy()

    # odds -> 1 casa
    for c in ["odds_h", "odds_a", "odds_d"]:
        out[c] = out[c].apply(_round_1d)

    # probs/overround -> porcentagem 1 casa
    for c in ["betano_ph", "betano_pa", "betano_pd", "betano_overround", "ai_ph", "ai_pd", "ai_pa"]:
        out[c] = out[c].apply(_to_pct_1d)

    # (ai_confidence_pct já está em %, só garantir 1 casa)
    out["ai_confidence_pct"] = out["ai_confidence_pct"].apply(_round_1d)

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    out.to_csv(OUT_CSV, index=False, encoding="utf-8")

    print("[OK] Predições geradas:", len(out))
    print("[OK] Salvo em:", OUT_CSV)
    print("\nPreview:")
    print(out.head(30).to_string(index=False))

if __name__ == "__main__":
    main()
