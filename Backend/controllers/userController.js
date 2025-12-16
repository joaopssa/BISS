// Backend/controllers/userController.js
const pool = require("../db");

exports.updateProfile = async (req, res) => {
    const userId = req.user.id;

    const {
        favoriteTeam,
        favoriteLeagues,
        favoritePlayers,
        favoriteBettingHouses,
        bettingControl,
        financialMonitoring,
        betOnlyFavoriteLeagues,
        oddsRange,
        investmentLimit,
    } = req.body;

    try {
        const profileData = {
            clubes_favoritos: favoriteTeam || null,
            ligas_favoritas: JSON.stringify(favoriteLeagues || []),
            jogadores_favoritos: JSON.stringify(favoritePlayers || []),
            casas_apostas_favoritas: JSON.stringify(favoriteBettingHouses || []),
            controle_apostas_ativo: bettingControl ? 1 : 0,
            monitoramento_financeiro_ativo: financialMonitoring ? 1 : 0,
            apostar_apenas_ligas_favoritas: betOnlyFavoriteLeagues ? 1 : 0,
            odd_minima: oddsRange ? oddsRange[0] : 1.50,
            odd_maxima: oddsRange ? oddsRange[1] : 3.00,
            limite_investimento_mensal: investmentLimit || null,
        };

        await pool.query(
            "UPDATE usuarios SET ? WHERE id_usuario = ?",
            [profileData, userId]
        );

        res.json({ message: "Perfil atualizado com sucesso!" });

    } catch (error) {
        console.error("❌ Erro ao atualizar perfil:", error);
        res.status(500).json({ message: "Erro no servidor ao atualizar o perfil." });
    }
};

exports.getPreferences = async (req, res) => {
    const userId = req.user.id;

    try {
        const [rows] = await pool.query(
            "SELECT ligas_favoritas FROM usuarios WHERE id_usuario = ?",
            [userId]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        let raw = rows[0].ligas_favoritas;
        let ligas = [];

        // Caso 1: null, undefined ou vazio
        if (!raw) {
            ligas = [];
        }
        // Caso 2: já é array (MySQL pode retornar JSON direto como array JS)
        else if (Array.isArray(raw)) {
            ligas = raw;
        }
        // Caso 3: é string
        else if (typeof raw === "string") {
            // tenta JSON.parse
            try {
                const parsed = JSON.parse(raw);

                // se o parsed for array → perfeito
                if (Array.isArray(parsed)) {
                    ligas = parsed;
                }
                // se for string simples → vira array
                else if (typeof parsed === "string") {
                    ligas = [parsed];
                }
                // qualquer outro tipo → ignora
                else {
                    ligas = [];
                }
            } catch {
                // string NÃO-JSON → vira array com 1 item
                ligas = [raw];
            }
        }
        // Caso 4: tipo inesperado → tenta converter para string
        else {
            ligas = [String(raw)];
        }

        res.json({ ligasFavoritas: ligas });

    } catch (error) {
        console.error("Erro ao obter preferências:", error);
        res.status(500).json({ message: "Erro no servidor ao carregar preferências." });
    }
};

// Verificar status do controle de apostas e contar apostas de hoje
exports.checkBettingControl = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Buscar status de controle_apostas_ativo do usuário
        const [userRows] = await pool.query(
            "SELECT controle_apostas_ativo FROM usuarios WHERE id_usuario = ?",
            [userId]
        );

        if (!userRows.length) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        const bettingControlActive = userRows[0].controle_apostas_ativo === 1;

        // 2. Contar bilhetes criados HOJE (data_criacao >= hoje às 00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        const [todayBetsRows] = await pool.query(
            `SELECT COUNT(*) as count FROM bilhetes 
             WHERE id_usuario = ? AND DATE(data_criacao) = ?
            `,
            [userId, todayStr]
        );

        const betsTodayCount = todayBetsRows[0]?.count || 0;

        // 3. Retornar status
        res.json({
            bettingControlActive,
            betsTodayCount,
            dailyLimit: 3,
            canPlaceBet: !bettingControlActive || betsTodayCount < 3,
            message: bettingControlActive && betsTodayCount >= 3 
                ? "Você atingiu o limite de 3 apostas por dia." 
                : null
        });

    } catch (error) {
        console.error("Erro ao verificar controle de apostas:", error);
        res.status(500).json({ message: "Erro no servidor ao verificar controle de apostas." });
    }
};
