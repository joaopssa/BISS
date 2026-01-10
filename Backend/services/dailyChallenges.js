// Backend/services/dailyChallenges.js

/**
 * Faixas:
 * - LOW: 60–90 XP
 * - MID: 100–140 XP
 * - HIGH: 160–260 XP
 *
 * Tipos suportados hoje pelo seu service:
 * - bets_today   (bilhetes criados hoje)
 * - wins_today   (apostas ganhas hoje)
 * - streak_today (sequência atual de vitórias até hoje)
 */

const DAILY_CHALLENGE_POOL = {
  LOW: [
    // bets_today (bilhetes)
    { id: "dl_bets_2", title: "Aquece o jogo", desc: "Registre 2 apostas hoje", type: "bets_today", target: 2, rewardXp: 70 },
    { id: "dl_bets_3", title: "Volume leve", desc: "Registre 3 apostas hoje", type: "bets_today", target: 3, rewardXp: 90 },
    { id: "dl_bets_4", title: "Ritmo constante", desc: "Registre 4 apostas hoje", type: "bets_today", target: 4, rewardXp: 85 },

    // wins_today
    { id: "dl_win_1", title: "Uma cravada", desc: "Ganhe 1 aposta hoje", type: "wins_today", target: 1, rewardXp: 80 },
    { id: "dl_win_1b", title: "Vitória do dia", desc: "Confirme 1 vitória hoje", type: "wins_today", target: 1, rewardXp: 90 },

    // streak_today
    { id: "dl_streak_1", title: "Embalou", desc: "Atinja streak 1+ hoje", type: "streak_today", target: 1, rewardXp: 70 },
  ],

  MID: [
    // bets_today
    { id: "dm_bets_5", title: "Dia movimentado", desc: "Registre 5 apostas hoje", type: "bets_today", target: 5, rewardXp: 120 },
    { id: "dm_bets_6", title: "Gasolina no motor", desc: "Registre 6 apostas hoje", type: "bets_today", target: 6, rewardXp: 130 },
    { id: "dm_bets_7", title: "Stack ativo", desc: "Registre 7 apostas hoje", type: "bets_today", target: 7, rewardXp: 140 },

    // wins_today
    { id: "dm_win_2", title: "Duas vitórias", desc: "Ganhe 2 apostas hoje", type: "wins_today", target: 2, rewardXp: 130 },
    { id: "dm_win_3", title: "Tripla moral", desc: "Ganhe 3 apostas hoje", type: "wins_today", target: 3, rewardXp: 140 },

    // streak_today
    { id: "dm_streak_2", title: "Sequência de 2", desc: "Atinja streak 2+ hoje", type: "streak_today", target: 2, rewardXp: 140 },
    { id: "dm_streak_3", title: "Sequência de 3", desc: "Atinja streak 3+ hoje", type: "streak_today", target: 3, rewardXp: 135 },
  ],

  HIGH: [
    // bets_today
    { id: "dh_bets_10", title: "Maratona", desc: "Registre 10 apostas hoje", type: "bets_today", target: 10, rewardXp: 200 },
    { id: "dh_bets_12", title: "Insano de volume", desc: "Registre 12 apostas hoje", type: "bets_today", target: 12, rewardXp: 230 },

    // wins_today
    { id: "dh_win_4", title: "Dia perfeito", desc: "Ganhe 4 apostas hoje", type: "wins_today", target: 4, rewardXp: 200 },
    { id: "dh_win_5", title: "Mão quente", desc: "Ganhe 5 apostas hoje", type: "wins_today", target: 5, rewardXp: 240 },

    // streak_today
    { id: "dh_streak_4", title: "Em chamas", desc: "Atinja streak 4+ hoje", type: "streak_today", target: 4, rewardXp: 190 },
    { id: "dh_streak_5", title: "Imparável", desc: "Atinja streak 5+ hoje", type: "streak_today", target: 5, rewardXp: 230 },
    { id: "dh_streak_6", title: "Lenda do dia", desc: "Atinja streak 6+ hoje", type: "streak_today", target: 6, rewardXp: 260 },
  ],
};

// ---------- seleção determinística (por dia + usuário) ----------

// hash simples (determinístico)
function hashString(str) {
  let h = 2166136261; // FNV-ish
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickFrom(arr, seedStr) {
  if (!arr || arr.length === 0) return null;
  const idx = hashString(seedStr) % arr.length;
  return arr[idx];
}

/**
 * Retorna 3 desafios por dia:
 * - 1 LOW
 * - 1 MID
 * - 1 HIGH
 * Detalhe: usa userId + dateStr para não “rerolar” ao atualizar a página.
 */
function getDailyChallengesForUserAndDate(userId, dateStr) {
  const low = pickFrom(DAILY_CHALLENGE_POOL.LOW, `LOW:${userId}:${dateStr}`);
  const mid = pickFrom(DAILY_CHALLENGE_POOL.MID, `MID:${userId}:${dateStr}`);
  const high = pickFrom(DAILY_CHALLENGE_POOL.HIGH, `HIGH:${userId}:${dateStr}`);

  // fallback defensivo
  return [low, mid, high].filter(Boolean);
}

module.exports = { DAILY_CHALLENGE_POOL, getDailyChallengesForUserAndDate };
