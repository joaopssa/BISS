// Backend/server.js
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { spawn } = require("node:child_process");
const path = require("node:path");

// Rotas
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const footballRoutes = require("./routes/footballRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck simples
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: {
      NODE_ENV: "development",
      PORT: 3001,
      BETANO_CSV_PATH: "./data/odds_betano.csv",
      BETANO_LIGAS_PATH: "./scraper/ligas_auto.csv",
      BETANO_WINDOW_HOURS: "24",
      BETANO_QUICK_LIMIT: "2",
      BETANO_CRON: "5 * * * *", // minuto 5 de cada hora
    },
  });
});

// Rotas da API
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/football", footballRoutes);

/**
 * Dispara o scraper uma única vez.
 */
function runScraperOnce(reason = "manual", overridesEnv = {}) {
  const scriptPath = path.resolve(__dirname, "scripts", "run-scraper.js");
  console.log(`[cron] disparando run-scraper.js (motivo: ${reason})`);
  const child = spawn(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: { ...process.env, ...overridesEnv },
  });
  child.on("close", (code) => {
    console.log(`[cron] run-scraper.js terminou com código: ${code}`);
  });
}

// 1) Boot: execute apenas uma vez
runScraperOnce("boot");

// 2) Agendamento: hora em hora, no minuto 5
cron.schedule("5 * * * *", () => runScraperOnce("cron 1h"));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
