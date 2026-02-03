// Backend/services/h2hPool.js

function normalizeCompName(s) {
  return String(s || "").trim();
}

const COMP = {
  BRA_A: "Brasileirão - Série A Betano",
  BRA_B: "Brasileirão - Série B",
  LIB: "Copa Libertadores",
  UCL: "Liga dos Campeões",
  EPL: "Premier League",
  LALIGA: "La Liga",
  SERIEA: "Série A",
  BUND: "Bundesliga",
  L1: "Ligue 1",
};

const BRA_POOL = [COMP.BRA_A, COMP.BRA_B, COMP.LIB];
const EURO_TOP5 = [COMP.L1, COMP.BUND, COMP.SERIEA, COMP.LALIGA, COMP.EPL];

function getCompetitionsPool(currentCompetition) {
  const c = normalizeCompName(currentCompetition);

  // Brasil: sempre consulta o pool Brasil inteiro
  if (c === COMP.BRA_A || c === COMP.BRA_B || c === COMP.LIB) {
    return BRA_POOL;
  }

  // Champions: consulta Top5 + Champions
  if (c === COMP.UCL) {
    return [...EURO_TOP5, COMP.UCL];
  }

  // Ligas europeias: liga + Champions
  if (EURO_TOP5.includes(c)) {
    return [c, COMP.UCL];
  }

  // fallback: consulta só a própria competição
  return c ? [c] : [];
}

module.exports = {
  COMP,
  getCompetitionsPool,
};
