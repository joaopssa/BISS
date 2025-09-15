const pool = require('../db');

exports.updateProfile = async (req, res) => {
    // O ID do usuário vem do token verificado pelo middleware
    const userId = req.user.id; 

    // Mapeia os nomes do frontend para as colunas do banco de dados
    const {
        favoriteTeam,
        favoriteLeagues, // Lembre-se de adicionar a coluna `ligas_favoritas` no seu BD
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
            clubes_favoritos: favoriteTeam,
            ligas_favoritas: JSON.stringify(favoriteLeagues || []),
            jogadores_favoritos: JSON.stringify(favoritePlayers || []),
            casas_apostas_favoritas: JSON.stringify(favoriteBettingHouses || []),
            controle_apostas_ativo: bettingControl,
            monitoramento_financeiro_ativo: financialMonitoring,
            apostar_apenas_ligas_favoritas: betOnlyFavoriteLeagues,
            odd_minima: oddsRange[0],
            odd_maxima: oddsRange[1],
            limite_investimento_mensal: investmentLimit,
        };

        await pool.query('UPDATE usuarios SET ? WHERE id_usuario = ?', [profileData, userId]);
        
        res.json({ message: "Perfil atualizado com sucesso!" });

    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ message: "Erro no servidor ao atualizar o perfil." });
    }
};