import json
import os
import sys
import shutil
import subprocess
from pathlib import Path
import argparse

def _setup_stdout():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        import io
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding="utf-8", errors="replace")
        except Exception:
            pass

def safe_print(*args, **kwargs):
    text = " ".join(str(a) for a in args)
    enc = (getattr(sys.stdout, "encoding", None) or "utf-8")
    try:
        text.encode(enc, errors="strict")
        print(text, **kwargs)
    except UnicodeEncodeError:
        print(text.encode(enc, errors="replace").decode(enc, errors="replace"), **kwargs)

_setup_stdout()

def find_repo_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(10):
        if (cur / ".git").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    fallback = start.resolve()
    for _ in range(2):
        if fallback.parent != fallback:
            fallback = fallback.parent
    return fallback

def has_dev_script(pkg_path: Path) -> bool:
    try:
        with pkg_path.open(encoding="utf-8") as f:
            data = json.load(f)
        scripts = data.get("scripts", {})
        return isinstance(scripts, dict) and "dev" in scripts
    except Exception:
        return False

def find_frontend_dir(repo_root: Path) -> Path | None:
    candidates = [
        repo_root,
        repo_root / "src",
        repo_root / "frontend",
        repo_root / "web",
        repo_root / "app",
        repo_root / "client",
        Path(__file__).resolve().parent,
    ]
    seen, uniq = set(), []
    for c in candidates:
        p = c.resolve()
        if p not in seen:
            uniq.append(p)
            seen.add(p)
    for c in uniq:
        pkg = c / "package.json"
        if pkg.exists() and has_dev_script(pkg):
            return c
    return None

def find_backend_dir(repo_root: Path) -> Path | None:
    candidates = [
        repo_root / "Backend",
        repo_root / "backend",
        repo_root / "server",
        repo_root / "api",
        repo_root,
    ]
    for c in candidates:
        if (c / "server.js").exists():
            return c.resolve()
    return None

def ensure_commands():
    missing = []
    if shutil.which("node") is None:
        missing.append("node")
    if shutil.which("npm") is None:
        missing.append("npm")
    if missing:
        raise RuntimeError(
            "Ferramentas ausentes no PATH: " + ", ".join(missing) +
            "\nInstale o Node.js (que inclui o npm) ou adicione-os ao PATH."
        )

def which_powershell() -> list[str]:
    for exe in ("powershell.exe", "powershell", "pwsh.exe", "pwsh"):
        if shutil.which(exe):
            return [exe]
    return ["powershell"]

def open_powershell_in_new_window(cwd: Path, command: str):
    ps = which_powershell()
    ps_command = f"cd '{cwd}' ; {command}"
    creation = subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
    return subprocess.Popen([*ps, "-NoExit", "-Command", ps_command], creationflags=creation, cwd=str(cwd))

def run_python_new_console(cwd: Path, args: list[str]):
    creation = subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
    py = sys.executable or "python"
    return subprocess.Popen([py, *args], cwd=str(cwd), creationflags=creation)

def dev_mode(repo_root: Path):
    ensure_commands()
    frontend_dir = find_frontend_dir(repo_root)
    backend_dir = find_backend_dir(repo_root)

    errors = []
    if frontend_dir is None:
        errors.append("Não encontrei o frontend com package.json contendo script \"dev\" dentro de: " + str(repo_root))
    if backend_dir is None:
        errors.append("Não encontrei o backend com arquivo server.js dentro de: " + str(repo_root))

    if errors:
        safe_print("ERRO: Não foi possível localizar os diretórios necessários:")
        for e in errors:
            safe_print(" - " + e)
        safe_print("\nDica: ajuste a lista de candidatos ou mova este script para dentro do repositório BISS.")
        sys.exit(1)

    safe_print("OK  Repositório:", repo_root)
    safe_print("OK  Frontend   :", frontend_dir)
    safe_print("OK  Backend    :", backend_dir)

    try:
        open_powershell_in_new_window(frontend_dir, "npm run dev")
        open_powershell_in_new_window(backend_dir, "node server.js")
        safe_print("\nINICIADO:")
        safe_print(" - Frontend -> npm run dev")
        safe_print(" - Backend  -> node server.js")
        safe_print("\nAs duas janelas foram abertas com os processos rodando.")
    except Exception as e:
        safe_print(f"ERRO ao iniciar os processos: {e}")
        sys.exit(1)

def scrape_mode(repo_root: Path, ligas_csv: str, saida: str, janela_horas: int, limite_eventos: int, headless: int, dump: int, ligas_extras: str):
    scraper_path = (repo_root / "Backend" / "scraper" / "betano_multiligas_markets_v1_3.py").resolve()
    if not scraper_path.exists():
        safe_print("ERRO: Não encontrei o scraper em:", scraper_path)
        sys.exit(1)

    args = [
        str(scraper_path),
        "--ligas_csv", ligas_csv,
        "--saida", saida,
        "--janela_horas", str(janela_horas),
        "--limite_eventos", str(limite_eventos),
        "--headless", str(headless),
        "--dump", str(dump),
    ]
    if ligas_extras:
        args += ["--ligas_extras", ligas_extras]

    safe_print("Executando scraper:", " ".join(args))
    proc = run_python_new_console(repo_root, args)
    if proc.poll() is not None and proc.returncode != 0:
        safe_print("ERRO ao iniciar o scraper (retorno imediato).")
        sys.exit(proc.returncode)
    safe_print("Scraper iniciado em nova janela.")

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=["dev","scrape"], default="dev")
    p.add_argument("--ligas_csv", type=str, help="CSV com coluna url_liga (modo scrape)")
    p.add_argument("--saida", type=str, default="odds_betano_multiligas.csv")
    p.add_argument("--janela_horas", type=int, default=24)
    p.add_argument("--limite_eventos", type=int, default=0)
    p.add_argument("--headless", type=int, default=1)
    p.add_argument("--dump", type=int, default=0)
    p.add_argument("--ligas_extras", type=str, default="")
    return p.parse_args()

def main():
    script_dir = Path(__file__).resolve().parent
    repo_root = find_repo_root(script_dir)
    args = parse_args()

    if args.mode == "dev":
        dev_mode(repo_root)
    else:
        if not args.ligas_csv:
            safe_print("ERRO: --ligas_csv é obrigatório no modo --mode scrape.")
            sys.exit(2)
        scrape_mode(
            repo_root=repo_root,
            ligas_csv=args.ligas_csv,
            saida=args.saida,
            janela_horas=args.janela_horas,
            limite_eventos=args.limite_eventos,
            headless=args.headless,
            dump=args.dump,
            ligas_extras=args.ligas_extras,
        )

if __name__ == "__main__":
    main()
