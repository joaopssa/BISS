# Backend/ml/train/eval_avg_odds_model.py
# ------------------------------------------------------------
# Calcula (no TEST):
# - odd média do pick do modelo
# - assertividade do modelo vs baseline da casa (no MESMO subset has_odds_1x2=1)
#
# Além disso, gera um CSV espelho do house_odds_summary:
#   Backend/ml/train/predictor_odds_summary.csv
# com mesmas colunas/linhas (ALL + por competição/pasta), mas do MODELO.
#
# Entrada:
#   Backend/ml/datasets/matches_enriched.csv
#   Backend/ml/models/xgb_1x2.json
#   Backend/ml/models/xgb_1x2_columns.pkl
#
# Saídas:
#   Backend/ml/train/predictor_odds_summary.csv
# ------------------------------------------------------------

import os
import math
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb


# ==========================
# Config (opcional)
# ==========================
# Se quiser filtrar para um conjunto específico de competições do DATASET (campo "competition"),
# coloque um set aqui. Ex:
# FILTER_COMPETITIONS = {"Brasileirão - Série A Betano"}
FILTER_COMPETITIONS = None


# ==========================
# Utils
# ==========================
def entropy_1x2(ph, pd_, pa) -> float:
    for v in (ph, pd_, pa):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return np.nan
        if v <= 0:
            return np.nan
    s = float(ph + pd_ + pa)
    if s <= 0:
        return np.nan
    ph2, pd2, pa2 = float(ph) / s, float(pd_) / s, float(pa) / s
    return -(ph2 * math.log(ph2) + pd2 * math.log(pd2) + pa2 * math.log(pa2))


def split_by_pool_temporal(df: pd.DataFrame, train_frac=0.80, val_frac=0.10):
    """Split temporal sem leakage dentro de cada pool_key (igual treino)."""
    parts_train, parts_val, parts_test = [], [], []

    for pk, g in df.groupby("pool_key", sort=False):
        g = g.sort_values("date").reset_index(drop=True)
        n = len(g)
        if n < 10:
            parts_train.append(g)
            continue

        i_train_end = int(n * train_frac)
        i_val_end = int(n * (train_frac + val_frac))

        if i_train_end >= n - 2:
            i_train_end = max(1, n - 2)
        if i_val_end >= n - 1:
            i_val_end = max(i_train_end + 1, n - 1)

        parts_train.append(g.iloc[:i_train_end].copy())
        parts_val.append(g.iloc[i_train_end:i_val_end].copy())
        parts_test.append(g.iloc[i_val_end:].copy())

    train_df = pd.concat(parts_train, ignore_index=True) if parts_train else df.iloc[:0].copy()
    val_df = pd.concat(parts_val, ignore_index=True) if parts_val else df.iloc[:0].copy()
    test_df = pd.concat(parts_test, ignore_index=True) if parts_test else df.iloc[:0].copy()

    train_df = train_df.sort_values("date").reset_index(drop=True)
    val_df = val_df.sort_values("date").reset_index(drop=True)
    test_df = test_df.sort_values("date").reset_index(drop=True)
    return train_df, val_df, test_df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Reconstrói features auxiliares exatamente como no treino."""
    df = df.copy()

    df["has_odds_1x2"] = (~df["imp_ph"].isna() & ~df["imp_pd"].isna() & ~df["imp_pa"].isna()).astype(int)
    df["has_ou_25"] = (~df["ou_p_over25"].isna() & ~df["ou_p_under25"].isna()).astype(int)

    df["abs_elo_diff"] = df["elo_diff"].abs()
    df["abs_imp_ph_minus_pa"] = df["imp_ph_minus_pa"].abs()

    df["imp_entropy_1x2"] = [
        entropy_1x2(ph, pd_, pa)
        for ph, pd_, pa in zip(df["imp_ph"].values, df["imp_pd"].values, df["imp_pa"].values)
    ]

    df["fav_prob"] = np.nan
    m_odds = df["has_odds_1x2"] == 1
    if m_odds.any():
        df.loc[m_odds, "fav_prob"] = np.maximum(df.loc[m_odds, "imp_ph"].values, df.loc[m_odds, "imp_pa"].values)

    df["draw_edge"] = np.nan
    df.loc[m_odds, "draw_edge"] = df.loc[m_odds, "imp_pd"].values - df.loc[m_odds, "fav_prob"].values

    df["balanced_flag"] = 0
    df.loc[m_odds, "balanced_flag"] = (df.loc[m_odds, "fav_prob"].values < 0.45).astype(int)

    return df


def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def _safe_mean(x: pd.Series) -> float:
    x = pd.to_numeric(x, errors="coerce")
    if len(x.dropna()) == 0:
        return float("nan")
    return float(x.mean())


def _safe_median(x: pd.Series) -> float:
    x = pd.to_numeric(x, errors="coerce")
    if len(x.dropna()) == 0:
        return float("nan")
    return float(x.median())


def _safe_quantile(x: pd.Series, q: float) -> float:
    x = pd.to_numeric(x, errors="coerce")
    if len(x.dropna()) == 0:
        return float("nan")
    return float(x.quantile(q))


# ==========================
# Main
# ==========================
def main():
    THIS_DIR = os.path.dirname(os.path.abspath(__file__))  # .../Backend/ml/train
    ML_DIR = os.path.abspath(os.path.join(THIS_DIR, ".."))  # .../Backend/ml

    DATA_PATH = os.path.join(ML_DIR, "datasets", "matches_enriched.csv")
    MODELS_DIR = os.path.join(ML_DIR, "models")

    MODEL_PATH = os.path.join(MODELS_DIR, "xgb_1x2.json")
    COLS_PATH = os.path.join(MODELS_DIR, "xgb_1x2_columns.pkl")

    OUT_PRED_SUMMARY = os.path.join(THIS_DIR, "predictor_odds_summary.csv")

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset não encontrado: {DATA_PATH}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Modelo não encontrado: {MODEL_PATH}")
    if not os.path.exists(COLS_PATH):
        raise FileNotFoundError(f"Colunas não encontradas: {COLS_PATH}")

    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "target_1x2"]).copy()
    df["target_1x2"] = df["target_1x2"].astype(int)

    # (opcional) filtro de competição no dataset
    if FILTER_COMPETITIONS is not None:
        df = df[df["competition"].astype(str).isin(set(FILTER_COMPETITIONS))].copy()

    df = df.sort_values(["pool_key", "date"]).reset_index(drop=True)

    # features iguais ao treino
    df = build_features(df)

    # split igual treino (pega TEST)
    _, _, test_df = split_by_pool_temporal(df, train_frac=0.80, val_frac=0.10)
    if len(test_df) == 0:
        raise RuntimeError("TEST vazio. Verifique o split por pool_key / filtro de competição.")

    # mesmas cols do treino (num + one-hot)
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
    cat_cols = ["pool_key", "competition"]

    def make_X(d: pd.DataFrame) -> pd.DataFrame:
        Xn = d[num_cols].copy()
        Xc = pd.get_dummies(d[cat_cols].astype(str), prefix=cat_cols, dummy_na=False)
        return pd.concat([Xn, Xc], axis=1)

    X_test = make_X(test_df)

    all_cols = joblib.load(COLS_PATH)
    X_test = X_test.reindex(columns=all_cols, fill_value=0)

    booster = xgb.Booster()
    booster.load_model(MODEL_PATH)

    dtest = xgb.DMatrix(X_test.values.astype(np.float32))
    prob = booster.predict(dtest)
    pred = np.argmax(prob, axis=1)

    out = test_df.copy().reset_index(drop=True)
    out["pred"] = pred

    # odd escolhida pelo pick do modelo
    out["picked_odds"] = np.nan
    out.loc[out["pred"] == 0, "picked_odds"] = out.loc[out["pred"] == 0, "odds_h"]
    out.loc[out["pred"] == 1, "picked_odds"] = out.loc[out["pred"] == 1, "odds_d"]
    out.loc[out["pred"] == 2, "picked_odds"] = out.loc[out["pred"] == 2, "odds_a"]

    # baseline "casa" (no MESMO TEST):
    # pick = maior prob = menor odd (equivalente), aqui usando odds diretamente para não depender de imp_*
    out["house_pick"] = np.nan
    m_odds = out["has_odds_1x2"] == 1
    if m_odds.any():
        trio = out.loc[m_odds, ["odds_h", "odds_d", "odds_a"]].values.astype(float)
        out.loc[m_odds, "house_pick"] = np.nanargmin(trio, axis=1)

    out["model_correct"] = (out["pred"] == out["target_1x2"]).astype(int)
    out["house_correct"] = (out["house_pick"] == out["target_1x2"]).astype(int)

    # ============================================================
    # Prints rápidos (geral + subset com odds completas)
    # ============================================================
    valid = out.dropna(subset=["picked_odds"]).copy()

    print("\n" + "=" * 80)
    print("[ODDS] TEST - odds média do pick do modelo")
    print("=" * 80)
    print(f"Total jogos TEST: {len(out)}")
    print(f"Jogos com picked_odds válida: {len(valid)} ({len(valid)/max(1,len(out))*100:.1f}%)")

    if len(valid):
        print("\nResumo geral (picked_odds):")
        print(f" - média:   {_safe_mean(valid['picked_odds']):.4f}")
        print(f" - mediana:{_safe_median(valid['picked_odds']):.4f}")
        print(f" - p25:    {_safe_quantile(valid['picked_odds'], 0.25):.4f}")
        print(f" - p75:    {_safe_quantile(valid['picked_odds'], 0.75):.4f}")
        print(f" - p90:    {_safe_quantile(valid['picked_odds'], 0.90):.4f}")
        print(f" - min/max:{float(pd.to_numeric(valid['picked_odds'], errors='coerce').min()):.4f} / {float(pd.to_numeric(valid['picked_odds'], errors='coerce').max()):.4f}")

        print("\nPor classe prevista:")
        for c, name in [(0, "HOME"), (1, "DRAW"), (2, "AWAY")]:
            vc = valid[valid["pred"] == c]
            if len(vc) == 0:
                continue
            print(f" - {name}: n={len(vc)} | média={_safe_mean(vc['picked_odds']):.4f} | mediana={_safe_median(vc['picked_odds']):.4f}")

        v2 = out[(out["has_odds_1x2"] == 1) & (~out["picked_odds"].isna())]
        print("\nSomente jogos com odds 1x2 completas (has_odds_1x2=1):")
        print(f" - n={len(v2)} | média={_safe_mean(v2['picked_odds']):.4f} | mediana={_safe_median(v2['picked_odds']):.4f}")

    # ============================================================
    # Assertividade: modelo vs casa no MESMO subset has_odds_1x2=1
    # ============================================================
    subset = out[out["has_odds_1x2"] == 1].copy()
    if len(subset):
        model_acc = float(subset["model_correct"].mean())
        house_acc = float(subset["house_correct"].mean())

        print("\n" + "=" * 80)
        print("[ACCURACY] TEST (somente has_odds_1x2=1) — MODELO vs CASA")
        print("=" * 80)
        print(f"n={len(subset)} ({len(subset)/len(out)*100:.1f}% do TEST)")
        print(f"House acc: {house_acc*100:.2f}%")
        print(f"Model acc: {model_acc*100:.2f}%")
        print(f"Delta:     {(model_acc-house_acc)*100:.2f} pp")
    else:
        print("\n[WARN] TEST não possui linhas com has_odds_1x2=1. Não há baseline de casa para comparar.")

    # ============================================================
    # Gera CSV espelho predictor_odds_summary.csv
    # - Linhas: __ALL__ + por competition (campo do dataset)
    # - Colunas: espelho do house_odds_summary + extras úteis do modelo
    # ============================================================
    def summarize_predictor(frame: pd.DataFrame) -> dict:
        frame = frame.copy()

        # métricas básicas
        rows_read = int(len(frame))
        rows_with_odds = int((frame["has_odds_1x2"] == 1).sum())
        rows_with_result = int(len(frame))  # aqui sempre tem target

        d = {
            "rows_read": rows_read,
            "rows_with_odds": rows_with_odds,
            "rows_with_result": rows_with_result,
        }

        m2 = frame["has_odds_1x2"] == 1

        # médias de odds e probs (espelho do house_odds_summary)
        if m2.any():
            d["mean_odd_home"] = _safe_mean(frame.loc[m2, "odds_h"])
            d["mean_odd_draw"] = _safe_mean(frame.loc[m2, "odds_d"])
            d["mean_odd_away"] = _safe_mean(frame.loc[m2, "odds_a"])

            all_odds = pd.concat(
                [frame.loc[m2, "odds_h"], frame.loc[m2, "odds_d"], frame.loc[m2, "odds_a"]],
                axis=0,
            ).dropna()
            d["mean_odd_universe"] = float(all_odds.mean()) if len(all_odds) else float("nan")

            fav_odds = frame.loc[m2, ["odds_h", "odds_d", "odds_a"]].min(axis=1).dropna()
            d["mean_odd_favorite"] = float(fav_odds.mean()) if len(fav_odds) else float("nan")

            # probs raw = 1/odd (mesma interpretação do house report)
            oh = pd.to_numeric(frame.loc[m2, "odds_h"], errors="coerce")
            od = pd.to_numeric(frame.loc[m2, "odds_d"], errors="coerce")
            oa = pd.to_numeric(frame.loc[m2, "odds_a"], errors="coerce")

            iph = (1.0 / oh).replace([np.inf, -np.inf], np.nan)
            ipd = (1.0 / od).replace([np.inf, -np.inf], np.nan)
            ipa = (1.0 / oa).replace([np.inf, -np.inf], np.nan)

            d["mean_imp_prob_home_raw"] = float(iph.mean()) if len(iph.dropna()) else float("nan")
            d["mean_imp_prob_draw_raw"] = float(ipd.mean()) if len(ipd.dropna()) else float("nan")
            d["mean_imp_prob_away_raw"] = float(ipa.mean()) if len(ipa.dropna()) else float("nan")

            ip_all = pd.concat([iph, ipd, ipa], axis=0).dropna()
            d["mean_imp_prob_universe_raw"] = float(ip_all.mean()) if len(ip_all) else float("nan")

            # normalizadas + overround (já do dataset)
            d["mean_prob_home_norm"] = _safe_mean(frame.loc[m2, "imp_ph"])
            d["mean_prob_draw_norm"] = _safe_mean(frame.loc[m2, "imp_pd"])
            d["mean_prob_away_norm"] = _safe_mean(frame.loc[m2, "imp_pa"])
            d["mean_overround"] = _safe_mean(frame.loc[m2, "imp_overround_1x2"])
        else:
            # mantém colunas presentes
            d["mean_odd_home"] = float("nan")
            d["mean_odd_draw"] = float("nan")
            d["mean_odd_away"] = float("nan")
            d["mean_odd_universe"] = float("nan")
            d["mean_odd_favorite"] = float("nan")
            d["mean_imp_prob_home_raw"] = float("nan")
            d["mean_imp_prob_draw_raw"] = float("nan")
            d["mean_imp_prob_away_raw"] = float("nan")
            d["mean_imp_prob_universe_raw"] = float("nan")
            d["mean_prob_home_norm"] = float("nan")
            d["mean_prob_draw_norm"] = float("nan")
            d["mean_prob_away_norm"] = float("nan")
            d["mean_overround"] = float("nan")

        # "acertos" do modelo (espelho do "house_correct" no report da casa)
        d["model_correct"] = int(frame["model_correct"].sum())
        d["model_accuracy"] = float(frame["model_correct"].mean()) if len(frame) else float("nan")

        # baseline (casa no MESMO frame, útil)
        if rows_with_odds > 0:
            # para ficar alinhado, mede house_accuracy apenas nas linhas com odds completas
            hh = frame[m2]
            d["house_correct"] = int(hh["house_correct"].sum())
            d["house_accuracy"] = float(hh["house_correct"].mean()) if len(hh) else float("nan")
        else:
            d["house_correct"] = 0
            d["house_accuracy"] = float("nan")

        # odds do pick do modelo (extra)
        picked = frame.dropna(subset=["picked_odds"])
        d["picked_odds_mean"] = _safe_mean(picked["picked_odds"]) if len(picked) else float("nan")
        d["picked_odds_median"] = _safe_median(picked["picked_odds"]) if len(picked) else float("nan")
        d["picked_odds_p25"] = _safe_quantile(picked["picked_odds"], 0.25) if len(picked) else float("nan")
        d["picked_odds_p75"] = _safe_quantile(picked["picked_odds"], 0.75) if len(picked) else float("nan")

        return d

    rows = []
    rows.append({"competition_folder": "__ALL__", **summarize_predictor(out)})

    # Por competition (campo do dataset) — para espelhar no nível que você treina/avalia
    for comp, g in out.groupby("competition", dropna=False):
        rows.append({"competition_folder": str(comp), **summarize_predictor(g)})

    pred_df = pd.DataFrame(rows)

    _ensure_dir(os.path.dirname(OUT_PRED_SUMMARY))
    pred_df.to_csv(OUT_PRED_SUMMARY, index=False, encoding="utf-8")

    print("\n" + "-" * 90)
    print("[OK] predictor_odds_summary.csv salvo em:", OUT_PRED_SUMMARY)
    print("-" * 90)


if __name__ == "__main__":
    main()
