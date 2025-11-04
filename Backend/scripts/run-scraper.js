// Backend/scripts/run-scraper.js
require("dotenv").config();
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { acquireLock } = require("../utils/fileLock"); // usa o lock robusto

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SCRAPER_DIR = path.join(ROOT, "scraper");
const PY_SCRIPT = path.join(SCRAPER_DIR, "betano_multiligas_markets_v1_3.py");

// 🔧 Python (ajuste via .env -> PYTHON_BIN)
const PY_BIN = process.env.PYTHON_BIN || "C:\\Python313\\python.exe";

// CSVs (sempre relativos ao ROOT)
const OUT_CSV = path.resolve(ROOT, process.env.BETANO_CSV_PATH || "./data/odds_betano.csv");
const OUT_TMP = path.resolve(ROOT, "./data/odds_betano.tmp.csv");
const LIGAS_FULL = path.resolve(ROOT, process.env.BETANO_LIGAS_CSV || "./scraper/ligas_auto.csv");
const LIGAS_QUICK = path.resolve(ROOT, process.env.BETANO_LIGAS_QUICK || "./data/ligas_quick.csv");

// Lock
const LOCK_FILE = path.join(DATA_DIR, ".scraper.lock");

// Parâmetros
const QUICK_LIMIT = Number(process.env.BETANO_QUICK_LIMIT || 2);
const WINDOW_HOURS = String(process.env.BETANO_WINDOW_HOURS || 24);
const HEADLESS = process.env.HEADLESS || "1";
const SCRAPER_TIMEOUT_MS = Number(process.env.SCRAPER_LIMIT_MS || 25 * 60 * 1000); // 25min

// Garante pasta data/
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/** Kill “seguro” que funciona no Windows e *nix */
function killTree(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    // taskkill /T /F mata o processo e sua árvore
    const { spawn } = require("child_process");
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(-child.pid, "SIGKILL"); } catch {}
    try { child.kill("SIGKILL"); } catch {}
  }
}

/** Verifica se arquivo é recente */
function fileIsRecent(file, maxAgeMs) {
  try {
    const stat = fs.statSync(file);
    return Date.now() - stat.mtimeMs < maxAgeMs;
  } catch { return false; }
}

/** Executa o Python com timeout */
function runPython(args, label) {
  return new Promise((resolve) => {
    console.log(`[scraper] ${label}`);
    const child = spawn(PY_BIN, [PY_SCRIPT, ...args], {
      stdio: "inherit",
      detached: process.platform !== "win32", // ajuda a matar árvore no *nix
    });

    const to = setTimeout(() => {
      console.warn("[scraper] Time limit reached, killing process...");
      killTree(child);
    }, SCRAPER_TIMEOUT_MS);

    child.on("exit", (code) => {
      clearTimeout(to);
      resolve(code === 0);
    });
  });
}

let releaseLock = null;

// cleanup em sinais e saída
function registerProcessGuards() {
  const cleanupAndExit = (code = 0) => {
    try { if (releaseLock) releaseLock(); } catch {}
    process.exit(code);
  };
  process.once("exit", () => { try { if (releaseLock) releaseLock(); } catch {} });
  process.once("SIGINT", () => cleanupAndExit(130));
  process.once("SIGTERM", () => cleanupAndExit(143));
  process.once("SIGBREAK", () => cleanupAndExit(131)); // Windows Ctrl+Break
  process.once("uncaughtException", (err) => { console.error(err); cleanupAndExit(1); });
  process.once("unhandledRejection", (reason) => { console.error(reason); cleanupAndExit(1); });
}

async function run() {
  try {
    // tenta adquirir lock (limpa lock órfão automaticamente)
    releaseLock = acquireLock(LOCK_FILE, { staleMs: 1000 * 60 * 30 }); // 30 min
    registerProcessGuards();

    const csvFresh = fileIsRecent(OUT_CSV, 10 * 60 * 1000); // 10 min
    let ok = true;

    // QUICK: só roda se não houver CSV recente
    if (!csvFresh) {
  const quickArgs = [
    "--headless", HEADLESS,
    "--janela_horas", WINDOW_HOURS,
    "--ligas_csv", fs.existsSync(LIGAS_QUICK) ? LIGAS_QUICK : LIGAS_FULL,
    "--saida", OUT_TMP,
    "--limite_eventos", String(QUICK_LIMIT),
    "--dump", "0",
  ];
  ok = await runPython(quickArgs, "Running quick scrape...");

  // 🟩 Garante que o frontend receba o CSV mesmo se só o quick rodar
  if (fs.existsSync(OUT_TMP)) {
    fs.copyFileSync(OUT_TMP, OUT_CSV);
  }
} else {
  console.log("[scraper] CSV recente encontrado — pulando quick.");
}

    // FULL: roda se quick OK (ou se pulamos o quick)
    if (ok) {
      const fullArgs = [
        "--headless", HEADLESS,
        "--janela_horas", WINDOW_HOURS,
        "--ligas_csv", LIGAS_FULL,
        "--saida", OUT_TMP,
        "--limite_eventos", "0",
        "--dump", "0",
      ];
      ok = await runPython(fullArgs, "Running full scrape...");
      if (ok && fs.existsSync(OUT_TMP)) {
        fs.copyFileSync(OUT_TMP, OUT_CSV);
      }
    }

    // limpa tmp
    if (fs.existsSync(OUT_TMP)) fs.unlinkSync(OUT_TMP);

    if (!ok) {
      console.error("[scraper] terminou com falha.");
      process.exitCode = 1;
    } else {
      console.log("[scraper] concluído com sucesso.");
      process.exitCode = 0;
    }
  } catch (err) {
    if (err && err.code === "ELOCKED") {
      console.log("[scraper] another run is in progress.");
      process.exitCode = 0; // mantém compatível com seu cron
      return;
    }
    console.error("Run-scraper error", err);
    process.exitCode = 1;
  } finally {
    try { if (releaseLock) releaseLock(); } catch {}
  }
}

run();
