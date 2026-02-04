// Backend/routes/mlRoutes.js
// API routes para predições do sistema ML

const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");

/**
 * POST /api/ml/predict
 * Prediz resultado de uma partida
 * 
 * Body:
 * {
 *   "elo_home_pre": 1550.0,
 *   "elo_away_pre": 1450.0,
 *   "elo_diff": 100.0,
 *   "form_pts_home_3": 9.0,
 *   "form_pts_home_5": 13.0,
 *   "form_pts_away_3": 4.0,
 *   "form_pts_away_5": 7.0,
 *   "gd_home_5": 2,
 *   "gd_away_5": -1,
 *   "pool_key": "POOL_BRASIL",
 *   "competition": "Brasileirão - Série A Betano"
 * }
 */
router.post("/predict", async (req, res) => {
  try {
    const matchData = req.body;

    // Validar campos mínimos
    const required = [
      "elo_home_pre",
      "elo_away_pre",
      "elo_diff",
      "form_pts_home_3",
      "form_pts_home_5",
      "form_pts_away_3",
      "form_pts_away_5",
      "gd_home_5",
      "gd_away_5",
      "pool_key",
      "competition",
    ];

    const missing = required.filter((f) => !(f in matchData));
    if (missing.length > 0) {
      return res.status(400).json({
        error: "Campos obrigatórios faltando",
        missing,
      });
    }

    // Executar predição via Python
    const prediction = await predictViaPython(matchData);

    res.json({
      success: true,
      ...prediction,
    });
  } catch (error) {
    console.error("[ML] Erro na predição:", error);
    res.status(500).json({
      error: "Erro ao fazer predição",
      details: error.message,
    });
  }
});

/**
 * GET /api/ml/info
 * Retorna informações sobre o modelo
 */
router.get("/info", async (req, res) => {
  try {
    const info = await getModelInfoViaPython();
    res.json({
      success: true,
      ...info,
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao obter info do modelo",
      details: error.message,
    });
  }
});

/**
 * POST /api/ml/predict-batch
 * Prediz múltiplas partidas em batch
 * 
 * Body:
 * {
 *   "matches": [
 *     {...match1...},
 *     {...match2...}
 *   ]
 * }
 */
router.post("/predict-batch", async (req, res) => {
  try {
    const { matches } = req.body;

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({
        error: "Body deve conter array 'matches'",
      });
    }

    if (matches.length > 100) {
      return res.status(400).json({
        error: "Máximo 100 partidas por request",
      });
    }

    // Predizer todas
    const predictions = await Promise.all(
      matches.map((match) => predictViaPython(match))
    );

    res.json({
      success: true,
      count: predictions.length,
      predictions,
    });
  } catch (error) {
    console.error("[ML] Erro batch:", error);
    res.status(500).json({
      error: "Erro ao fazer predições em batch",
      details: error.message,
    });
  }
});

/**
 * Helper: Executar predição via Python
 */
function predictViaPython(matchData) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "../ml/predict.py");

    // Passar dados como JSON via stdin
    const python = spawn("python", [pythonScript, "--predict"], {
      cwd: path.join(__dirname, ".."),
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python error: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Invalid JSON from Python: ${stdout}`));
      }
    });

    // Enviar dados via stdin
    python.stdin.write(JSON.stringify(matchData));
    python.stdin.end();
  });
}

/**
 * Helper: Obter info do modelo via Python
 */
function getModelInfoViaPython() {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "../ml/predict.py");

    const python = spawn("python", [pythonScript, "--info"], {
      cwd: path.join(__dirname, ".."),
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python error: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Invalid JSON from Python: ${stdout}`));
      }
    });
  });
}

module.exports = router;
