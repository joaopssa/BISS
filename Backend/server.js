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
const betSlipRoutes = require("./routes/betSlipRoutes");
const financeRoutes = require("./routes/financeRoutes");
const h2hRoutes = require("./routes/h2h")
const playersRoutes = require("./routes/playersRoutes");
const challengesRoutes = require("./routes/challengesRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

// Rotas principais da API
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/football", footballRoutes);
app.use("/football", footballRoutes);
app.use("/api/apostas", betSlipRoutes);
app.use("/api/financeiro", financeRoutes);
app.use("/api/matches/h2h", h2hRoutes);
app.use("/api", playersRoutes);
app.use("/api/challenges", challengesRoutes);
app.use("/challenges", challengesRoutes);

// Executar scraper manual ou agendado
function runScraperOnce(reason = "manual", overridesEnv = {}) {
    const scriptPath = path.resolve(__dirname, "scripts", "run-scraper.js");
    console.log(`[cron] disparando run-scraper.js (${reason})`);

    const child = spawn(process.execPath, [scriptPath], {
        stdio: "inherit",
        env: {
            ...process.env,
            ...overridesEnv,
        },
    });

    child.on("close", (code) => {
        console.log(`[cron] run-scraper finalizado: código ${code}`);
    });
}

// Executa no boot
runScraperOnce("boot");

// A cada 15 minutos
cron.schedule(process.env.BETANO_CRON || "*/15 * * * *", () =>
    runScraperOnce("cron")
);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
