const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/players/csv", (req, res) => {
  const filePath = path.join(__dirname, "..", "data", "players", "players_by_club_2025.csv");
  res.sendFile(filePath);
});

module.exports = router;
