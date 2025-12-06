// Backend/utils/parseMatchFile.js
// Agora trabalha com arquivos CSV em vez de TXT.
//
// Formato mínimo esperado nos CSVs:
// Matchday,Date,Home,Away,FullTime,HalfTime
// (alguns possuem também Day e Penalties)
//
// A função exposta mantém a mesma assinatura usada no controller:
//   findMatchResult(filePath, homeTeam, awayTeam)
// e retorna:
//   { found: true, goalsHome: number, goalsAway: number }
// ou
//   { found: false }

const fs = require("fs");

// Cache simples em memória para não reler o mesmo CSV a cada aposta
const cache = {};

/**
 * Lê e parseia o CSV de resultados de uma liga.
 * Retorna uma lista de objetos no formato:
 *   { home: string, away: string, fullTime: string }
 */
function loadMatchesFromCSV(filePath) {
  if (cache[filePath]) {
    return cache[filePath];
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error("[parseMatchFile] Erro ao ler CSV:", filePath, err.message);
    cache[filePath] = [];
    return cache[filePath];
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("="));

  if (lines.length === 0) {
    cache[filePath] = [];
    return cache[filePath];
  }

  // Primeira linha = cabeçalho
  const header = lines[0].split(",").map((h) => h.trim());

  const idxHome = header.indexOf("Home");
  const idxAway = header.indexOf("Away");
  const idxFull = header.indexOf("FullTime");

  if (idxHome === -1 || idxAway === -1 || idxFull === -1) {
    console.error(
      "[parseMatchFile] Cabeçalho CSV não possui colunas Home/Away/FullTime em:",
      filePath
    );
    cache[filePath] = [];
    return cache[filePath];
  }

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Como seus CSVs de resultados não usam vírgula dentro dos nomes,
    // o split direto funciona bem.
    const cols = line.split(",");

    const home = (cols[idxHome] || "").trim();
    const away = (cols[idxAway] || "").trim();
    const fullTime = (cols[idxFull] || "").trim();

    if (!home && !away) continue;

    rows.push({ home, away, fullTime });
  }

  cache[filePath] = rows;
  return rows;
}

/**
 * Encontra o resultado de um jogo específico no CSV,
 * usando correspondência EXATA entre home/away.
 *
 * @param {string} filePath - caminho do CSV da liga
 * @param {string} homeTeam - time mandante (deve bater com coluna Home)
 * @param {string} awayTeam - time visitante (deve bater com coluna Away)
 *
 * @returns {{found: boolean, goalsHome?: number, goalsAway?: number}}
 */
function findMatchResult(filePath, homeTeam, awayTeam) {
  if (!homeTeam || !awayTeam) {
    return { found: false };
  }

  const matches = loadMatchesFromCSV(filePath);

  // Correspondência EXATA
  const match = matches.find(
    (m) => m.home === homeTeam && m.away === awayTeam
  );

  if (!match) {
    // Não achou esse confronto no CSV
    return { found: false };
  }

  const full = (match.fullTime || "").trim();

  // Log bonito da PARTIDA ENCONTRADA
  console.log(`
---------------------------------------------
✅ PARTIDA ENCONTRADA NO CSV
📄 Arquivo: ${filePath}
🏟️ Match: ${homeTeam} vs ${awayTeam}
🔢 FullTime: ${full || "sem placar disponível"}
---------------------------------------------
`);

  // Se não houver placar final → mantém como pendente
  if (!full || !/^\d+\s*-\s*\d+$/.test(full)) {
    return { found: false };
  }

  const [gHStr, gAStr] = full.split("-");
  const gH = Number(gHStr.trim());
  const gA = Number(gAStr.trim());

  if (Number.isNaN(gH) || Number.isNaN(gA)) {
    return { found: false };
  }

  return {
    found: true,
    goalsHome: gH,
    goalsAway: gA,
  };
}


module.exports = {
  findMatchResult,
};
