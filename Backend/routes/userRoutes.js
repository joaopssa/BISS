// Backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { updateProfile, getPreferences } = require("../controllers/userController");

// Atualizar perfil
router.put("/profile", authMiddleware, updateProfile);

// Obter preferências do usuário
router.get("/preferences", authMiddleware, getPreferences);

module.exports = router;
