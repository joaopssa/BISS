import json
import os
import sys
import shutil
import subprocess
from pathlib import Path

# --- Saída robusta: força UTF-8 ou substitui caracteres não suportados ---
def _setup_stdout():
    """
    Tenta reconfigurar stdout para UTF-8; se não der, usa 'errors=replace'
    para evitar UnicodeEncodeError em terminais cp1252.
    """
    try:
        # Python 3.7+: reconfigure
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        # Fallback
        import io
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding="utf-8", errors="replace")
        except Exception:
            # Último recurso: mantém encoding atual mas evita quebrar
            pass

def safe_print(*args, **kwargs):
    """
    print que nunca explode por UnicodeEncodeError.
    """
    text = " ".join(str(a) for a in args)
    enc = (getattr(sys.stdout, "encoding", None) or "utf-8")
    try:
        text.encode(enc, errors="strict")
        print(text, **kwargs)
    except UnicodeEncodeError:
        print(text.encode(enc, errors="replace").decode(enc, errors="replace"), **kwargs)

_setup_stdout()
# -------------------------------------------------------------------------


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


def find_scraper_script(backend_dir: Path) -> Path | None:
    """
    Procura Backend/scraper/run_all_updates.py (ou variações).
    """
    candidates = [
        backend_dir / "scraper" / "run_all_updates.py",
        backend_dir / "scrapers" / "run_all_updates.py",
        backend_dir / "Backend" / "scraper" / "run_all_updates.py",  # fallback extra
    ]
    for p in candidates:
        if p.exists():
            return p.resolve()
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
    """
    Prefere Windows PowerShell (powershell.exe). Se não achar, tenta pwsh.
    """
    for exe in ("powershell.exe", "powershell", "pwsh.exe", "pwsh"):
        if shutil.which(exe):
            return [exe]
    # último recurso: assume 'powershell'
    return ["powershell"]


def open_powershell_in_new_window(cwd: Path, command: str):
    ps = which_powershell()
    ps_command = f"cd '{cwd}' ; {command}"
    creation = subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
    return subprocess.Popen(
        [*ps, "-NoExit", "-Command", ps_command],
        creationflags=creation,
        cwd=str(cwd)
    )


def main():
    script_dir = Path(__file__).resolve().parent
    repo_root = find_repo_root(script_dir)

    ensure_commands()

    frontend_dir = find_frontend_dir(repo_root)
    backend_dir = find_backend_dir(repo_root)

    errors = []
    if frontend_dir is None:
        errors.append(
            "Não encontrei o frontend com package.json contendo script \"dev\" "
            f"nos caminhos comuns dentro de: {repo_root}"
        )
    if backend_dir is None:
        errors.append(
            "Não encontrei o backend com arquivo server.js nos caminhos comuns "
            f"dentro de: {repo_root}"
        )

    if errors:
        safe_print("ERRO: Não foi possível localizar os diretórios necessários:")
        for e in errors:
            safe_print(" - " + e)
        safe_print("\nDica: ajuste a lista de candidatos em find_frontend_dir/find_backend_dir "
                   "ou mova o script para dentro do repositório BISS.")
        sys.exit(1)

    safe_print("OK  Repositório:", repo_root)
    safe_print("OK  Frontend   :", frontend_dir)
    safe_print("OK  Backend    :", backend_dir)

    # --- NOVO: localizar script do scraper ---
    scraper_script = find_scraper_script(backend_dir)
    if scraper_script:
        safe_print("OK  Scraper    :", scraper_script)
    else:
        safe_print("AVISO: Não encontrei o script do scraper (run_all_updates.py) dentro de:", backend_dir)

    try:
        # --- NOVO: abre a janela do scraper primeiro (opcional) ---
        if scraper_script:
            py = sys.executable  # usa o python que está rodando este run_biss.py
            # -u = saída sem buffer (melhor pra acompanhar logs)
            open_powershell_in_new_window(
                scraper_script.parent,
                f'& "{py}" -u "{scraper_script.name}"'
            )
        open_powershell_in_new_window(frontend_dir, "npm run dev")
        open_powershell_in_new_window(backend_dir, "node server.js")

        safe_print("\nINICIADO:")
        if scraper_script:
            safe_print(f" - Scraper  -> {sys.executable} -u {scraper_script}")
        safe_print(" - Frontend -> npm run dev")
        safe_print(" - Backend  -> node server.js")
        safe_print("\nAs janelas do PowerShell foram abertas com os processos rodando.")
    except Exception as e:
        safe_print(f"ERRO ao iniciar os processos: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
