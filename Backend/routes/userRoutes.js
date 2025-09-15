const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { updateProfile } = require('../controllers/userController');

// Rota protegida: só pode ser acessada com um token válido
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;