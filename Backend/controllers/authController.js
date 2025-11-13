// Backend/controllers/authController.js
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.registerComplete = async (req, res) => {
    const {
        nomeCompleto,
        email,
        dataNascimento,
        senha,
        favoriteTeam,
        favoriteLeagues,
        favoritePlayers,
        favoriteBettingHouses,
        bettingControl,
        financialMonitoring,
        betOnlyFavoriteLeagues,
        oddsRange,
        investmentLimit
    } = req.body;

    if (!nomeCompleto || !email || !dataNascimento || !senha) {
        return res.status(400).json({ message: "Dados de cadastro incompletos." });
    }

    try {
        const [existingUser] = await pool.query(
            "SELECT email FROM usuarios WHERE email = ?",
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: "Este e-mail já está cadastrado." });
        }

        const salt = await bcrypt.genSalt(10);
        const hash_senha = await bcrypt.hash(senha, salt);

        const newUser = {
            nome_completo: nomeCompleto,
            email,
            data_nascimento: dataNascimento,
            hash_senha,
            clubes_favoritos: favoriteTeam || null,
            ligas_favoritas: JSON.stringify(favoriteLeagues || []),
            jogadores_favoritos: JSON.stringify(favoritePlayers || []),
            casas_apostas_favoritas: JSON.stringify(favoriteBettingHouses || []),
            controle_apostas_ativo: bettingControl !== undefined ? bettingControl : 1,
            monitoramento_financeiro_ativo: financialMonitoring !== undefined ? financialMonitoring : 1,
            apostar_apenas_ligas_favoritas: betOnlyFavoriteLeagues !== undefined ? betOnlyFavoriteLeagues : 0,
            odd_minima: oddsRange ? oddsRange[0] : 1.50,
            odd_maxima: oddsRange ? oddsRange[1] : 3.00,
            limite_investimento_mensal: investmentLimit || null,
        };

        const [result] = await pool.query("INSERT INTO usuarios SET ?", newUser);

        res.status(201).json({
            message: "Usuário cadastrado com sucesso!",
            userId: result.insertId,
        });

    } catch (error) {
        console.error("Erro no cadastro completo:", error);
        res.status(500).json({ message: "Erro no servidor ao tentar cadastrar." });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
    }

    try {
        const [users] = await pool.query(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        const user = users[0];

        const valid = await bcrypt.compare(password, user.hash_senha);
        if (!valid) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        const payload = { user: { id: user.id_usuario } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({
            token,
            user: {
                id: user.id_usuario,
                name: user.nome_completo,
                email: user.email,
            },
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
};
