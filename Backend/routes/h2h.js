// routes/h2h.js

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// ---------------------------------------------------------
// NORMALIZAÇÃO UNIVERSAL DE NOMES
// ---------------------------------------------------------
function normalize(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[—–\-]/g, "-") // normaliza hífens unicode
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function teamsMatch(a, b) {
  return normalize(a) === normalize(b);
}

// ---------------------------------------------------------
// Mapeamento de ligas -> pastas relevantes
// ---------------------------------------------------------
const CSV_MAP = {
  "Brasileirão - Série A Betano": ["data/matches/brasileirao-serie-a"],
  "Brasileirão - Série B": ["data/matches/brasileirao-serie-b"],
  "Copa Libertadores": ["data/matches/libertadores"],

  "Bundesliga": ["data/matches/bundesliga", "data/matches/champions"],
  "La Liga": ["data/matches/laliga", "data/matches/champions"],
  "Série A": ["data/matches/serie-a-tim", "data/matches/champions"],
  "Premier League": ["data/matches/premier-league", "data/matches/champions"],
  "Ligue 1": ["data/matches/ligue1", "data/matches/champions"],

  "Liga dos Campeões": [
    "data/matches/champions",
    "data/matches/bundesliga",
    "data/matches/laliga",
    "data/matches/serie-a-tim",
    "data/matches/premier-league",
    "data/matches/ligue1"
  ]
};

// ---------------------------------------------------------
// Leitura robusta de CSV
// ---------------------------------------------------------
function readCSV(filepath) {
  return new Promise((resolve) => {
    const rows = [];

    fs.createReadStream(filepath)
      .pipe(csv())
      .on("data", (row) => {
        if (!row.FullTime) return;

        const fullTime = row.FullTime.replace(/[–—]/g, "-");
        if (!fullTime.includes("-")) return;

        rows.push({
          date: row.Date,
          home: row.Home,
          away: row.Away,
          fullTime,
          rawCompetition: path.basename(filepath).replace(".csv", "")
        });
      })
      .on("end", () => resolve(rows))
      .on("error", () => resolve([]));
  });
}

// ---------------------------------------------------------
// Carregar todos os jogos possíveis entre TeamA e TeamB
// ---------------------------------------------------------
async function loadAllMatches(teamA, teamB, league) {
  const folders = CSV_MAP[league];
  if (!folders) return [];

  let allMatches = [];

  for (const folder of folders) {
    const absolute = path.join(__dirname, "..", folder);
    if (!fs.existsSync(absolute)) continue;

    const files = fs.readdirSync(absolute).filter((f) => f.endsWith(".csv"));

    for (const file of files) {
      const filepath = path.join(absolute, file);
      const data = await readCSV(filepath);

      const filtered = data.filter((m) => {
        const isDirect = teamsMatch(m.home, teamA) && teamsMatch(m.away, teamB);
        const isReverse = teamsMatch(m.home, teamB) && teamsMatch(m.away, teamA);
        return isDirect || isReverse;
      });

      allMatches.push(...filtered);
    }
  }

  allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
  return allMatches;
}

// ---------------------------------------------------------
// ROTA PRINCIPAL
// ---------------------------------------------------------
router.get("/", async (req, res) => {
  const { homeTeam, awayTeam, competition } = req.query;

  if (!homeTeam || !awayTeam || !competition) {
    return res.status(400).json({ error: "Parâmetros incompletos." });
  }

  const teamA = homeTeam;
  const teamB = awayTeam;

  const matches = await loadAllMatches(teamA, teamB, competition);

  if (matches.length === 0) {
    return res.json({
      hasHistory: false,
      stats: null,
      matches: []
    });
  }

  // Estatísticas
  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let goalsA = 0;
  let goalsB = 0;

  for (const m of matches) {
    const [gh, ga] = m.fullTime.split("-").map(Number);

    if (teamsMatch(m.home, teamA)) {
      goalsA += gh;
      goalsB += ga;

      if (gh > ga) winsA++;
      else if (gh < ga) winsB++;
      else draws++;
    } else {
      goalsA += ga;
      goalsB += gh;

      if (ga > gh) winsA++;
      else if (ga < gh) winsB++;
      else draws++;
    }
  }

  const total = matches.length;

  // SUBSTITUIR rawCompetition → competition original da requisição, ex: "La Liga"
  const cleanedMatches = matches.map((m) => ({
    ...m,
    competition
  }));

  return res.json({
    hasHistory: true,
    stats: {
      total,
      homeTeam: teamA,
      awayTeam: teamB,
      homeWins: winsA,
      draws,
      awayWins: winsB,
      avgHomeGoals: total ? goalsA / total : 0,
      avgAwayGoals: total ? goalsB / total : 0
    },
    matches: cleanedMatches,
    lastMatches: cleanedMatches.slice(0, 5)
  });
});

module.exports = router;
