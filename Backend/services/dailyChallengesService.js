// Backend/services/dailyChallengesService.js
const pool = require("../db");
const { getDailyChallengesForUserAndDate } = require("./dailyChallenges");


// ✅ YYYY-MM-DD no fuso LOCAL (sem UTC / toISOString)
function getTodayStrLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toYYYYMMDDLocal(dateLike) {
  const dt = new Date(dateLike);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function computeWinStreakUpToDate(userId, dateStr) {
  // streak de vitórias (apostas não-pendentes) até a data
  const [rows] = await pool.query(
    `
    SELECT status_aposta
    FROM apostas
    WHERE id_usuario = ?
      AND status_aposta <> 'pendente'
      AND DATE(data_registro) <= ?
    ORDER BY data_registro DESC
    LIMIT 500
    `,
    [userId, dateStr]
  );

  let streak = 0;
  for (const r of rows) {
    const st = String(r.status_aposta || "").toLowerCase();
    if (st === "ganha") streak += 1;
    else break;
  }
  return streak;
}

async function computeDailyProgress(userId, dateStr) {
  // bets_today
  const [betsRows] = await pool.query(
      `
      SELECT COUNT(*) AS bets_today
      FROM bilhetes
      WHERE id_usuario = ?
        AND DATE(data_criacao) = ?
      `,
    [userId, dateStr]
  );
  const betsToday = Number(betsRows?.[0]?.bets_today || 0);

  // wins_today
  const [winsRows] = await pool.query(
    `
    SELECT COUNT(*) AS wins_today
    FROM apostas
    WHERE id_usuario = ?
      AND DATE(data_registro) = ?
      AND status_aposta = 'ganha'
    `,
    [userId, dateStr]
  );
  const winsToday = Number(winsRows?.[0]?.wins_today || 0);

  // streak_today (sequência atual de vitórias até hoje)
  const streakToday = await computeWinStreakUpToDate(userId, dateStr);

  const DAILY_CHALLENGES = getDailyChallengesForUserAndDate(userId, dateStr);

  const challenges = DAILY_CHALLENGES.map((c) => {

    let current = 0;

    if (c.type === "bets_today") current = betsToday;
    if (c.type === "wins_today") current = winsToday;
    if (c.type === "streak_today") current = streakToday;

    const done = current >= c.target;

    return {
      id: c.id,
      title: c.title,
      desc: c.desc,
      type: c.type,
      target: c.target,
      rewardXp: c.rewardXp,
      current,
      done,
    };
  });

  const completedCount = challenges.filter((x) => x.done).length;
  const totalCount = challenges.length;
  const completedAll = completedCount === totalCount;

  return { challenges, completedCount, totalCount, completedAll };
}

async function upsertDailySummary(userId, dateStr, completedCount, totalCount, completedAll) {
  await pool.query(
    `
    INSERT INTO daily_challenge_summary
      (user_id, challenge_date, completed_count, total_count, completed_all)
    VALUES
      (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      completed_count = VALUES(completed_count),
      total_count = VALUES(total_count),
      completed_all = VALUES(completed_all),
      updated_at = CURRENT_TIMESTAMP
    `,
    [userId, dateStr, completedCount, totalCount, completedAll ? 1 : 0]
  );
}

async function computeDailyStreakDays(userId, todayStr) {
  // pega todos os dias completos do usuário (mais recentes)
  const [rows] = await pool.query(
    `
    SELECT challenge_date
    FROM daily_challenge_summary
    WHERE user_id = ?
      AND completed_all = 1
    ORDER BY challenge_date DESC
    LIMIT 370
    `,
    [userId]
  );

  const completedSet = new Set(rows.map((r) => toYYYYMMDDLocal(r.challenge_date)));

  // conta dias consecutivos desde hoje
  const base = new Date(todayStr + "T00:00:00");
  let streakDays = 0;

  for (let i = 0; i < 370; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const iso = toYYYYMMDDLocal(d);

    if (completedSet.has(iso)) streakDays += 1;
    else break;
  }

  return streakDays;
}

async function getLifetimeCompletedDaysCount(userId) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS total_days_completed
    FROM daily_challenge_summary
    WHERE user_id = ?
      AND completed_all = 1
    `,
    [userId]
  );

  return Number(rows?.[0]?.total_days_completed || 0);
}

async function getDailyChallengesToday(userId) {
  const todayStr = getTodayStrLocal();

  // 1) calcula progresso real
  const progress = await computeDailyProgress(userId, todayStr);

  // 2) salva snapshot do dia (essencial pro streak real)
  await upsertDailySummary(
    userId,
    todayStr,
    progress.completedCount,
    progress.totalCount,
    progress.completedAll
  );

  // 3) streak real + total histórico
  const [streakDays, totalDaysCompleted] = await Promise.all([
    computeDailyStreakDays(userId, todayStr),
    getLifetimeCompletedDaysCount(userId),
  ]);

  return {
    date: todayStr,
    completedCountToday: progress.completedCount,
    totalCountToday: progress.totalCount,
    totalDaysCompleted,
    streakDays,
    challenges: progress.challenges,
  };
}

module.exports = { getDailyChallengesToday };
