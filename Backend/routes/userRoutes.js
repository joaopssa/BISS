// Backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { updateProfile } = require("../controllers/userController");

// Rota protegida para atualizar o perfil
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;
