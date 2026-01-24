// Backend/utils/matchFiles.js
const path = require("path");

module.exports = {
  "Brasileirão - Série A Betano": path.join(
    __dirname,
    "../data/matches/brasileirao-serie-a/brasileirao_2026.csv"
  ),
  "Brasileirão - Série B": path.join(
    __dirname,
    "../data/matches/brasileirao-serie-b/brasileiraoB_2025.csv"
  ),
  "Bundesliga": path.join(
    __dirname,
    "../data/matches/bundesliga/2025_26_bundesliga.csv"
  ),
  "Liga dos Campeões": path.join(
    __dirname,
    "../data/matches/champions/champions_2025_26.csv"
  ),
  "La Liga": path.join(
    __dirname,
    "../data/matches/laliga/laliga_2025_26.csv"
  ),
  "Copa Libertadores": path.join(
    __dirname,
    "../data/matches/libertadores/libertadores_2025.csv"
  ),
  "Ligue 1": path.join(
    __dirname,
    "../data/matches/ligue1/ligue1_2025_26.csv"
  ),
  "Premier League": path.join(
    __dirname,
    "../data/matches/premier-league/2025_26_premierleague.csv"
  ),
  "Série A": path.join(
    __dirname,
    "../data/matches/serie-a-tim/seriea_2025_26.csv"
  ),
};
