const fs = require("fs");

const matchRegex = /(\d{1,2}\.\d{2})\s+(.*?)\s+v\s+(.*?)\s+(\d+)-(\d+)\s+\((\d+)-(\d+)\)/;

function parseTXT(filepath, timeCasa, timeFora) {
  const text = fs.readFileSync(filepath, "utf8");
  const lines = text.split("\n");

  for (const line of lines) {
    const match = line.match(matchRegex);
    if (!match) continue;

    const [, hora, casa, fora, ftHome, ftAway, htHome, htAway] = match;

    const normalize = str => str.toLowerCase().replace(/\s+/g, "");

    if (
      normalize(casa).includes(normalize(timeCasa)) &&
      normalize(fora).includes(normalize(timeFora))
    ) {
      return {
        golsCasa: Number(ftHome),
        golsFora: Number(ftAway),
        htCasa: Number(htHome),
        htFora: Number(htAway),
        hora
      };
    }
  }

  return null;
}

module.exports = { parseTXT };
