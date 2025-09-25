// Backend/routes/footballRoutes.js
const express = require("express");
const router = express.Router();

// node-fetch (CommonJS compat)
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

if (!API_KEY) {
  console.warn("[WARN] API_FOOTBALL_KEY não definida no .env do backend");
}

const HEADERS = {
  "x-apisports-key": API_KEY || "",
  Accept: "application/json",
};

/* ---------------- util: hoje no fuso de SP ---------------- */
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

/* --------------- util: map para shape da UI --------------- */
function mapFixtureToUIMatch(fx) {
  const fixture = fx.fixture || {};
  const league = fx.league || {};
  const teams = fx.teams || {};
  const goals = fx.goals || {};
  const dtIso = fixture.date;
  const dt = dtIso ? new Date(dtIso) : new Date();

  return {
    id:
      fixture.id ??
      `${teams.home?.name || "home"}-${teams.away?.name || "away"}-${fixture.timestamp || ""}`,
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
      minute:
        typeof fixture.status?.elapsed === "number" ? fixture.status.elapsed : undefined,
      score: { home: goals.home, away: goals.away },
    },
    logos: { home: teams.home?.logo, away: teams.away?.logo },
    _dt: dt.toISOString(),
  };
}

/* ------------- cache simples em memória ------------- */
const cache = {
  upcoming: { ts: 0, data: null }, // 120s
  live: { ts: 0, data: null }, // 15s
};
function isFresh(ts, ttlMs) {
  return Date.now() - ts < ttlMs;
}

/* ------------- conjuntos de status ------------- */
const LIVE_SHORT = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);
const FINAL_SHORT = new Set(["FT", "AET", "PEN", "ABD", "AWD", "WO", "CANC", "PST"]); // PST = postergado

/* ------------- UPCOMING (não iniciados) ------------- */
router.get("/upcoming", async (req, res) => {
  try {
    if (cache.upcoming.data && isFresh(cache.upcoming.ts, 120_000)) {
      return res.json(cache.upcoming.data);
    }
    if (!API_KEY) return res.status(500).json({ error: "API_FOOTBALL_KEY not set" });

    const date = todayISOinSP();
    const url = `${BASE}/fixtures?date=${date}&timezone=America/Sao_Paulo`;
    const r = await fetch(url, { headers: HEADERS, timeout: 20000 });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res
        .status(502)
        .json({ error: "Upstream error", status: r.status, detail: txt.slice(0, 300) });
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
      .sort((a, b) => new Date(a._dt).getTime() - new Date(b._dt).getTime());

    const payload = { response: mapped, count: mapped.length };
    cache.upcoming = { ts: Date.now(), data: payload };
    console.log(`[upcoming] recebidos=${list.length} retornando=${mapped.length}`);
    res.json(payload);
  } catch (e) {
    console.error("[/upcoming] error:", e);
    res.status(500).json({ error: "internal", detail: String(e) });
  }
});

/* -------------------- heurística de “ao vivo” -------------------- */
function isLiveHeuristic(fx) {
  const stShort = String(fx?.fixture?.status?.short || "").toUpperCase();
  const stLong = String(fx?.fixture?.status?.long || "").toLowerCase();
  const elapsed = fx?.fixture?.status?.elapsed;
  const ts = Number(fx?.fixture?.timestamp) * 1000 || 0;
  const now = Date.now();

  if (LIVE_SHORT.has(stShort)) return true;
  if (typeof elapsed === "number" && elapsed >= 0) return true;
  if (
    stLong.includes("live") ||
    stLong.includes("in play") ||
    stLong.includes("1st half") ||
    stLong.includes("2nd half")
  )
    return true;
  if (!FINAL_SHORT.has(stShort) && ts && ts <= now) return true;

  return false;
}

/* -------------------- LIVE com fallback + heurística -------------------- */
router.get("/live", async (req, res) => {
  try {
    if (cache.live.data && isFresh(cache.live.ts, 15_000)) {
      return res.json(cache.live.data);
    }
    if (!API_KEY) return res.status(500).json({ error: "API_FOOTBALL_KEY not set" });

    // 1) live=all
    const urlLive = `${BASE}/fixtures?live=all&timezone=America/Sao_Paulo`;
    let r = await fetch(urlLive, { headers: HEADERS, timeout: 20000 });
    let list = [];
    if (r.ok) {
      const js = await r.json();
      list = Array.isArray(js?.response) ? js.response : [];
    } else {
      const txt = await r.text().catch(() => "");
      console.warn("[/live] live=all upstream not OK:", r.status, txt.slice(0, 120));
    }

    // 2) fallback por data se nada veio
    if (list.length === 0) {
      const date = todayISOinSP();
      const urlByDate = `${BASE}/fixtures?date=${date}&timezone=America/Sao_Paulo`;
      const r2 = await fetch(urlByDate, { headers: HEADERS, timeout: 20000 });
      if (!r2.ok) {
        const txt2 = await r2.text().catch(() => "");
        return res
          .status(502)
          .json({ error: "Upstream error", status: r2.status, detail: txt2.slice(0, 300) });
      }
      const js2 = await r2.json();
      const list2 = Array.isArray(js2?.response) ? js2.response : [];
      list = list2.filter(isLiveHeuristic);
      console.log(`[live/fallback] por data recebidos=${list2.length} ao_vivo=${list.length}`);
    } else {
      // se live=all trouxe algo, ainda passamos na heurística para evitar lixo
      const filtered = list.filter(isLiveHeuristic);
      console.log(`[live] live=all recebidos=${list.length} ao_vivo=${filtered.length}`);
      list = filtered;
    }

    const mapped = list
      .map(mapFixtureToUIMatch)
      .sort((a, b) => new Date(a._dt).getTime() - new Date(b._dt).getTime());

    const payload = { response: mapped, count: mapped.length };
    cache.live = { ts: Date.now(), data: payload };
    res.json(payload);
  } catch (e) {
    console.error("[/live] error:", e);
    res.status(500).json({ error: "internal", detail: String(e) });
  }
});

module.exports = router;
