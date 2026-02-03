// Backend/services/h2hService.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { getCompetitionsPool } = require("./h2hPool");

// Ajuste aqui para onde você salva os CSVs de partidas (históricos)
const MATCHES_ROOT = path.resolve(__dirname, "..", "data", "matches");

// ------------------------
// Normalização (igual ao seu update)
// ------------------------
function normalizeKey(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function safeDateStr(s) {
  const t = String(s || "").trim();
  return t; // seus CSVs já estão YYYY-MM-DD
}

function isFinishedRow(row) {
  return row && row.Date && row.FullTime && String(row.FullTime).trim() !== "";
}

function parseScore(fullTime) {
  const m = String(fullTime || "").trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return null;
  return { hg: Number(m[1]), ag: Number(m[2]) };
}

// ------------------------
// Leitura de CSV (stream)
// ------------------------
function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const out = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => out.push(row))
      .on("end", () => resolve(out))
      .on("error", reject);
  });
}

/**
 * Encontra todos os CSVs dentro de Backend/data/matches/**.
 * Você pode filtrar por ligas se quiser, mas aqui vamos ler tudo e filtrar por competição.
 */
function listAllMatchCsvFiles() {
  const files = [];
  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const fp = path.join(dir, it.name);
      if (it.isDirectory()) walk(fp);
      else if (it.isFile() && fp.toLowerCase().endsWith(".csv")) files.push(fp);
    }
  }
  walk(MATCHES_ROOT);
  return files;
}

/**
 * ⚠️ IMPORTANTE:
 * Seus CSVs de matches não têm "competition" dentro (pelo que você mostrou).
 * Então, para H2H MULTI-LIGA, você precisa de um "mapa pasta -> nome do campeonato".
 *
 * Ex.: pasta "premier-league" => "Premier League"
 *      pasta "brasileirao-serie-a" => "Brasileirão - Série A Betano"
 */
const FOLDER_TO_COMP = {
  "brasileirao-serie-a": "Brasileirão - Série A Betano",
  "brasileirao-serie-b": "Brasileirão - Série B",
  "copa-libertadores": "Copa Libertadores",

  "premier-league": "Premier League",
  "laliga": "La Liga",
  "serie-a-tim": "Série A",
  "bundesliga": "Bundesliga",
  "ligue1": "Ligue 1",

  // se você tiver champions em pasta própria:
  "liga-dos-campeoes": "Liga dos Campeões",
  "champions-league": "Liga dos Campeões",
};

function inferCompetitionFromPath(csvPath) {
  const parts = csvPath.split(path.sep);
  // .../data/matches/<folder>/<file>.csv
  const idx = parts.findIndex((p) => p === "matches");
  const folder = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : "";
  return FOLDER_TO_COMP[folder] || folder || "Liga";
}

// ------------------------
// Core: pega H2H + stats consultando pool
// ------------------------
async function getH2H({ homeTeam, awayTeam, currentCompetition, limit = 50 }) {
  const pool = getCompetitionsPool(currentCompetition);

  const homeK = normalizeKey(homeTeam);
  const awayK = normalizeKey(awayTeam);

  const files = listAllMatchCsvFiles();

  const matches = [];

  for (const fp of files) {
    const comp = inferCompetitionFromPath(fp);

    // só consulta arquivos que estejam no pool
    if (pool.length && !pool.includes(comp)) continue;

    let rows;
    try {
      rows = await readCsv(fp);
    } catch {
      continue;
    }

    for (const r of rows) {
      if (!isFinishedRow(r)) continue;

      const h = normalizeKey(r.Home);
      const a = normalizeKey(r.Away);

      const isSame =
        (h === homeK && a === awayK) || (h === awayK && a === homeK);

      if (!isSame) continue;

      matches.push({
        date: safeDateStr(r.Date),
        competition: comp,
        home: r.Home,
        away: r.Away,
        fullTime: r.FullTime,
        halfTime: r.HalfTime || null,
      });
    }
  }

  // ordena do mais recente para o mais antigo
  matches.sort((x, y) => (y.date || "").localeCompare(x.date || ""));

  const sliced = matches.slice(0, Math.max(1, limit));

  // stats do jeito que seu modal usa
  const stats = buildStats(sliced, homeTeam, awayTeam);

  return { pool, stats: sliced.length ? stats : null, matches: sliced };
}

function buildStats(matches, homeTeam, awayTeam) {
  const homeK = normalizeKey(homeTeam);
  const awayK = normalizeKey(awayTeam);

  let total = 0,
    homeWins = 0,
    awayWins = 0,
    draws = 0,
    sumHomeGoals = 0,
    sumAwayGoals = 0;

  for (const m of matches) {
    const sc = parseScore(m.fullTime);
    if (!sc) continue;

    // precisamos alinhar o "homeTeam/awayTeam" do request com o lado real do jogo
    const mh = normalizeKey(m.home);
    const ma = normalizeKey(m.away);

    total += 1;

    // gols do "homeTeam" do request
    let goalsHomeTeam = 0;
    let goalsAwayTeam = 0;

    if (mh === homeK && ma === awayK) {
      goalsHomeTeam = sc.hg;
      goalsAwayTeam = sc.ag;
    } else if (mh === awayK && ma === homeK) {
      // invertido
      goalsHomeTeam = sc.ag;
      goalsAwayTeam = sc.hg;
    } else {
      continue;
    }

    sumHomeGoals += goalsHomeTeam;
    sumAwayGoals += goalsAwayTeam;

    if (goalsHomeTeam > goalsAwayTeam) homeWins += 1;
    else if (goalsHomeTeam < goalsAwayTeam) awayWins += 1;
    else draws += 1;
  }

  return {
    totalMatches: total,
    homeWins,
    awayWins,
    draws,
    avgHomeGoals: total ? sumHomeGoals / total : 0,
    avgAwayGoals: total ? sumAwayGoals / total : 0,
  };
}

module.exports = { getH2H };
