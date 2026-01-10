const { getDailyChallengesToday } = require("../services/dailyChallengesService");

exports.getDailyToday = async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = await getDailyChallengesToday(userId);
    return res.json(payload);
  } catch (error) {
    console.error("❌ Erro em getDailyToday:", error);
    return res.status(500).json({ message: "Erro ao carregar desafios diários." });
  }
};
