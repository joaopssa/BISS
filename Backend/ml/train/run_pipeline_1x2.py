# Backend/ml/train/run_pipeline_1x2.py
# ------------------------------------------------------------
# Pipeline 1x2 (end-to-end) em 1 comando:
#   1) Gera dataset enriquecido
#   2) Treina modelo XGB 1x2
#   3) Gera house_odds_summary.csv
#   4) Gera predictor_odds_summary.csv + prints de odds/accuracy
#
# Pastas esperadas (enxutas):
#   Backend/ml/datasets/
#   Backend/ml/models/
#   Backend/ml/train/
#
# Como rodar:
#   python Backend/ml/train/run_pipeline_1x2.py
# ------------------------------------------------------------

import os
import sys
import subprocess


def run(cmd, cwd=None):
    """Roda um comando e falha se der erro."""
    print("\n" + "=" * 90)
    print("[RUN]", " ".join(cmd))
    print("=" * 90)
    r = subprocess.run(cmd, cwd=cwd)
    if r.returncode != 0:
        raise SystemExit(f"[ERRO] comando falhou (code={r.returncode}): {' '.join(cmd)}")


def main():
    this_dir = os.path.dirname(os.path.abspath(__file__))     # .../Backend/ml/train
    ml_dir = os.path.abspath(os.path.join(this_dir, ".."))    # .../Backend/ml
    backend_dir = os.path.abspath(os.path.join(ml_dir, "..")) # .../Backend

    py = sys.executable  # usa o python do ambiente atual

    # Scripts (paths absolutos pra evitar dor de cabeça)
    build_dataset = os.path.join(ml_dir, "datasets", "build_dataset.py")
    train_model = os.path.join(ml_dir, "train", "train_1x2_xgb.py")
    house_report = os.path.join(ml_dir, "train", "house_odds_report.py")
    eval_model = os.path.join(ml_dir, "train", "eval_avg_odds_model.py")

    for p in [build_dataset, train_model, house_report, eval_model]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Script não encontrado: {p}")

    # 1) dataset
    run([py, build_dataset], cwd=backend_dir)

    # 2) treino
    run([py, train_model], cwd=backend_dir)

    # 3) baseline da casa
    run([py, house_report], cwd=backend_dir)

    # 4) avaliação do modelo + CSV espelho
    run([py, eval_model], cwd=backend_dir)

    print("\n" + "-" * 90)
    print("[OK] Pipeline concluído com sucesso.")
    print("Gerados:")
    print(" - Backend/ml/datasets/matches_enriched.csv")
    print(" - Backend/ml/models/xgb_1x2.json")
    print(" - Backend/ml/models/xgb_1x2_meta.json")
    print(" - Backend/ml/models/xgb_1x2_columns.pkl")
    print(" - Backend/ml/train/house_odds_summary.csv")
    print(" - Backend/ml/train/predictor_odds_summary.csv")
    print("-" * 90)


if __name__ == "__main__":
    main()
