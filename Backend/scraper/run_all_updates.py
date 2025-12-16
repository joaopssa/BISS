import subprocess
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPDATES_DIR = os.path.join(BASE_DIR, "updates")

SCRIPTS = [
    "atualizar_jogos.py",
    "cbf_serie_b_scraper.py",
    "champions_scraper.py"
]

def run_script(script_name):
    script_path = os.path.join(UPDATES_DIR, script_name)

    print(f"\nExecutando {script_name}...\n")

    result = subprocess.run(
        [sys.executable, script_path],
        capture_output=True,
        text=True
    )

    if result.stdout:
        print(result.stdout)

    if result.stderr:
        print("⚠️ ERRO:")
        print(result.stderr)

if __name__ == "__main__":
    print("INICIANDO ROTINA COMPLETA DE ATUALIZAÇÃO 🔥")

    for script in SCRIPTS:
        run_script(script)

    print("\nTODAS AS ATUALIZAÇÕES FINALIZADAS")
