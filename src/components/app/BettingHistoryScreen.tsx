import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Trophy, Target } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchTeamLogo } from './services/teamLogoService';
import { useEffect } from 'react';

<<<<<<< Updated upstream
export const BettingHistoryScreen: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [oddsRange, setOddsRange] = useState<[number, number]>([1.01, 3.0]);
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);
=======
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";

// --- Ícones SVG ---
const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

const ChartLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);

const PercentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
);
>>>>>>> Stashed changes

  const bets = [
    { id: 1, match: 'Flamengo x Corinthians', bet: 'Casa', odds: 2.1, stake: 75.0, return: 157.5, status: 'won', date: '2024-06-04', competition: 'Brasileirão', aiConfidence: 85 },
    { id: 2, match: 'Barcelona x Real Madrid', bet: 'Over 2.5 gols', odds: 1.85, stake: 100.0, return: 0, status: 'lost', date: '2024-06-03', competition: 'La Liga', aiConfidence: 78 },
    { id: 3, match: 'Manchester City x Liverpool', bet: 'Casa', odds: 1.9, stake: 80.0, return: 152.0, status: 'won', date: '2024-06-02', competition: 'Premier League', aiConfidence: 92 },
    { id: 4, match: 'PSG x Marseille', bet: 'Fora', odds: 3.2, stake: 50.0, return: 0, status: 'lost', date: '2024-06-01', competition: 'Ligue 1', aiConfidence: 65 },
    { id: 5, match: 'Bayern x Dortmund', bet: 'Over 1.5 gols', odds: 1.45, stake: 120.0, return: 174.0, status: 'won', date: '2024-05-31', competition: 'Bundesliga', aiConfidence: 88 }
  ];

<<<<<<< Updated upstream
  const isWithinDateRange = (dateStr: string): boolean => {
    const now = new Date();
    const betDate = new Date(dateStr);
    switch (dateFilter) {
      case '24h': return betDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week': return betDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month': return betDate >= new Date(new Date().setMonth(now.getMonth() - 1));
      case 'year': return betDate >= new Date(new Date().setFullYear(now.getFullYear() - 1));
      default: return true;
=======
// --- Funções Auxiliares ---
const parseTeams = (partida: string) => {
  if (!partida) return [null, null];
  const sepRegex = /\s+vs\.?\s+|\s+x\s+|\s+X\s+|\s+-\s+|\s+vs\s+/i;
  const parts = partida.split(sepRegex).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  const px = partida.split(' x ');
  if (px.length >= 2) return [px[0].trim(), px[1].trim()];
  return [partida, null];
};

const findLogo = (name?: string | null) => {
  if (!name) return null;
  if ((clubsMap as any)[name]?.logo) return getLocalLogo((clubsMap as any)[name].logo);
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9 ]/g, '').trim();
  const nk = normalize(name);
  for (const cname in clubsMap as any) {
    const nn = normalize(cname);
    if (nn === nk || nn.includes(nk) || nk.includes(nn)) return getLocalLogo((clubsMap as any)[cname].logo);
  }
  return null;
};

export default function BettingHistoryScreen() {
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados dos Filtros
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterLeague, setFilterLeague] = useState<string | null>(null);
  const [filterMarket, setFilterMarket] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchHistorico = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get("/apostas/historico");
      const data = Array.isArray(res.data) ? res.data : [];

      const mapped: Aposta[] = data.map((a: any) => ({
        id_aposta: a.id_aposta ?? a.id ?? 0,
        campeonato: a.campeonato || "—",
        partida: a.partida || "—",
        mercado: a.mercado || "—",
        selecao: a.selecao || "—",
        odd: Number(a.odd) || 0,
        valor_apostado: Number(a.valor_apostado) || 0,
        possivel_retorno: Number(a.possivel_retorno) || 0,
        status_aposta: a.status_aposta || "pendente",
        data_registro: a.data_registro || new Date().toISOString(),
      }));

      setApostas(mapped);
    } catch (err: any) {
      console.error(err);
      setErro("Erro ao carregar histórico de apostas.");
    } finally {
      setLoading(false);
>>>>>>> Stashed changes
    }
  };

  const filteredBets = bets.filter(bet => {
    const byStatus = statusFilter === 'won' ? bet.status === 'won' : statusFilter === 'lost' ? bet.status === 'lost' : true;
    const byOdds = bet.odds >= oddsRange[0] && bet.odds <= oddsRange[1];
    const byConfidence = bet.aiConfidence >= confidenceRange[0] && bet.aiConfidence <= confidenceRange[1];
    const byDate = isWithinDateRange(bet.date);
    return byStatus && byOdds && byConfidence && byDate;
  });

<<<<<<< Updated upstream
  const stats = {
    totalBets: filteredBets.length,
    wonBets: filteredBets.filter(b => b.status === 'won').length,
    lostBets: filteredBets.filter(b => b.status === 'lost').length,
    winRate: filteredBets.length > 0 ? (filteredBets.filter(b => b.status === 'won').length / filteredBets.length * 100).toFixed(1) : '0.0',
    totalStaked: filteredBets.reduce((acc, b) => acc + b.stake, 0),
    totalReturns: filteredBets.reduce((acc, b) => acc + b.return, 0),
    profit: filteredBets.reduce((acc, b) => acc + b.return, 0) - filteredBets.reduce((acc, b) => acc + b.stake, 0),
    averageOdds: filteredBets.length > 0 ? (filteredBets.reduce((acc, b) => acc + b.odds, 0) / filteredBets.length).toFixed(2) : '0.00',
    avgReturnOdds: filteredBets.filter(b => b.status === 'won').length > 0
      ? (filteredBets.filter(b => b.status === 'won').reduce((acc, b) => acc + b.odds, 0) / filteredBets.filter(b => b.status === 'won').length).toFixed(2)
      : '0.00'
  };

  const chartData = [
    { name: 'Ganhos', value: stats.wonBets },
    { name: 'Perdas', value: stats.lostBets }
  ];

  const COLORS = ['#4ade80', '#f87171'];

  const [logos, setLogos] = useState<Record<string, string>>({});

useEffect(() => {
  const fetchLogos = async () => {
    const uniqueTeams = new Set<string>();
    bets.forEach(b => {
      const [teamA, teamB] = b.match.split(' x ');
      if (teamA) uniqueTeams.add(teamA.trim());
      if (teamB) uniqueTeams.add(teamB.trim());
    });

    const logoEntries = await Promise.all([...uniqueTeams].map(async (team) => {
      const logo = await fetchTeamLogo(team);
      return [team, logo];
    }));

    setLogos(Object.fromEntries(logoEntries));
  };

  fetchLogos();
}, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap gap-6 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as apostas</SelectItem>
            <SelectItem value="won">Apostas ganhas</SelectItem>
            <SelectItem value="lost">Apostas perdidas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Filtrar por período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
            <SelectItem value="year">Último ano</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Odds</label>
          <Slider.Root min={1.01} max={3.0} step={0.01} value={oddsRange} onValueChange={setOddsRange} className="relative flex items-center select-none touch-none w-full h-5">
            <Slider.Track className="bg-gray-300 relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white border border-gray-400 rounded-full shadow-md hover:bg-blue-500 focus:outline-none" />
            <Slider.Thumb className="block w-5 h-5 bg-white border border-gray-400 rounded-full shadow-md hover:bg-blue-500 focus:outline-none" />
          </Slider.Root>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{oddsRange[0].toFixed(2)}</span>
            <span>{oddsRange[1] >= 3 ? '3.0+' : oddsRange[1].toFixed(2)}</span>
          </div>
        </div>

        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Confiança IA</label>
          <Slider.Root min={0} max={100} step={1} value={confidenceRange} onValueChange={setConfidenceRange} className="relative flex items-center select-none touch-none w-full h-5">
            <Slider.Track className="bg-gray-300 relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white border border-gray-400 rounded-full shadow-md hover:bg-blue-500 focus:outline-none" />
            <Slider.Thumb className="block w-5 h-5 bg-white border border-gray-400 rounded-full shadow-md hover:bg-blue-500 focus:outline-none" />
          </Slider.Root>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{confidenceRange[0]}%</span>
            <span>{confidenceRange[1]}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.winRate}%</p>
            <p className="text-sm text-gray-500">{stats.wonBets} de {stats.totalBets} apostas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retorno Sobre Investimento (ROI)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {stats.totalStaked > 0 ? ((stats.profit / stats.totalStaked) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="text-sm text-gray-500">Lucro: R$ {stats.profit.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Resultados</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={60} label>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-x-4 min-w-full" style={{ scrollSnapType: 'x mandatory' }}>
          {filteredBets.map(bet => (
            <Card key={bet.id} className="min-w-[calc(100%/3-1rem)] max-w-[calc(100%/3-1rem)] snap-start shrink-0">
              <CardContent className="p-4 flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-2 gap-2">
  <img
    src={logos[bet.match.split(' x ')[0]?.trim()]}
    alt="Logo Time A"
    className="w-8 h-8 object-contain"
  />
  <div className="flex flex-col items-center">
    <p className="text-sm font-semibold text-gray-800">{bet.match}</p>
    <p className="text-xs text-gray-500">{bet.date}</p>
  </div>
  <img
    src={logos[bet.match.split(' x ')[1]?.trim()]}
    alt="Logo Time B"
    className="w-8 h-8 object-contain"
  />
</div>

                <div className="bg-gray-50 rounded-md p-2 w-full text-center mb-2">
                  <p className="text-xs text-gray-600">Palpite</p>
                  <p className="text-xs text-gray-700 mt-1">{bet.bet} • {bet.odds}</p>
                  <Badge className={`text-xs mt-1 ${bet.status === 'won' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {bet.status === 'won' ? 'Ganhou' : 'Perdeu'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center w-full text-xs text-gray-600 mb-2">
                  <div>
                    <p>Valor</p>
                    <p className="font-bold text-gray-800">R$ {bet.stake.toFixed(2)}</p>
                  </div>
                  <div>
                    <p>Retorno</p>
                    <p className={`font-bold ${bet.status === 'won' ? 'text-green-600' : 'text-red-600'}`}>R$ {bet.return.toFixed(2)}</p>
                  </div>
                </div>
                <div className="w-full">
                  <p className="text-xs text-gray-600 text-left mb-1">Confiança IA</p>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${bet.aiConfidence}%` }}></div>
                    </div>
                    <span className="text-xs font-medium">{bet.aiConfidence}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
=======
  const uniqueLeagues = useMemo(() => Array.from(new Set(apostas.map(a => a.campeonato))).sort(), [apostas]);
  const uniqueMarkets = useMemo(() => Array.from(new Set(apostas.map(a => a.mercado))).sort(), [apostas]);
  const uniqueStatus = useMemo(() => Array.from(new Set(apostas.map(a => a.status_aposta))).sort(), [apostas]);

  // Lógica de Filtragem
  const filteredApostas = apostas.filter(a => {
    if (filterLeague && a.campeonato !== filterLeague) return false;
    if (filterMarket && a.mercado !== filterMarket) return false;
    if (filterStatus && a.status_aposta !== filterStatus) return false;
    return true;
  });

  // --- CÁLCULO DE ESTATÍSTICAS (ROI / Odd) ---
  const stats = useMemo(() => {
    if (filteredApostas.length === 0) return { avgOdd: 0, roi: 0 };
    let sumOdds = 0;
    let totalInvestedSettled = 0;
    let totalReturnSettled = 0;

    filteredApostas.forEach(bet => {
        sumOdds += bet.odd;
        if (bet.status_aposta === 'ganha' || bet.status_aposta === 'perdida') {
            totalInvestedSettled += bet.valor_apostado;
            if (bet.status_aposta === 'ganha') {
                totalReturnSettled += bet.possivel_retorno;
            }
        }
    });

    const avgOdd = sumOdds / filteredApostas.length;
    const netProfit = totalReturnSettled - totalInvestedSettled;
    const roi = totalInvestedSettled > 0 ? (netProfit / totalInvestedSettled) * 100 : 0;
    return { avgOdd, roi };
  }, [filteredApostas]);

  // --- CÁLCULO DE TIMES MAIS APOSTADOS ---
  const topTeams = useMemo(() => {
    const map: Record<string, { count: number; w: number; d: number; l: number }> = {};

    const normalize = (s?: string | null) => {
      if (!s) return "";
      return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9 ]/g, '')
        .trim();
    };

    filteredApostas.forEach((bet) => {
      const [teamA, teamB] = parseTeams(bet.partida);

      const normSelecao = normalize(bet.selecao);
      const normA = normalize(teamA);
      const normB = normalize(teamB);

      let betTeam: string | null = null;

      // primeira tentativa: seleção contém o nome do time (ou vice-versa)
      if (normA && normSelecao && (normSelecao.includes(normA) || normA.includes(normSelecao))) betTeam = teamA;
      else if (normB && normSelecao && (normSelecao.includes(normB) || normB.includes(normSelecao))) betTeam = teamB;

      // segunda tentativa: mercados de vencedor muitas vezes têm apenas o nome do time sem acento
      if (!betTeam && normA && normSelecao && normSelecao.split(' ').some(tok => normA.includes(tok) || tok.includes(normA))) betTeam = teamA;
      if (!betTeam && normB && normSelecao && normSelecao.split(' ').some(tok => normB.includes(tok) || tok.includes(normB))) betTeam = teamB;

      // terceira tentativa: seleção igual ao time exato
      if (!betTeam && teamA && bet.selecao.trim().toLowerCase() === teamA.trim().toLowerCase()) betTeam = teamA;
      if (!betTeam && teamB && bet.selecao.trim().toLowerCase() === teamB.trim().toLowerCase()) betTeam = teamB;

      if (betTeam) {
        if (!map[betTeam]) map[betTeam] = { count: 0, w: 0, d: 0, l: 0 };
        map[betTeam].count += 1;
        if (bet.status_aposta === 'ganha') map[betTeam].w += 1;
        else if (bet.status_aposta === 'perdida') map[betTeam].l += 1;
        else map[betTeam].d += 1;
      }
    });

    return Object.entries(map)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  }, [filteredApostas]);

  const getStatusStyle = (status: Aposta["status_aposta"]) => {
    switch (status) {
      case "ganha": return "text-green-600 bg-green-50 border-green-200";
      case "perdida": return "text-red-600 bg-red-50 border-red-200";
      case "cancelada": return "text-gray-600 bg-gray-50 border-gray-200";
      default: return "text-yellow-700 bg-yellow-50 border-yellow-200";
    }
  };

  const handleClearFilters = () => {
    setFilterLeague(null);
    setFilterMarket(null);
    setFilterStatus(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-10">
      <header className="bg-[#014a8f] text-white p-4 shadow sticky top-0 z-40">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <h1 className="text-xl font-bold">Histórico de Apostas</h1>
          
          <div className="relative">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-sm flex items-center gap-2 ${
                showFilters || filterLeague || filterMarket || filterStatus
                  ? "bg-white text-[#014a8f] hover:bg-gray-100" 
                  : "bg-[#013a70] text-white hover:bg-[#012a50]"
              }`}
            >
              <FilterIcon />
              Filtros
              {(filterLeague || filterMarket || filterStatus) && (
                <span className="ml-1 w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </Button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-72 p-4 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-gray-200 dark:border-neutral-800 z-50 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm">Filtrar por:</h3>
                
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Liga / Campeonato</label>
                  <select
                    value={filterLeague ?? ""}
                    onChange={(e) => setFilterLeague(e.target.value || null)}
                    className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-2 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                  >
                    <option value="" className="text-gray-500">Todas</option>
                    {uniqueLeagues.map((c) => (
                      <option key={c} value={c} className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800">{c}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de Aposta</label>
                  <select
                    value={filterMarket ?? ""}
                    onChange={(e) => setFilterMarket(e.target.value || null)}
                    className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-2 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                  >
                    <option value="" className="text-gray-500">Todos</option>
                    {uniqueMarkets.map((m) => (
                      <option key={m} value={m} className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800">{m}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                  <select
                    value={filterStatus ?? ""}
                    onChange={(e) => setFilterStatus(e.target.value || null)}
                    className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-2 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                  >
                    <option value="" className="text-gray-500">Todos</option>
                    {uniqueStatus.map((s) => (
                      <option key={s} value={s} className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800">{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t dark:border-neutral-800">
                  <Button size="sm" variant="ghost" className="text-xs h-8 text-gray-600 dark:text-gray-300" onClick={handleClearFilters}>Limpar</Button>
                  <Button size="sm" className="bg-[#014a8f] hover:bg-[#003b70] text-white h-8" onClick={() => setShowFilters(false)}>Concluir</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        
        {(filterLeague || filterMarket || filterStatus) && (
            <div className="flex flex-wrap gap-2 text-xs">
                {filterLeague && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200">Liga: {filterLeague}</span>}
                {filterMarket && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">Tipo: {filterMarket}</span>}
                {filterStatus && <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full border border-gray-300">Status: {filterStatus}</span>}
            </div>
        )}

        {/* --- ÁREA DE ESTATÍSTICAS (EM PILHA/COLUNA) --- */}
        {filteredApostas.length > 0 && (
            <div className="flex flex-col gap-4">
                
                {/* 1. Card ROI & Odd Média */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 dark:border-neutral-800">
                        Performance Geral
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                <PercentIcon />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Odd Média</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {stats.avgOdd.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${stats.roi >= 0 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                <ChartLineIcon />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">ROI</p>
                                <div className="flex items-baseline gap-2">
                                    <p className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Card Top Teams (Agora Branco e Embaixo) */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-5">
                     <div className="flex justify-between items-start mb-4">
                         <div>
                            <div className="text-3xl font-bold text-gray-800 dark:text-white leading-tight font-sans tracking-tight">
                                {filteredApostas.length}
                            </div>
                            <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Total de Jogos</span>
                         </div>
                         <div className="text-right">
                             <span className="text-[#014a8f] dark:text-blue-400 text-xs font-medium cursor-pointer hover:underline">Times Apostados ({topTeams.length})</span>
                         </div>
                     </div>

                     <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                         {topTeams.length === 0 ? (
                             <div className="text-gray-500 text-sm italic w-full text-center py-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                                 Sem dados de times específicos para este filtro.
                             </div>
                         ) : (
                             topTeams.map((team) => {
                                 const logo = findLogo(team.name);
                                 return (
                                     <div key={team.name} className="flex-shrink-0 w-20 bg-gray-50 dark:bg-neutral-800 rounded-xl p-3 flex flex-col items-center gap-2 border border-gray-100 dark:border-neutral-700 hover:border-[#014a8f]/30 transition-colors">
                                         <div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-900 p-0.5 flex items-center justify-center border dark:border-neutral-700 shadow-sm">
                                            {logo ? <img src={logo} alt={team.name} className="w-full h-full object-contain" /> : <span className="text-[8px] text-gray-400">?</span>}
                                         </div>
                                         <span className="text-lg font-bold text-gray-800 dark:text-white">{team.count}x</span>
                                         <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-tighter bg-gray-100 dark:bg-neutral-700 px-1.5 rounded-md">
                                             {team.w}-{team.d}-{team.l}
                                         </span>
                                     </div>
                                 );
                             })
                         )}
                     </div>
                </div>

            </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-300 animate-pulse">Carregando histórico...</div>
        ) : erro ? (
          <div className="text-center py-12 text-red-600 bg-red-50 rounded-lg border border-red-100">{erro}</div>
        ) : filteredApostas.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700">
            <p className="text-gray-500 mb-2">Nenhuma aposta encontrada.</p>
            {(filterLeague || filterMarket || filterStatus) && (
                <Button variant="link" onClick={handleClearFilters} className="text-[#014a8f]">Limpar filtros</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Lista de Apostas</h3>
            {filteredApostas.map((a) => {
              const [teamA, teamB] = parseTeams(a.partida);
              const logoA = findLogo(teamA);
              const logoB = findLogo(teamB);

              return (
                <div key={a.id_aposta} className="border border-gray-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow">
                  {/* ... Conteúdo do card de aposta (mantido igual) ... */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3 w-full overflow-hidden">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-gray-50 dark:bg-neutral-800 p-1 border dark:border-neutral-700">
                           {logoA ? <img src={logoA} alt="Team A" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">?</div>}
                        </div>
                        <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{teamA}</span>
                        <span className="text-xs text-gray-400 px-1">vs</span>
                        <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{teamB}</span>
                        <div className="w-8 h-8 shrink-0 rounded-full bg-gray-50 dark:bg-neutral-800 p-1 border dark:border-neutral-700">
                           {logoB ? <img src={logoB} alt="Team B" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">?</div>}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 shrink-0 ml-2 whitespace-nowrap">
                        {new Date(a.data_registro).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mb-3">
                     <span className="text-xs text-[#014a8f] dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/20 w-fit px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{a.campeonato}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm sm:grid-cols-4 bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Mercado</span>
                      <div className="truncate font-medium text-gray-700 dark:text-gray-300" title={a.mercado}>{a.mercado}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Seleção</span>
                      <div className="font-medium truncate text-[#014a8f] dark:text-blue-400" title={a.selecao}>{a.selecao}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Odd</span>
                      <div className="font-mono text-gray-700 dark:text-gray-300">{a.odd.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Aposta</span>
                      <div className="font-medium text-gray-700 dark:text-gray-300">R$ {a.valor_apostado.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-gray-400 text-xs mr-2">Retorno:</span>
                      <span className={`font-bold ${a.status_aposta === 'ganha' ? 'text-green-600' : 'text-gray-800 dark:text-white'}`}>
                        R$ {a.possivel_retorno.toFixed(2)}
                      </span>
                    </div>

                    <div className={`text-[10px] font-bold uppercase border px-3 py-1 rounded-full ${getStatusStyle(a.status_aposta)}`}>
                      {a.status_aposta}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
>>>>>>> Stashed changes
