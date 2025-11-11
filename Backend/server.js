// Backend/server.js
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { spawn } = require("node:child_process");
const path = require("node:path");

// Rotas da API
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const footballRoutes = require("./routes/footballRoutes"); // inclui /football/upcoming, /football/live, etc.

const app = express();
app.use(cors());
app.use(express.json());

// 🩺 Healthcheck simples
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: {
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: process.env.PORT || 3001,
      BETANO_CSV_PATH: process.env.BETANO_CSV_PATH || "./data/odds_betano.csv",
      BETANO_LIGAS_PATH: process.env.BETANO_LIGAS_PATH || "./scraper/ligas_auto.csv",
      BETANO_WINDOW_HOURS: process.env.BETANO_WINDOW_HOURS || "48",
      BETANO_QUICK_LIMIT: process.env.BETANO_QUICK_LIMIT || "0",
      BETANO_CRON: process.env.BETANO_CRON || "*/15 * * * *",
    },
  });
});

// 🧩 Rotas da API principal
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/apostas", require("./routes/betSlipRoutes"));
app.use("/api/financeiro", require("./routes/financeRoutes"));

// ⚽ Rotas públicas de futebol (sem /api prefix)
app.use("/football", footballRoutes);

// 🔄 Função para executar o scraper
function runScraperOnce(reason = "manual", overridesEnv = {}) {
  const scriptPath = path.resolve(__dirname, "scripts", "run-scraper.js");
  console.log(`[cron] disparando run-scraper.js (motivo: ${reason})`);

  const child = spawn(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      BETANO_WINDOW_HOURS: process.env.BETANO_WINDOW_HOURS || "48",
      BETANO_QUICK_LIMIT: process.env.BETANO_QUICK_LIMIT || "0",
      BETANO_LIGAS_PATH: process.env.BETANO_LIGAS_PATH || "./scraper/ligas_auto.csv",
      ...overridesEnv,
    },
  });

  child.on("close", (code) => {
    console.log(`[cron] run-scraper.js terminou com código: ${code}`);
  });
}

// 1️⃣ Executa automaticamente no boot
runScraperOnce("boot inicial");

// 2️⃣ Agenda execução periódica (a cada 15 min)
cron.schedule(process.env.BETANO_CRON || "*/15 * * * *", () => runScraperOnce("cron 15m"));

// 🚀 Inicia o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Rotas ativas:`);
  console.log(` - /api/auth`);
  console.log(` - /api/user`);
  console.log(` - /football/upcoming`);
  console.log(` - /football/live`);
  console.log(` - /football/debug/cache`);
  console.log(`Healthcheck: http://localhost:${PORT}/health`);
});
