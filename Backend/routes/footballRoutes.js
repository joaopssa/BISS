// routes/footballRoutes.js
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

// util: mapeia fixture para o objeto que o front entende
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
    // usamos 0 para odds (essa API não traz 1X2 aqui)
    odds: { home: 0, draw: 0, away: 0 },
    aiRecommendation: {
      type: "safe_bet",
      confidence: 70,
      suggestion: "Acompanhe",
      reasoning: "Odds 1X2 não inclusas nesse feed.",
    },
    isFavorite: false,
    sport: "futebol",
    popularity: 0,
    live: {
      status: String(fixture.status?.short || "").toUpperCase(),
      minute: typeof fixture.status?.elapsed === "number" ? fixture.status.elapsed : undefined,
      score: { home: goals.home, away: goals.away },
    },
    logos: { home: teams.home?.logo, away: teams.away?.logo },
    _dt: dt,
  };
}

// Helper: data de hoje em SP (YYYY-MM-DD)
function todayISOinSP() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const dd = parts.find(p => p.type === "day").value;
  const mm = parts.find(p => p.type === "month").value;
  const yy = parts.find(p => p.type === "year").value;
  return `${yy}-${mm}-${dd}`;
}

/** UPCOMING: jogos de hoje que ainda não começaram (timezone SP) */
router.get("/upcoming", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "API_FOOTBALL_KEY not set" });

    const date = todayISOinSP();
    const url  = `${BASE}/fixtures?date=${date}&timezone=America/Sao_Paulo`;

    const r = await fetch(url, { headers: HEADERS, timeout: 20000 });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("[/upcoming] upstream status:", r.status, txt.slice(0, 200));
      return res.status(502).json({ error: "Upstream error", status: r.status, detail: txt.slice(0, 300) });
    }
    const js = await r.json();
    const list = Array.isArray(js?.response) ? js.response : [];

    const now = Date.now();
    const upcomingOnly = list.filter((fx) => {
      const st = String(fx?.fixture?.status?.short || "").toUpperCase();
      const ts = Number(fx?.fixture?.timestamp) * 1000 || 0;
      return st === "NS" || st === "TBD" || st === "PST" || ts > now;
    });

    const mapped = upcomingOnly
      .map(mapFixtureToUIMatch)
      .sort((a, b) => (a._dt?.getTime() || 0) - (b._dt?.getTime() || 0));

    res.json({ response: mapped, count: mapped.length });
  } catch (e) {
    console.error("[/upcoming] error:", e);
    res.status(500).json({ error: "internal", detail: String(e) });
  }
});

/** LIVE: todos os jogos ao vivo (timezone SP) */
router.get("/live", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "API_FOOTBALL_KEY not set" });

    const url = `${BASE}/fixtures?live=all&timezone=America/Sao_Paulo`;
    const r = await fetch(url, { headers: HEADERS, timeout: 20000 });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("[/live] upstream status:", r.status, txt.slice(0, 200));
      return res.status(502).json({ error: "Upstream error", status: r.status, detail: txt.slice(0, 300) });
    }

    const js = await r.json();
    const list = Array.isArray(js?.response) ? js.response : [];

    // Filtra realmente “ao vivo” (evita NS/TBD passarem)
    const LIVE_SHORT = new Set(["1H", "2H", "HT", "ET", "BT", "P"]);
    const liveOnly = list.filter(fx => LIVE_SHORT.has(String(fx?.fixture?.status?.short || "").toUpperCase()));

    const mapped = liveOnly
      .map(mapFixtureToUIMatch)
      .sort((a, b) => (a._dt?.getTime() || 0) - (b._dt?.getTime() || 0));

    res.json({ response: mapped, count: mapped.length });
  } catch (e) {
    console.error("[/live] error:", e);
    res.status(500).json({ error: "internal", detail: String(e) });
  }
});

module.exports = router;
