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


