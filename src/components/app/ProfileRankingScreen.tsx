import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Target, TrendingUp, Award, Crown, Medal, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContexts';
import { Button } from '@/components/ui/button';
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";
import EditProfileCard from '@/components/app/EditProfileCard';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";


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
  return (premios/ stakes) * 100;
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

const getTierBadgeSrc = (tierKey?: string | null) => {
  const key = String(tierKey || "INI").toLowerCase(); // "AM1" -> "am1"
  return `${import.meta.env.BASE_URL}classes/${key}.png`;
};

const fmtPct1 = (v: number) => `${Number(v || 0).toFixed(1)}%`;

export const ProfileRankingScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const auth = useAuth();

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

  const [showEdit, setShowEdit] = useState(false);

  const [dailyPayload, setDailyPayload] = useState<any>(null);

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
        const finishedBets = mappedApostas.filter(
          (x: any) => x.status_aposta === "ganha" || x.status_aposta === "perdida"
        ).length;
        const settled = mappedApostas.filter((x: any) => x.status_aposta !== 'pendente');
        const wins = settled.filter((x: any) => x.status_aposta === 'ganha').length;
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
        // ✅ ROI (Yield %): (premios - stakes) / stakes
        // stakes aqui é o total investido em bilhetes (todos)
        // =======================================================
        const totalStakes = bilhetes.reduce((acc: number, b: any) => {
          return acc + Number(b.stake_total || b.stake || 0);
        }, 0);

        const roiPct = computeYieldPct(totalPremios, totalStakes); // pode ser negativo


        // =======================================================
        // 🔥 BISS: XP (somente acertos + bilhetes; derrota -100)
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
          totalBets: finishedBets,
          winRate: Math.round(winRate * 10) / 10,
          totalProfit: Math.round(profit * 100) / 100,
          bissYield: Math.round(roiPct * 10) / 10,
          currentStreak,
          longestStreak,

          // 🔥 BISS (novo)
          points: bissXP,
          level: tier?.name || p.level,
          bissTierKey: tier?.key || "INI",
          bissNextTierKey: nextTier?.key || null,
        }));

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

  // =======================================================
  // UI Piece: progress row (com "thumb" + check à direita)
  // =======================================================
  const ProgressRow = (props: {
    label: string;
    leftValue: string;
    rightValue: string;
    pct: number; // 0-100
    done?: boolean;
    tone?: "primary" | "blue" | "green" | "danger";
  }) => {
    const tone = props.tone || "primary";
    const barColor =
      tone === "green"
        ? "bg-green-600"
        : tone === "danger"
        ? "bg-red-600"
        : tone === "blue"
        ? "bg-blue-600"
        : "bg-[#014a8f]";

    const ringColor =
      tone === "green"
        ? "border-green-600"
        : tone === "danger"
        ? "border-red-600"
        : tone === "blue"
        ? "border-blue-600"
        : "border-[#014a8f]";

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
          <span>{props.label}</span>
          <span className="tabular-nums">
            {props.leftValue} / {props.rightValue}
          </span>
        </div>

        <div className="relative w-full h-3 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
          <div
            className={`h-3 ${barColor}`}
            style={{ width: `${clamp(props.pct, 0, 100)}%` }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white border-2 ${ringColor} shadow-sm`}
            style={{
              left: `calc(${clamp(props.pct, 0, 100)}% - 8px)`,
            }}
          />
        </div>

        <div className="flex items-center justify-end">
          {props.done ? (
            <div className="inline-flex items-center gap-1 text-xs text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>OK</span>
            </div>
          ) : (
            <div className="text-xs text-gray-400">—</div>
          )}
        </div>
      </div>
    );
  };

  // =======================================================
  // Panel (padrão Finance) + StatCard
  // =======================================================
  const panelClass =
    "relative overflow-hidden rounded-2xl border border-[#014a8f]/15 " +
    "bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 " +
    "dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20 " +
    "p-6 shadow-xl shadow-blue-500/10";

  const Panel = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`${panelClass} ${className}`}>
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />
      <div className="relative">{children}</div>
    </div>
  );

  const StatCard = ({
    label,
    value,
    tone = "neutral",
    icon,
    footer,
  }: {
    label: string;
    value: React.ReactNode;
    tone?: "neutral" | "green" | "red" | "blue";
    icon?: React.ReactNode;
    footer?: React.ReactNode;
  }) => {
    const toneRing =
      tone === "green"
        ? "border-green-200/70 dark:border-green-900/40"
        : tone === "red"
        ? "border-red-200/70 dark:border-red-900/40"
        : tone === "blue"
        ? "border-blue-200/70 dark:border-blue-900/40"
        : "border-gray-200/70 dark:border-neutral-800";

    const toneBg =
      tone === "green"
        ? "bg-green-50/60 dark:bg-green-950/20"
        : tone === "red"
        ? "bg-red-50/60 dark:bg-red-950/20"
        : tone === "blue"
        ? "bg-blue-50/60 dark:bg-blue-950/20"
        : "bg-white/70 dark:bg-neutral-950/40";

    return (
      <div
        className={`rounded-2xl ${toneBg} border ${toneRing} px-4 py-3 min-h-[112px] grid grid-rows-[auto_1fr_auto]`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
            {label}
          </p>
          {icon ? (
            <div className="p-2 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-gray-200/60 dark:border-neutral-800">
              {icon}
            </div>
          ) : null}
        </div>

        <div className="flex items-center min-h-[44px]">
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none whitespace-nowrap">
            {value}
          </div>
        </div>

        <div className="h-[16px] text-xs text-gray-600 dark:text-gray-400">
          {footer ?? null}
        </div>
      </div>
    );
  };

  // =======================================================
  // RETURN (novo layout)
  // =======================================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header padrão */}
        <div className="relative overflow-hidden rounded-2xl border border-[#014a8f]/15 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20 p-5 shadow-xl shadow-blue-500/10">
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Perfil e Ranking
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Estatísticas e conquistas
              </p>
            </div>

            <Button
              size="sm"
              className="bg-[#014a8f] hover:bg-[#003b70] text-white rounded-xl w-full sm:w-auto"
              onClick={handleToggleEdit}
            >
              {showEdit ? "Fechar" : "Editar Perfil"}
            </Button>
          </div>
        </div>

        {/* EditProfileCard */}
        {showEdit && (
          <Panel className="p-0">
            <div className="p-5">
              <EditProfileCard
                profile={userProfile}
                onCancel={() => setShowEdit(false)}
                onSave={(newProfile: any) => {
                  setUserProfile((p: any) => ({ ...p, ...newProfile }));
                  setShowEdit(false);
                }}
              />
            </div>
          </Panel>
        )}

        {/* Perfil (Tier + Sequência lado a lado + escudo à direita) */}
        <Panel className="p-0">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <Avatar className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 dark:border-neutral-800 bg-white">
                  {userProfile.favoriteTeam &&
                  (clubsMap as any)[userProfile.favoriteTeam] &&
                  (clubsMap as any)[userProfile.favoriteTeam].logo ? (
                    <img
                      src={getLocalLogo(
                        (clubsMap as any)[userProfile.favoriteTeam].logo
                      )}
                      alt={userProfile.favoriteTeam}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <AvatarFallback className="bg-[#014a8f]/10 text-[#014a8f] font-extrabold text-lg">
                      {userProfile.avatar}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
                    {userProfile.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {userProfile.username}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-xl border border-[#014a8f]/20 bg-white/70 dark:bg-neutral-950/40 px-3 py-1 text-xs font-semibold text-[#014a8f]">
                      {userProfile.level}
                    </span>

                    <span className="inline-flex items-center rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/40 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Sequência Atual:
                      <span className="ml-1 font-extrabold text-[#014a8f] tabular-nums">
                        {safeStreak}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <div className="w-16 h-16 rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/30 flex items-center justify-center p-2">
                  <img
                    src={getTierBadgeSrc(userProfile.bissTierKey)}
                    alt={userProfile.level}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Painel de Estatísticas (novo) */}
        <Panel className="p-0">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Painel de Estatísticas
              </h3>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                base do seu histórico
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                label="Apostas"
                value={safeBets}
                icon={<Target className="w-4 h-4 text-[#014a8f]" />}
              />
              <StatCard
                label="Vitórias"
                value={safeWins}
                icon={<Trophy className="w-4 h-4 text-[#014a8f]" />}
              />
              <StatCard
                label="Sequência Maior"
                value={Number(userProfile.longestStreak || 0)}
                icon={<TrendingUp className="w-4 h-4 text-[#014a8f]" />}
              />
              <StatCard
                label="Lucro Total"
                value={
                  <span
                    className={
                      Number(userProfile.totalProfit || 0) >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    R$ {Number(userProfile.totalProfit || 0).toFixed(2)}
                  </span>
                }
                icon={<Award className="w-4 h-4 text-[#014a8f]" />}
              />
              <StatCard
                label="ROI"
                value={
                  <span
                    className={
                      Number(userProfile.bissYield || 0) >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {fmtPct1(Number(userProfile.bissYield || 0))}
                  </span>
                }
                icon={<TrendingUp className="w-4 h-4 text-[#014a8f]" />}
              />
              <StatCard
                label="% Acertos"
                value={
                  <span className="text-green-700">
                    {fmtPct1(Number(userProfile.winRate || 0))}
                  </span>
                }
                icon={<CheckCircle2 className="w-4 h-4 text-green-700" />}
              />
            </div>
          </div>
        </Panel>

        {/* Tier + Desafios (AGORA no estilo Panel da página) */}
        <Panel className="p-0">
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* =========================
                  COLUNA ESQUERDA: TIER ATUAL
                ========================= */}
              <div className="rounded-2xl bg-white/80 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Tier Atual
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-neutral-900 dark:text-gray-200">
                      {xpCurrent.toLocaleString()} XP
                    </Badge>
                  </div>
                </div>

                <HoverCard openDelay={120}>
                  <HoverCardTrigger asChild>
                    <div className="mt-4 flex items-center justify-center cursor-pointer">
                      <div className="rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-gray-50/70 dark:bg-neutral-900/40 p-6 w-full flex flex-col items-center justify-center">
                        <img
                          src={getTierBadgeSrc(tier.key)}
                          alt={tier.name}
                          className="h-28 w-28 sm:h-32 sm:w-32 object-contain"
                          loading="lazy"
                        />
                        <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {tier.name}
                        </p>
                      </div>
                    </div>
                  </HoverCardTrigger>

                  <HoverCardContent
                    align="start"
                    side="right"
                    className="w-[520px] p-4 dark:bg-neutral-950 dark:border-neutral-800"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Próximo Tier:{" "}
                        <span className="text-gray-700 dark:text-gray-300">
                          {nextTier?.name || "—"}
                        </span>
                      </p>

                      {nextTier ? (
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-neutral-900 dark:text-gray-200">
                          {nextTier.xp.toLocaleString()} XP
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-200">
                          Topo
                        </Badge>
                      )}
                    </div>

                    {nextTier ? (
                      <div className="mt-4 space-y-4">
                        <ProgressRow
                          label="XP"
                          leftValue={xpCurrent.toLocaleString()}
                          rightValue={xpEnd.toLocaleString()}
                          pct={Math.round(xpProgress * 100)}
                          done={xpCurrent >= xpEnd}
                          tone="primary"
                        />

                        <ProgressRow
                          label="Apostas"
                          leftValue={Number(userProfile.totalBets || 0).toString()}
                          rightValue={nextTier.bets.toString()}
                          pct={Math.round(betsProgress * 100)}
                          done={Number(userProfile.totalBets || 0) >= nextTier.bets}
                          tone="blue"
                        />

                        <ProgressRow
                          label="Vitórias"
                          leftValue={winsApprox.toString()}
                          rightValue={nextTier.wins.toString()}
                          pct={Math.round(winsProgress * 100)}
                          done={winsApprox >= nextTier.wins}
                          tone="green"
                        />

                        <ProgressRow
                          label="% Acertos"
                          leftValue={Number(userProfile.winRate || 0).toFixed(1)}
                          rightValue={nextTier.acc.toFixed(1)}
                          pct={Math.round(accProgress * 100)}
                          done={Number(userProfile.winRate || 0) >= nextTier.acc}
                          tone={Number(userProfile.winRate || 0) >= nextTier.acc ? "green" : "danger"}
                        />

                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          O Tier sobe apenas quando cumprir XP + apostas + vitórias + % acerto mínimo.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-200">
                        <p className="font-semibold">Você chegou ao topo: {tier.name} 🎉</p>
                        <p className="text-sm">Agora é manter consistência e defender o nível.</p>
                      </div>
                    )}
                  </HoverCardContent>
                </HoverCard>
              </div>

              {/* ======================
                  COLUNA DIREITA: DESAFIOS
                ====================== */}
              <div className="rounded-2xl bg-white/80 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Desafios
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200">
                      {dailyDoneCount}/{dailyTotalCount} diários
                    </Badge>
                    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-neutral-900 dark:text-gray-200">
                      🔥 {dailyStreakDays} dias
                    </Badge>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Hoje</h4>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200">
                      Diário
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {dailyChallenges.map((c: any) => {
                      const pct = progressPct(c.current, c.target);
                      const done = !!c.done;

                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-xl border ${
                            done
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/40"
                              : "bg-gray-50 border-gray-200 dark:bg-neutral-900/40 dark:border-neutral-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`font-semibold ${done ? "text-green-800 dark:text-green-200" : "text-gray-800 dark:text-gray-100"}`}>
                                {c.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {c.desc}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-neutral-900 dark:text-gray-200">
                                +{c.rewardXp} XP
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                              <span>Progresso</span>
                              <span>
                                {c.current}/{c.target} ({pct}%)
                              </span>
                            </div>

                            <div className="w-full h-2 rounded bg-gray-200 dark:bg-neutral-800 overflow-hidden">
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
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default ProfileRankingScreen;
