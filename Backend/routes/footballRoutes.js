// backend/routes/footballRoutes.js
const express = require("express");
const router = express.Router();

// node-fetch (CommonJS)
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

if (!API_KEY) {
  console.warn("[WARN] API_FOOTBALL_KEY não definida no .env do backend");
}

const HEADERS = {
  "x-apisports-key": API_KEY || "",
  "Accept": "application/json",
};

function mapFixtureToUIMatch(fx) {
  const fixture = fx.fixture || {};
  const league  = fx.league  || {};
  const teams   = fx.teams   || {};
  const goals   = fx.goals   || {};
  const dtIso   = fixture.date;
  const dt      = dtIso ? new Date(dtIso) : new Date();

  return {
    id: fixture.id ?? `${teams.home?.name || "home"}-${teams.away?.name || "away"}-${fixture.timestamp || ""}`,
    homeTeam: teams.home?.name || "Time da Casa",
    awayTeam: teams.away?.name || "Time Visitante",
    competition: league.name || "Competição",
    date: dt.toLocaleDateString(),
    time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    odds: { home: 0, draw: 0, away: 0 },
    aiRecommendation: { type: "safe_bet", confidence: 70, suggestion: "Acompanhe", reasoning: "Odds 1X2 não inclusas." },
    isFavorite: false,
    sport: "futebol",
    popularity: 0,
    live: {
      status: String(fixture.status?.short || "").toUpperCase(),
      minute: typeof fixture.status?.elapsed === "number" ? fixture.status.elapsed : undefined,
      score: { home: goals.home, away: goals.away },
    },
    logos: { home: teams.home?.logo, away: teams.away?.logo },
    _dt: dt.toISOString(),
  };
}

// Hoje (YYYY-MM-DD) no fuso de SP
function todayISOinSP() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  const mm = parts.find((p) => p.type === "month")?.value || "01";
  const yy = parts.find((p) => p.type === "year")?.value || "1970";
  return `${yy}-${mm}-${dd}`;
}

/** Jogos do dia (timezone SP) — o filtro “não iniciados” era feito no front */
router.get("/upcoming", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "API_FOOTBALL_KEY not set" });

    const date = todayISOinSP();
    const url = `${BASE}/fixtures?date=${date}&timezone=America/Sao_Paulo`;
    const r = await fetch(url, { headers: HEADERS, timeout: 20000 });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: "Upstream error", status: r.status, detail: txt.slice(0, 300) });
    }

    const js = await r.json();
    const list = Array.isArray(js?.response) ? js.response : [];

    // >>> sem filtrar aqui por “não iniciados”: devolvemos todos do dia
    const mapped = list
      .map(mapFixtureToUIMatch)
      .sort((a, b) => new Date(a._dt).getTime() - new Date(b._dt).getTime());

    res.json({ response: mapped, count: mapped.length });
  } catch (e) {
    console.error("[/upcoming] error:", e);
    res.status(500).json({ error: "internal", detail: String(e) });
  }
});

/** Ao vivo (timezone SP) — filtramos por status realmente live */
router.get("/live", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "API_FOOTBALL_KEY not set" });

    const url = `${BASE}/fixtures?live=all&timezone=America/Sao_Paulo`;
    const r = await fetch(url, { headers: HEADERS, timeout: 20000 });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: "Upstream error", status: r.status, detail: txt.slice(0, 300) });
    }

    const js = await r.json();
    const list = Array.isArray(js?.response) ? js.response : [];

    const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P"]);
    const liveOnly = list.filter((fx) =>
      LIVE.has(String(fx?.fixture?.status?.short || "").toUpperCase())
    );

    const mapped = liveOnly
      .map(mapFixtureToUIMatch)
      .sort((a, b) => new Date(a._dt).getTime() - new Date(b._dt).getTime());

    res.json({ response: mapped, count: mapped.length });
  } catch (e) {
    console.error("[/live] error:", e);
    res.status(500).json({ error: "internal", detail: String(e) });
  }
});

module.exports = router;
