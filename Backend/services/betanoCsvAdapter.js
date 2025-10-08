// Backend/services/betanoCsvAdapter.js
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

/**
 * CSV esperado:
 * data_extracao,campeonato,partida,casa,fora,data_hora,mercado,selecao,linha,odd,url_evento,url_liga
 */
const CSV_PATH =
  process.env.BETANO_CSV_PATH || path.join(__dirname, "../../data/odds_betano_multiligas.csv");

const WINDOW_HOURS = parseInt(process.env.BETANO_WINDOW_HOURS || "24", 10);
const TTL_MS = parseInt(process.env.BETANO_CACHE_TTL_MS || "60000", 10);

let CACHE = { at: 0, rows: [], byEvent: new Map(), csvStat: null };

function parseCsv(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = (parsed.data || []).map((r) => ({
    data_extracao: r.data_extracao || "",
    campeonato: r.campeonato || "",
    partida: r.partida || "",
    casa: r.casa || "",
    fora: r.fora || "",
    data_hora: r.data_hora || "",
    mercado: r.mercado || "",
    selecao: r.selecao || "",
    linha: String(r.linha ?? ""),
    odd: r.odd ? Number(r.odd) : null,
    url_evento: r.url_evento || "",
    url_liga: r.url_liga || "",
  }));
  return rows;
}

function groupByEvent(rows) {
  const byEvent = new Map();
  for (const r of rows) {
    const id = r.url_evento || `${r.casa} x ${r.fora} @ ${r.data_hora}`;
    if (!byEvent.has(id)) {
      byEvent.set(id, {
        id,
        casa: r.casa,
        fora: r.fora,
        partida: r.partida || (r.casa && r.fora ? `${r.casa} x ${r.fora}` : ""),
        campeonato: r.campeonato,
        startISO: r.data_hora,
        url_evento: r.url_evento,
        url_liga: r.url_liga,
        odds: {
          "1X2": { "1": null, "X": null, "2": null },
          "DuplaChance": { "1X": null, "12": null, "X2": null },
          "OverUnder": {}, // ex: "2.5" => { Over, Under }
        },
      });
    }
    const ev = byEvent.get(id);
    if (r.mercado === "1X2" && r.selecao && r.odd != null) {
      ev.odds["1X2"][r.selecao] = r.odd;
    } else if (r.mercado === "Dupla Chance" && r.selecao && r.odd != null) {
      ev.odds["DuplaChance"][r.selecao] = r.odd;
    } else if (r.mercado === "Total de Gols" && r.linha) {
      if (!ev.odds["OverUnder"][r.linha]) ev.odds["OverUnder"][r.linha] = { Over: null, Under: null };
      if (r.selecao === "Over") ev.odds["OverUnder"][r.linha].Over = r.odd;
      if (r.selecao === "Under") ev.odds["OverUnder"][r.linha].Under = r.odd;
    }
  }
  return byEvent;
}

function withinWindow(startISO, hours) {
  const now = Date.now();
  const end = now + hours * 3600_000;
  let t = NaN;
  try { t = new Date(startISO).getTime(); } catch {}
  return Number.isFinite(t) && t >= now && t <= end;
}

function toUIMatch(ev) {
  const dt = ev.startISO ? new Date(ev.startISO) : null;
  const time = dt ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const date = dt ? dt.toLocaleDateString("pt-BR") : "";
  const title = ev.partida || (ev.casa && ev.fora ? `${ev.casa} x ${ev.fora}` : "");
  return {
    id: ev.id,
    homeTeam: ev.casa,
    awayTeam: ev.fora,
    time,
    date,
    competition: ev.campeonato,
    odds: {
      home: ev.odds?.["1X2"]?.["1"] ?? null,
      draw: ev.odds?.["1X2"]?.["X"] ?? null,
      away: ev.odds?.["1X2"]?.["2"] ?? null,
    },
    title,          // opcional para UI
    url_evento: ev.url_evento,
    _dt: ev.startISO,     
    _oddsDetail: ev.odds, 
  };
}

function statCsv() {
  try {
    const st = fs.statSync(CSV_PATH);
    return { path: CSV_PATH, size: st.size, mtimeMs: st.mtimeMs };
  } catch {
    return { path: CSV_PATH, size: 0, mtimeMs: null };
  }
}

async function loadCsvIfNeeded() {
  const now = Date.now();
  if (now - CACHE.at < TTL_MS && CACHE.rows.length) return CACHE;

  const text = fs.existsSync(CSV_PATH) ? fs.readFileSync(CSV_PATH, "utf-8") : "";
  const rows = text ? parseCsv(text) : [];
  const byEvent = groupByEvent(rows);
  CACHE = { at: now, rows, byEvent, csvStat: statCsv() };
  return CACHE;
}

async function getUpcomingFromCsv() {
  await loadCsvIfNeeded();
  const out = [];
  for (const ev of CACHE.byEvent.values()) {
    if (withinWindow(ev.startISO, WINDOW_HOURS)) out.push(toUIMatch(ev));
  }
  out.sort((a, b) => (new Date(a._dt).getTime() - new Date(b._dt).getTime()));
  return out;
}

async function getLiveFromCsv() {
  await loadCsvIfNeeded();
  const now = Date.now();
  const pastCut = now - 3 * 3600_000;
  const live = [];
  for (const ev of CACHE.byEvent.values()) {
    const t = ev.startISO ? new Date(ev.startISO).getTime() : NaN;
    if (Number.isFinite(t) && t <= now && t >= pastCut) {
      const m = toUIMatch(ev);
      m.live = { status: "LIVE" }; // placeholder
      live.push(m);
    }
  }
  live.sort((a, b) => (new Date(b._dt).getTime() - new Date(a._dt).getTime()));
  return live;
}

function getCsvMeta() {
  const s = CACHE.csvStat || statCsv();
  return {
    path: s.path || null,
    size: s.size || 0,
    lastUpdated: typeof s.mtimeMs === "number" ? s.mtimeMs : null,
  };
}

module.exports = {
  getUpcomingFromCsv,
  getLiveFromCsv,
  _debugCache: () => CACHE,
  getCsvMeta,
};
