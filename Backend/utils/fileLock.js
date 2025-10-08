// Backend/utils/fileLock.js
const fs = require("fs");
const path = require("path");

function isProcessAlive(pid) {
  if (!pid || Number.isNaN(+pid)) return false;
  try {
    // Em Node, kill(pid,0) só testa; no Windows funciona para processos do próprio usuário.
    process.kill(+pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Garante lock exclusivo usando create 'wx' e grava {pid, createdAt}.
 * Se já existir, valida se é stale (PID morto ou antigo).
 */
function acquireLock(lockPath, { staleMs = 1000 * 60 * 30 } = {}) {
  const dir = path.dirname(lockPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Se já existe, validar se é stale
  if (fs.existsSync(lockPath)) {
    const data = readJsonSafe(lockPath) || {};
    const { pid, createdAt } = data;
    const age = Date.now() - (createdAt || 0);

    const stillAlive = isProcessAlive(pid);

    if (!stillAlive || age > staleMs) {
      // lock obsoleto — remover
      try { fs.unlinkSync(lockPath); } catch {}
    } else {
      // lock válido — não podemos prosseguir
      const err = new Error("another run is in progress.");
      err.code = "ELOCKED";
      throw err;
    }
  }

  // Tentar criar com exclusividade
  const fd = fs.openSync(lockPath, "wx");
  const payload = JSON.stringify({ pid: process.pid, createdAt: Date.now() }, null, 2);
  fs.writeFileSync(fd, payload, "utf-8");
  fs.closeSync(fd);

  // retorno com função de release
  return () => {
    try { fs.unlinkSync(lockPath); } catch {}
  };
}

module.exports = { acquireLock };
