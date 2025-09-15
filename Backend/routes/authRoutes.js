const express = require('express');
const router = express.Router();
const { registerComplete, login } = require('../controllers/authController.js');

// Rota para o processo de cadastro que recebe todos os dados de uma vez
router.post('/register-complete', registerComplete);

// Rota para autenticação (login)
router.post('/login', login);

module.exports = router;