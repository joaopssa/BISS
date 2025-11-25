const fs = require("fs");
const teamNameMap = require("./teamNameMap");

function normalizeName(name) {
  if (!name) return null;
  const mapped = teamNameMap[name.trim()] || name.trim();
  return mapped.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function buildRegex(home, away) {
  return new RegExp(
    `${home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*?${away.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*?(\\d+)-(\\d+)`,
    "i"
  );
}

function findMatchResult(filePath, homeTeamRaw, awayTeamRaw) {
  try {
    if (!fs.existsSync(filePath)) {
      return { found: false, reason: "File not found", filePath };
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n");

    const home = normalizeName(homeTeamRaw);
    const away = normalizeName(awayTeamRaw);

    const regexNormal = new RegExp(
      `${home}.*?v.*?${away}.*?(\\d+)-(\\d+)`,
      "i"
    );

    const regexInvertido = new RegExp(
      `${away}.*?v.*?${home}.*?(\\d+)-(\\d+)`,
      "i"
    );

    // 1️⃣ TENTAR SOMENTE A ORDEM CORRETA (home → away)
    for (let line of lines) {
      const normalized = normalizeName(line);

      if (regexNormal.test(normalized)) {
        const m = line.match(/(\d+)-(\d+)/);
        return {
          found: true,
          homeTeam: homeTeamRaw,
          awayTeam: awayTeamRaw,
          goalsHome: parseInt(m[1]),
          goalsAway: parseInt(m[2]),
          rawLine: line.trim(),
          inverted: false
        };
      }
    }

    // 2️⃣ NÃO ACEITAR ORDEM INVERTIDA — apenas informar
    for (let line of lines) {
      const normalized = normalizeName(line);

      if (regexInvertido.test(normalized)) {
        return {
          found: false,
          reason: "Match found but with inverted home/away — ignoring",
          rawLine: line.trim()
        };
      }
    }

    return {
      found: false,
      reason: "Match not found in TXT",
      homeTeam: homeTeamRaw,
      awayTeam: awayTeamRaw
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}


module.exports = { findMatchResult };
