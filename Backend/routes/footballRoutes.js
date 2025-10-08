// Backend/routes/footballRoutes.js
const express = require("express");
const router = express.Router();

const {
  getUpcomingFromCsv,
  getLiveFromCsv,
  _debugCache,
  getCsvMeta,
} = require("../services/betanoCsvAdapter");

// Mantemos os MESMOS endpoints para o frontend:
router.get("/upcoming", async (req, res) => {
  try {
    const list = await getUpcomingFromCsv();
    const meta = { csv: getCsvMeta() };
    res.json({ provider: "betano-csv", response: list, meta });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/live", async (req, res) => {
  try {
    const list = await getLiveFromCsv();
    const meta = { csv: getCsvMeta() };
    res.json({ provider: "betano-csv", response: list, meta });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Debug opcional (cache do adapter)
router.get("/debug/cache", (req, res) => {
  const c = _debugCache();
  res.json({
    at: c.at,
    rows: c.rows.length,
    events: c.byEvent.size,
    csv: getCsvMeta(),
  });
});

module.exports = router;
