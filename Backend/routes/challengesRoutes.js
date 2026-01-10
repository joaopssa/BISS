const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getDailyToday } = require("../controllers/challengesController");

router.get("/daily/today", authMiddleware, getDailyToday);

module.exports = router;
