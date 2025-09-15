const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middlewares
app.use(cors()); // Permite requisições de outras origens (seu frontend)
app.use(express.json()); // Permite que o express entenda JSON no corpo das requisições

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));