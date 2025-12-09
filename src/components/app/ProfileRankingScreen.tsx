import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Trophy, Target, TrendingUp, Award, Crown, Medal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContexts';
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";

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

    rank: null,
    points: 0,
    level: "Usuário",
    winRate: 0,
    totalBets: 0,
    totalProfit: 0,
    currentStreak: 0,
    longestStreak: 0,
    joinDate: null,
  });


  const [achievements, setAchievements] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);

  // Utilitários
  const formatCurrency = (v: number) => Number(v || 0).toFixed(2);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // Tenta buscar histórico de apostas e extrato financeiro
        const api = (await import('@/services/api')).default;
        const [histRes, extrRes] = await Promise.allSettled([
          api.get('/apostas/historico'),
          api.get('/financeiro/extrato')
        ]);

        const apostas: any[] = histRes.status === 'fulfilled' && Array.isArray(histRes.value.data) ? histRes.value.data : [];
        const extrato: any[] = extrRes.status === 'fulfilled' && Array.isArray(extrRes.value.data) ? extrRes.value.data : [];

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
        const byDateDesc = [...mappedApostas].sort((a, b) => new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime());
        let currentStreak = 0;
        for (const a of byDateDesc) {
          if (a.status_aposta === 'pendente') continue;
          if (a.status_aposta === 'ganha') currentStreak++; else break;
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

        // Profit: somar extrato (premio positivo, aposta negativo)
        const profit = extrato.reduce((acc: number, mv: any) => {
          if (!mv || !mv.tipo) return acc;
          if (mv.tipo === 'premio') return acc + Number(mv.valor || 0);
          if (mv.tipo === 'aposta') return acc - Number(mv.valor || 0);
          return acc;
        }, 0);

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
          if (mv.tipo === 'aposta') statsMap[key].profit -= Number(mv.valor || 0);
        });

        const monthly = Object.entries(statsMap).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => ({
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
                    setUserProfile((p:any) => ({
                        ...p,
                        favoriteTeam: me.data.user.favoriteTeam
                    }));
                }
            }
          } catch (e) {
            // fallback para /user/profile
            try {
              const pr = await api2.get('/user/profile');
              if (pr?.data?.name) {
                name = pr.data.name;
                username = pr.data.username || username;
              }
            } catch {}
          }
        } catch {}

        if (!mounted) return;

        setUserProfile((p: any) => ({
          ...p,
          name,
          username,
          avatar: (name && name.trim().slice(0,1).toUpperCase()) || p.avatar,
          totalBets,
          winRate: Math.round(winRate * 10) / 10,
          totalProfit: Math.round(profit * 100) / 100,
          currentStreak,
          longestStreak,
        }));

        // Achievements: mínimo — derive alguns targets a partir das estatísticas
        const derivedAchievements = [
          { id: 'first-win', title: 'Primeira Vitória', description: 'Ganhe sua primeira aposta', icon: Trophy, earned: wins > 0, earnedDate: wins > 0 ? undefined : undefined },
          { id: 'five-win-streak', title: 'Sequência de 5', description: 'Ganhe 5 apostas consecutivas', icon: TrendingUp, earned: longestStreak >= 5, progress: `${Math.min(longestStreak,5)}/5` },
          { id: 'consistent', title: 'Apostador Consistente', description: 'Mantenha taxa de acerto acima de 60%', icon: Target, earned: winRate >= 60 },
          { id: 'profit-100', title: 'Centena de Lucro', description: 'Obtenha R$ 100 de lucro', icon: Award, earned: profit >= 100 },
        ];

        setAchievements(derivedAchievements);
        setMonthlyStats(monthly.slice(0, 12));
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
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar com logo do clube favorito */}
          <Avatar className="w-16 h-16 rounded-full overflow-hidden border border-gray-300">
            {userProfile.favoriteTeam &&
              clubsMap[userProfile.favoriteTeam] &&
              clubsMap[userProfile.favoriteTeam].logo ? (
                <img
                  src={getLocalLogo(clubsMap[userProfile.favoriteTeam].logo)}
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
              <p className="text-lg font-bold text-gray-800">{userProfile.points}</p>
              <p className="text-xs text-gray-600">Pontos</p>
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

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estatísticas de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">R$ {userProfile.totalProfit.toFixed(2)}</p>
              <p className="text-sm text-green-700">Lucro Total</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{userProfile.longestStreak}</p>
              <p className="text-sm text-blue-700">Maior Sequência</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800">Evolução Mensal</h4>
            {monthlyStats.map((stat, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${
                index === monthlyStats.length - 1 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
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
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    achievement.earned 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    achievement.earned ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      achievement.earned ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      achievement.earned ? 'text-green-800' : 'text-gray-600'
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
