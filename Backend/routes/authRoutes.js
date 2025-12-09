// Backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const { registerComplete, login, me } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/me", authMiddleware, me);

router.post("/register-complete", registerComplete);
router.post("/login", login);

module.exports = router;
