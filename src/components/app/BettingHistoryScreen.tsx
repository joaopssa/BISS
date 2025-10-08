import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export const BettingHistoryScreen: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [oddsRange, setOddsRange] = useState<number[]>([1.01, 3.0]);
  const [confidenceRange, setConfidenceRange] = useState<number[]>([0, 100]);

  const bets = [
    { id: 1, match: 'Flamengo x Corinthians', bet: 'Casa', odds: 2.1, stake: 75.0, return: 157.5, status: 'won', date: '2024-06-04', competition: 'Brasileirão', aiConfidence: 85 },
    { id: 2, match: 'Barcelona x Real Madrid', bet: 'Over 2.5 gols', odds: 1.85, stake: 100.0, return: 0, status: 'lost', date: '2024-06-03', competition: 'La Liga', aiConfidence: 78 },
    { id: 3, match: 'Manchester City x Liverpool', bet: 'Casa', odds: 1.9, stake: 80.0, return: 152.0, status: 'won', date: '2024-06-02', competition: 'Premier League', aiConfidence: 92 },
    { id: 4, match: 'PSG x Marseille', bet: 'Fora', odds: 3.2, stake: 50.0, return: 0, status: 'lost', date: '2024-06-01', competition: 'Ligue 1', aiConfidence: 65 },
    { id: 5, match: 'Bayern x Dortmund', bet: 'Over 1.5 gols', odds: 1.45, stake: 120.0, return: 174.0, status: 'won', date: '2024-05-31', competition: 'Bundesliga', aiConfidence: 88 }
  ];

  const isWithinDateRange = (dateStr: string): boolean => {
    const now = new Date();
    const betDate = new Date(dateStr);
    switch (dateFilter) {
      case '24h': return betDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week': return betDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month': return betDate >= new Date(new Date().setMonth(now.getMonth() - 1));
      case 'year': return betDate >= new Date(new Date().setFullYear(now.getFullYear() - 1));
      default: return true;
    }
  };

  const filteredBets = bets.filter(bet => {
    const byStatus = statusFilter === 'won' ? bet.status === 'won' : statusFilter === 'lost' ? bet.status === 'lost' : true;
    const byOdds = bet.odds >= oddsRange[0] && bet.odds <= oddsRange[1];
    const byConfidence = bet.aiConfidence >= confidenceRange[0] && bet.aiConfidence <= confidenceRange[1];
    const byDate = isWithinDateRange(bet.date);
    return byStatus && byOdds && byConfidence && byDate;
  });

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

  const teamInitials = (name?: string) => {
    const n = (name || '').trim();
    if (!n) return '??';
    const parts = n.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
          {filteredBets.map(bet => {
            const [teamA, teamB] = bet.match.split(' x ').map(s => (s || '').trim());
            return (
              <Card key={bet.id} className="min-w-[calc(100%/3-1rem)] max-w-[calc(100%/3-1rem)] snap-start shrink-0">
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-2 gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px] bg-gray-100 text-gray-700">
                        {teamInitials(teamA)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center">
                      <p className="text-sm font-semibold text-gray-800">{bet.match}</p>
                      <p className="text-xs text-gray-500">{bet.date}</p>
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px] bg-gray-100 text-gray-700">
                        {teamInitials(teamB)}
                      </AvatarFallback>
                    </Avatar>
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
            );
          })}
        </div>
      </div>
    </div>
  );
};
