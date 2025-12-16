// Backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { updateProfile, getPreferences, checkBettingControl } = require("../controllers/userController");

// Atualizar perfil
router.put("/profile", authMiddleware, updateProfile);

// Obter preferências do usuário
router.get("/preferences", authMiddleware, getPreferences);

// Verificar controle de apostas e contar apostas de hoje
router.get("/betting-control-status", authMiddleware, checkBettingControl);

module.exports = router;
