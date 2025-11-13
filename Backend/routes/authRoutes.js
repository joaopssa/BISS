// Backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const { registerComplete, login } = require("../controllers/authController");

router.post("/register-complete", registerComplete);
router.post("/login", login);

module.exports = router;
