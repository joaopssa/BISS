import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Trophy, Target, TrendingUp, Award, Crown, Medal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContexts';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";
import EditProfileCard from '@/components/app/EditProfileCard';

type BISSTier = {
  key: string;
  name: string;
  xp: number;
  bets: number;
  wins: number;
  acc: number; // % mínimo de acerto
};


export const BISS_TIERS: BISSTier[] = [
  { key: "INI", name: "Iniciante", xp: 0, bets: 0, wins: 0, acc: 0 },

  { key: "AM1", name: "Amador I", xp: 2500, bets: 12, wins: 4, acc: 25 },
  { key: "AM2", name: "Amador II", xp: 5000, bets: 25, wins: 10, acc: 25 },
  { key: "AM3", name: "Amador III", xp: 8000, bets: 40, wins: 18, acc: 25 },

  { key: "SP1", name: "Semi-Profissional I", xp: 12000, bets: 70, wins: 35, acc: 30 },
  { key: "SP2", name: "Semi-Profissional II", xp: 18000, bets: 110, wins: 60, acc: 35 },
  { key: "SP3", name: "Semi-Profissional III", xp: 25000, bets: 160, wins: 90, acc: 40 },

  { key: "PR1", name: "Profissional I", xp: 35000, bets: 230, wins: 130, acc: 45 },
  { key: "PR2", name: "Profissional II", xp: 50000, bets: 320, wins: 190, acc: 50 },
  { key: "PR3", name: "Profissional III", xp: 70000, bets: 450, wins: 280, acc: 55 },

  { key: "MW1", name: "Nível Mundial I", xp: 95000, bets: 650, wins: 420, acc: 60 },
  { key: "MW2", name: "Nível Mundial II", xp: 125000, bets: 900, wins: 600, acc: 65 },
  { key: "MW3", name: "Nível Mundial III", xp: 160000, bets: 1200, wins: 800, acc: 70 },

  { key: "LE1", name: "Lendário I", xp: 210000, bets: 1500, wins: 1000, acc: 75 },
  { key: "LE2", name: "Lendário II", xp: 270000, bets: 1700, wins: 1150, acc: 80 },
  { key: "LE3", name: "Lendário III", xp: 340000, bets: 1900, wins: 1300, acc: 85 },

  { key: "GM1", name: "Grão Mestre I", xp: 420000, bets: 2150, wins: 1600, acc: 90 },
  { key: "GM2", name: "Grão Mestre II", xp: 520000, bets: 2250, wins: 1750, acc: 92 },
  { key: "GM3", name: "Grão Mestre III", xp: 650000, bets: 2350, wins: 1900, acc: 95 },
];


export const getXPForStreak = (streak: number) => {
  if (streak <= 1) return 260;
  if (streak === 2) return 285;
  if (streak === 3) return 310;
  if (streak === 4) return 335;
  if (streak <= 9) return 360;
  if (streak <= 14) return 410;
  if (streak <= 19) return 460;
  return 460 + Math.floor((streak - 15) / 5) * 50;
};

export const computeYieldPct = (premios: number, stakes: number) => {
  if (stakes <= 0) return 0;
  return ((premios - stakes) / stakes) * 100;
};

export const getUserTier = (
  xp: number,
  bets: number,
  wins: number,
  winRatePct: number
) => {
  return (
    [...BISS_TIERS]
      .reverse()
      .find(
        (t) =>
          xp >= t.xp &&
          bets >= t.bets &&
          wins >= t.wins &&
          winRatePct >= t.acc
      ) || BISS_TIERS[0]
  );
};


export const getNextTier = (tierKey: string) => {
  const idx = BISS_TIERS.findIndex((t) => t.key === tierKey);
  return idx >= 0 ? BISS_TIERS[idx + 1] || null : null;
};

// =======================================================
// 🔧 XP SETTINGS (ajustáveis depois)
// =======================================================
const XP_PER_BILHETE_CRIADO = 50;       // placeholder (ajustável)
const XP_BONUS_BILHETE_GANHO = 100;     // placeholder (ajustável)
const XP_PENALIDADE_ERRO = 100;         // fixo por sua regra

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const ProfileRankingScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const navigate = useNavigate();

  const storedUser =
    auth?.user ||
    (localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user") as string)
      : null);

  const [userProfile, setUserProfile] = useState<any>({
    name: storedUser?.name || "Usuário",
    username: storedUser?.email
      ? `@${storedUser.email.split("@")[0]}`
      : "@seunome",
    avatar: storedUser?.name
      ? String(storedUser.name).trim().slice(0, 1).toUpperCase()
      : "U",

    // 👇 AGORA TEM FAVORITE TEAM AQUI
    favoriteTeam: storedUser?.favoriteTeam || null,

    // Preferências (para preencher o EditProfileCard)
    favoriteLeagues: [],
    favoritePlayers: [],
    favoriteBettingHouses: [],
    bettingControl: false,
    financialMonitoring: false,
    betOnlyFavoriteLeagues: false,
    oddsRange: [1.5, 3.0],
    investmentLimit: 'abaixo-100',

    rank: null,

    // 🔥 points agora será o XP BISS (ainda sem BD, calculado no front)
    points: 0,

    // 🔥 level agora será o Tier BISS (nome do tier)
    level: "Usuário",

    winRate: 0,
    totalBets: 0,
    totalProfit: 0,
    currentStreak: 0,
    longestStreak: 0,
    joinDate: null,

    // 🔥 novos campos (apenas front)
    bissYield: 0,
    bissTierKey: "INI",
    bissNextTierKey: null,
  });

  const [achievements, setAchievements] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);

  const [dailyPayload, setDailyPayload] = useState<any>(null);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);

  // Utilitários
  const formatCurrency = (v: number) => Number(v || 0).toFixed(2);

  // ---------------------------------------------------------
  // Normalizadores / mapeamento de payload do backend → frontend
  // ---------------------------------------------------------
  const normalizeArrayField = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
        if (typeof parsed === "string") return [parsed];
        return [];
      } catch {
        return raw ? [raw] : [];
      }
    }
    return [String(raw)];
  };

  const toBool = (v: any) => v === true || v === 1 || v === "1" || v === "true";

  const normalizeOddsRange = (minV: any, maxV: any, fallback: [number, number] = [1.5, 3.0]) => {
    const min = Number(minV);
    const max = Number(maxV);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
    return [min, max];
  };

  const mapBackendProfileToFront = (data: any) => {
    // Aceita tanto camelCase quanto snake_case (seu banco usa snake_case)
    const favoriteTeam =
      data?.favoriteTeam ??
      data?.clubes_favoritos ??
      data?.clube_favorito ??
      null;

    const favoriteLeagues =
      data?.favoriteLeagues ??
      data?.ligasFavoritas ??
      normalizeArrayField(data?.ligas_favoritas);

    const favoritePlayers =
      data?.favoritePlayers ??
      normalizeArrayField(data?.jogadores_favoritos);

    const favoriteBettingHouses =
      data?.favoriteBettingHouses ??
      normalizeArrayField(data?.casas_apostas_favoritas);

    const bettingControl =
      data?.bettingControl ??
      toBool(data?.controle_apostas_ativo);

    const financialMonitoring =
      data?.financialMonitoring ??
      toBool(data?.monitoramento_financeiro_ativo);

    const betOnlyFavoriteLeagues =
      data?.betOnlyFavoriteLeagues ??
      toBool(data?.apostar_apenas_ligas_favoritas);

    const oddsRange =
      data?.oddsRange ??
      normalizeOddsRange(data?.odd_minima, data?.odd_maxima, [1.5, 3.0]);

    const investmentLimit =
      data?.investmentLimit ??
      data?.limite_investimento_mensal ??
      'abaixo-100';

    return {
      favoriteTeam,
      favoriteLeagues: Array.isArray(favoriteLeagues) ? favoriteLeagues : [],
      favoritePlayers: Array.isArray(favoritePlayers) ? favoritePlayers : [],
      favoriteBettingHouses: Array.isArray(favoriteBettingHouses) ? favoriteBettingHouses : [],
      bettingControl: !!bettingControl,
      financialMonitoring: !!financialMonitoring,
      betOnlyFavoriteLeagues: !!betOnlyFavoriteLeagues,
      oddsRange: Array.isArray(oddsRange) ? oddsRange : [1.5, 3.0],
      investmentLimit: investmentLimit || 'abaixo-100',
    };
  };

  // ---------------------------------------------------------
  // Carrega preferências atuais para preencher o EditProfileCard
  // ---------------------------------------------------------
  const fetchAndApplyPreferences = async (opts?: { silent?: boolean }) => {
    try {
      const api = (await import('@/services/api')).default;

      // 1) Se existir no seu backend: GET /user/profile
      try {
        const pr = await api.get('/user/profile');
        if (pr?.data) {
          const mapped = mapBackendProfileToFront(pr.data);
          setUserProfile((p: any) => ({ ...p, ...mapped }));
          return;
        }
      } catch {
        // fallback abaixo
      }

      // 2) Fallback: /auth/me + /user/preferences + /user/betting-control-status
      const [meRes, prefsRes, bcRes] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/user/preferences'),
        api.get('/user/betting-control-status'),
      ]);

      const partial: any = {};

      // /auth/me costuma trazer name/email e possivelmente favoriteTeam
      if (meRes.status === 'fulfilled' && meRes.value?.data?.user) {
        const u = meRes.value.data.user;
        partial.favoriteTeam = u.favoriteTeam ?? partial.favoriteTeam ?? null;

        const name = u.name || userProfile.name;
        const username = u.email ? `@${u.email.split('@')[0]}` : userProfile.username;
        partial.name = name;
        partial.username = username;
        partial.avatar = (name && name.trim().slice(0, 1).toUpperCase()) || userProfile.avatar;
      }

      // /user/preferences pelo seu backend retorna { ligasFavoritas: [] }
      if (prefsRes.status === 'fulfilled' && prefsRes.value?.data) {
        const ligas = prefsRes.value.data.ligasFavoritas;
        partial.favoriteLeagues = Array.isArray(ligas) ? ligas : [];
      }

      // /user/betting-control-status retorna { bettingControlActive: boolean }
      if (bcRes.status === 'fulfilled' && bcRes.value?.data) {
        partial.bettingControl = !!bcRes.value.data.bettingControlActive;
      }

      setUserProfile((p: any) => ({
        ...p,
        ...partial,
      }));
    } catch (e) {
      if (!opts?.silent) console.error("Erro ao carregar preferências do usuário:", e);
    }
  };

  // ---------------------------------------------------------
  // Carregamento principal (estatísticas + dados básicos)
  // ---------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // Tenta buscar histórico de apostas e extrato financeiro
        const api = (await import('@/services/api')).default;
        const [histRes, extrRes, bilhetesRes, dailyRes] = await Promise.allSettled([
          api.get('/apostas/historico'),
          api.get('/financeiro/extrato'),
          api.get('/apostas/bilhetes'),
          api.get('/challenges/daily/today'),
        ]);

const daily =
  dailyRes.status === 'fulfilled' && dailyRes.value?.data
    ? dailyRes.value.data
    : null;

setDailyPayload(daily);


        const apostas: any[] = histRes.status === 'fulfilled' && Array.isArray(histRes.value.data) ? histRes.value.data : [];
        const extrato: any[] = extrRes.status === 'fulfilled' && Array.isArray(extrRes.value.data) ? extrRes.value.data : [];
        const bilhetes: any[] = bilhetesRes.status === 'fulfilled' && Array.isArray(bilhetesRes.value.data) ? bilhetesRes.value.data : [];

        // Mapeia apostas para formato consistente (compatível com BettingHistoryScreen)
        const mappedApostas = apostas.map((a: any) => ({
          id_aposta: a.id_aposta ?? a.id ?? 0,
          campeonato: a.campeonato || '—',
          partida: a.partida || '—',
          mercado: a.mercado || '—',
          selecao: a.selecao || '—',
          odd: Number(a.odd) || 0,
          valor_apostado: Number(a.valor_apostado) || 0,
          possivel_retorno: Number(a.possivel_retorno) || 0,
          status_aposta: a.status_aposta || 'pendente',
          data_registro: a.data_registro || new Date().toISOString(),
        }));

        // Estatísticas básicas
        const totalBets = mappedApostas.length;
        const settled = mappedApostas.filter((x: any) => x.status_aposta !== 'pendente');
        const wins = settled.filter((x: any) => x.status_aposta === 'ganha').length;
        const losses = settled.filter((x: any) => x.status_aposta === 'perdida').length;
        const winRate = settled.length > 0 ? (wins / settled.length) * 100 : 0;

        // Calcula streaks (sequência atual de vitórias e maior sequência)
        const byDateDesc = [...mappedApostas].sort(
          (a, b) => new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime()
        );
        let currentStreak = 0;
        for (const a of byDateDesc) {
          if (a.status_aposta === 'pendente') continue;
          if (a.status_aposta === 'ganha') currentStreak++;
          else break;
        }

        let longestStreak = 0;
        let running = 0;
        for (const a of [...byDateDesc].reverse()) { // iterar cronologicamente
          if (a.status_aposta === 'ganha') {
            running++;
            longestStreak = Math.max(longestStreak, running);
          } else {
            running = 0;
          }
        }

        // Profit: soma apenas prêmios e subtrai stakes de bilhetes perdidos (valor ganho - valor perdido)
        const totalPremios = extrato.reduce(
          (acc: number, mv: any) => (mv && mv.tipo === 'premio' ? acc + Number(mv.valor || 0) : acc),
          0
        );
        const totalPerdido = bilhetes.reduce((acc: number, b: any) => {
          const st = (b.status || '').toString().toLowerCase();
          if (st === 'perdido' || st === 'perdida') return acc + Number(b.stake_total || b.stake || 0);
          return acc;
        }, 0);
        const profit = totalPremios - totalPerdido;

        // =======================================================
        // 🔥 BISS: Yield (%) (mais "desafiador" por tier)
        // - aqui é percentual de retorno sobre stake total
        // =======================================================
        const stakesSettled = bilhetes.reduce((acc: number, b: any) => {
          const st = (b.status || '').toString().toLowerCase();
          if (st === 'pendente' || st === 'cancelado') return acc;
          return acc + Number(b.stake_total || b.stake || 0);
        }, 0);

        // =======================================================
        // 🔥 BISS: XP (somente acertos + bilhetes; derrota -100)
        // - streak XP cresce conforme sua tabela
        // - XP nunca fica negativo (clamp 0)
        // =======================================================
        const settledChrono = [...mappedApostas]
          .filter((a: any) => a.status_aposta !== 'pendente')
          .sort((a, b) => new Date(a.data_registro).getTime() - new Date(b.data_registro).getTime());

        let bissXP = 0;
        let streak = 0;

        for (const a of settledChrono) {
          if (a.status_aposta === 'ganha') {
            streak += 1;
            bissXP += getXPForStreak(streak);
          } else if (a.status_aposta === 'perdida') {
            streak = 0;
            bissXP -= XP_PENALIDADE_ERRO;
          } else {
            // cancelada etc. não mexe em XP (por enquanto)
          }
          bissXP = Math.max(0, bissXP);
        }

        // XP por bilhetes (criados) + bônus se bilhete ganhou
        const bilhetesXP = bilhetes.reduce((acc: number, b: any) => {
          acc += XP_PER_BILHETE_CRIADO;
          const st = (b.status || '').toString().toLowerCase();
          if (st === 'ganho' || st === 'ganha') acc += XP_BONUS_BILHETE_GANHO;
          return acc;
        }, 0);

        bissXP = Math.max(0, bissXP + bilhetesXP);

        // Descobrir tier atual e próximo
        const tier = getUserTier(bissXP, totalBets, wins, Math.round(winRate * 10) / 10);
        const nextTier = getNextTier(tier.key);

        // Monthly stats: agrupar por mês do registro (apostas) e calcular bets, winRate, profit (por mês via extrato)
        const statsMap: Record<string, { bets: number; wins: number; profit: number }> = {};

        mappedApostas.forEach((a: any) => {
          const d = new Date(a.data_registro);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!statsMap[key]) statsMap[key] = { bets: 0, wins: 0, profit: 0 };
          statsMap[key].bets++;
          if (a.status_aposta === 'ganha') statsMap[key].wins++;
        });

        extrato.forEach((mv: any) => {
          const d = new Date(mv.data_movimentacao || mv.data || mv.createdAt || Date.now());
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!statsMap[key]) statsMap[key] = { bets: 0, wins: 0, profit: 0 };
          if (mv.tipo === 'premio') statsMap[key].profit += Number(mv.valor || 0);
        });

        // Subtrair perdas por bilhete (por mês)
        bilhetes.forEach((b: any) => {
          const st = (b.status || '').toString().toLowerCase();
          if (st !== 'perdido' && st !== 'perdida') return;
          const d = new Date(b.data_criacao || b.createdAt || b.data_registro || Date.now());
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!statsMap[key]) statsMap[key] = { bets: 0, wins: 0, profit: 0 };
          statsMap[key].profit -= Number(b.stake_total || b.stake || 0);
        });

        const monthly = Object.entries(statsMap)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([k, v]) => ({
            month: k,
            bets: v.bets,
            winRate: v.bets > 0 ? Math.round((v.wins / v.bets) * 1000) / 10 : 0,
            profit: Math.round(v.profit * 100) / 100,
          }));

        // Tentativa de obter dados de perfil (nome/username) — preferir dado do contexto/auth ou localStorage
        let name = storedUser?.name || 'Usuário';
        let username = storedUser?.email ? `@${storedUser.email.split('@')[0]}` : '@seunome';

        try {
          const api2 = (await import('@/services/api')).default;
          try {
            const me = await api2.get('/auth/me');
            if (me?.data?.user) {
              name = me.data.user.name || name;
              username = me.data.user.email ? `@${me.data.user.email.split('@')[0]}` : username;

              // 🔥 Capturar o clube favorito
              if (me.data.user.favoriteTeam) {
                setUserProfile((p: any) => ({
                  ...p,
                  favoriteTeam: me.data.user.favoriteTeam
                }));
              }
            }
          } catch {
            // fallback para /user/profile (se existir GET)
            try {
              const pr = await api2.get('/user/profile');
              if (pr?.data?.name) {
                name = pr.data.name;
                username = pr.data.username || username;
              }
            } catch { }
          }
        } catch { }

        if (!mounted) return;

        setUserProfile((p: any) => ({
          ...p,
          name,
          username,
          avatar: (name && name.trim().slice(0, 1).toUpperCase()) || p.avatar,
          totalBets,
          winRate: Math.round(winRate * 10) / 10,
          totalProfit: Math.round(profit * 100) / 100,
          currentStreak,
          longestStreak,

          // 🔥 BISS (novo)
          points: bissXP,
          level: tier?.name || p.level,
          bissTierKey: tier?.key || "INI",
          bissNextTierKey: nextTier?.key || null,
        }));

        // Achievements: mínimo — derive alguns targets a partir das estatísticas
        const derivedAchievements = [
          { id: 'first-win', title: 'Primeira Vitória', description: 'Ganhe sua primeira aposta', icon: Trophy, earned: wins > 0, earnedDate: wins > 0 ? undefined : undefined },
          { id: 'five-win-streak', title: 'Sequência de 5', description: 'Ganhe 5 apostas consecutivas', icon: TrendingUp, earned: longestStreak >= 5, progress: `${Math.min(longestStreak, 5)}/5` },
          { id: 'consistent', title: 'Apostador Consistente', description: 'Mantenha taxa de acerto acima de 60%', icon: Target, earned: winRate >= 60 },
          { id: 'profit-100', title: 'Centena de Lucro', description: 'Obtenha R$ 100 de lucro', icon: Award, earned: profit >= 100 },
        ];

        setAchievements(derivedAchievements);
        setMonthlyStats(monthly.slice(0, 12));

        // ✅ Por fim, carregar preferências atuais (para EditProfileCard abrir preenchido)
        await fetchAndApplyPreferences({ silent: true });
      } catch (err) {
        console.error('Erro ao carregar dados do perfil:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => { mounted = false; };
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-orange-500" />;
      default: return <Trophy className="w-5 h-5 text-blue-600" />;
    }
  };

  const handleToggleEdit = async () => {
    const next = !showEdit;

    // Ao abrir, forçar refresh das preferências do usuário
    if (next) {
      await fetchAndApplyPreferences({ silent: true });
    }

    setShowEdit(next);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-600">Carregando...</div>
      </div>
    );
  }

  // =======================================================
  // UI Helpers (Progress Panel)
  // =======================================================
  const tier = getUserTier(
    userProfile.points || 0,
    userProfile.totalBets || 0,
    Math.round(((userProfile.winRate || 0) / 100) * (userProfile.totalBets || 0)),
    Number(userProfile.winRate || 0)
  );

  const nextTier = getNextTier(tier.key);

  const xpCurrent = Number(userProfile.points || 0);
  const xpStart = tier?.xp || 0;
  const xpEnd = nextTier?.xp ?? (tier?.xp || 0);

  const xpProgress = nextTier && xpEnd > xpStart
    ? clamp((xpCurrent - xpStart) / (xpEnd - xpStart), 0, 1)
    : 1;

  const betsProgress = nextTier && nextTier.bets > 0
    ? clamp((Number(userProfile.totalBets || 0)) / nextTier.bets, 0, 1)
    : 1;

  const winsApprox = Math.round(((Number(userProfile.winRate || 0) / 100) * Number(userProfile.totalBets || 0)));
  const winsProgress = nextTier && nextTier.wins > 0
    ? clamp(winsApprox / nextTier.wins, 0, 1)
    : 1;

  const accProgress = nextTier
  ? clamp((Number(userProfile.winRate || 0) / Math.max(1, nextTier.acc)), 0, 1)
  : 1;


  const safeXP = Number(userProfile.points || 0);
  const safeBets = Number(userProfile.totalBets || 0);
  const safeStreak = Number(userProfile.currentStreak || 0);
  const safeWins = winsApprox;

  const dailyChallenges = dailyPayload?.challenges || [];
  const dailyDoneCount = dailyPayload?.completedCountToday ?? 0;
  const dailyTotalCount = dailyPayload?.totalCountToday ?? (dailyChallenges?.length || 0);
  const dailyStreakDays = dailyPayload?.streakDays ?? 0;

  const progressPct = (current: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.round(clamp(current / target, 0, 1) * 100);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Perfil & Ranking</h1>
          <p className="text-blue-600 flex items-center gap-1">
            <User className="w-4 h-4" />
            Suas estatísticas e conquistas
          </p>
        </div>
        <div>
          <Button
            size="sm"
            className="bg-[#014a8f] text-white"
            onClick={handleToggleEdit}
          >
            {showEdit ? 'Fechar' : 'Editar Perfil'}
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      {showEdit && (
        <div className="mb-4">
          <EditProfileCard
            profile={userProfile}
            onCancel={() => setShowEdit(false)}
            onSave={(newProfile: any) => {
              setUserProfile((p: any) => ({ ...p, ...newProfile }));
              setShowEdit(false);
            }}
          />
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar com logo do clube favorito */}
            <Avatar className="w-16 h-16 rounded-full overflow-hidden border border-gray-300">
              {userProfile.favoriteTeam &&
                (clubsMap as any)[userProfile.favoriteTeam] &&
                (clubsMap as any)[userProfile.favoriteTeam].logo ? (
                <img
                  src={getLocalLogo((clubsMap as any)[userProfile.favoriteTeam].logo)}
                  alt={userProfile.favoriteTeam}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-lg">
                  {userProfile.avatar}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-800">{userProfile.name}</h2>
                {getRankIcon(userProfile.rank)}
              </div>
              <p className="text-gray-600">{userProfile.username}</p>
              <Badge className="mt-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
                {userProfile.level}
              </Badge>
            </div>
            {/* position removed per UI request */}
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-800">
                {Number(userProfile.points || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">XP BISS</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{userProfile.winRate}%</p>
              <p className="text-xs text-gray-600">Taxa de Acerto</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{userProfile.totalBets}</p>
              <p className="text-xs text-gray-600">Apostas</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{userProfile.currentStreak}</p>
              <p className="text-xs text-gray-600">Sequência</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =======================================================
          🔥 NOVO: Painel de Progresso BISS (sem remover nada)
         ======================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Painel de Progresso BISS</span>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              {tier.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600">XP Total</p>
              <p className="text-lg font-bold text-gray-800">{Number(userProfile.points || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600">Percentual de acertos</p>
              <p className={`text-lg font-bold ${Number(userProfile.winRate || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Number(userProfile.winRate || 0).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600">Vitórias</p>
              <p className="text-lg font-bold text-gray-800">{winsApprox}</p>
            </div>
          </div>

          {nextTier ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Próximo Tier</p>
                  <p className="text-xs text-gray-600">{nextTier.name}</p>
                </div>
                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                  {nextTier.xp.toLocaleString()} XP
                </Badge>
              </div>

              {/* XP progress */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>XP</span>
                  <span>{xpCurrent.toLocaleString()} / {xpEnd.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
                  <div className="h-2 bg-[#014a8f]" style={{ width: `${Math.round(xpProgress * 100)}%` }} />
                </div>
              </div>

              {/* Bets progress */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Apostas</span>
                  <span>{Number(userProfile.totalBets || 0)} / {nextTier.bets}</span>
                </div>
                <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
                  <div className="h-2 bg-blue-600" style={{ width: `${Math.round(betsProgress * 100)}%` }} />
                </div>
              </div>

              {/* Wins progress */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Vitórias</span>
                  <span>{winsApprox} / {nextTier.wins}</span>
                </div>
                <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
                  <div className="h-2 bg-green-600" style={{ width: `${Math.round(winsProgress * 100)}%` }} />
                </div>
              </div>

              {/* Percentual de acertos (mínimo) */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Acertos (mínimo)</span>
                  <span>{Number(userProfile.winRate || 0).toFixed(1)}% / {nextTier.acc.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
                  <div
                    className={`h-2 ${Number(userProfile.winRate || 0) >= nextTier.acc ? "bg-green-600" : "bg-red-600"}`}
                    style={{ width: `${Math.round(accProgress * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  O Tier sobe apenas quando cumprir XP + apostas + vitórias + % acerto mínimo.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <p className="font-semibold">Você chegou ao topo: {tier.name} 🎉</p>
              <p className="text-sm">Agora é manter consistência e defender o nível.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
            {/* =======================================================
          🎯 NOVO: Desafios (Hoje / Semana)
         ======================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Desafios
            </span>

            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                {dailyDoneCount}/{dailyTotalCount} diários
              </Badge>
              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                🔥 {dailyStreakDays} dias
              </Badge>

            </div>
          </CardTitle>
        </CardHeader>


        <CardContent className="space-y-6">
          {/* Hoje */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800">Hoje</h4>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Diário</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {dailyChallenges.map((c) => {
                const pct = progressPct(c.current, c.target);
                const done = !!c.done;


                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border ${
                      done ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${done ? "text-green-800" : "text-gray-800"}`}>
                          {c.title}
                        </p>
                        <p className="text-xs text-gray-600">{c.desc}</p>
                      </div>

                      <div className="text-right">
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                          +{c.rewardXp} XP
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progresso</span>
                        <span>
                          {c.current}/{c.target} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
                        <div
                          className={`h-2 ${done ? "bg-green-600" : "bg-[#014a8f]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estatísticas de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`text-center p-3 rounded-lg ${userProfile.totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
              <p className={`text-lg font-bold ${userProfile.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>R$ {userProfile.totalProfit.toFixed(2)}</p>
              <p className={`text-sm ${userProfile.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>Lucro Total</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{userProfile.longestStreak}</p>
              <p className="text-sm text-blue-700">Maior Sequência</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800">Evolução Mensal</h4>
            {monthlyStats.map((stat, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${index === monthlyStats.length - 1 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}>
                <span className="font-medium text-gray-800">{stat.month}</span>
                <div className="flex gap-4 text-sm">
                  <span>{stat.bets} apostas</span>
                  <span className="text-green-600">{stat.winRate}%</span>
                  <span className="text-blue-600">R$ {stat.profit.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5" />
            Conquistas & Medalhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${achievement.earned
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className={`p-2 rounded-full ${achievement.earned ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                    <Icon className={`w-5 h-5 ${achievement.earned ? 'text-green-600' : 'text-gray-400'
                      }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${achievement.earned ? 'text-green-800' : 'text-gray-600'
                      }`}>
                      {achievement.title}
                    </h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    {achievement.earned && achievement.earnedDate && (
                      <p className="text-xs text-green-600 mt-1">
                        Conquistado em {achievement.earnedDate}
                      </p>
                    )}
                    {!achievement.earned && achievement.progress && (
                      <p className="text-xs text-gray-500 mt-1">
                        Progresso: {achievement.progress}
                      </p>
                    )}
                  </div>
                  {achievement.earned && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      ✓
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileRankingScreen;
