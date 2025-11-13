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

// Healthcheck
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

// Rotas principais da API
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/football", footballRoutes);
app.use("/football", footballRoutes);

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
