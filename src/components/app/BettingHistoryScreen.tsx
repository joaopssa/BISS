import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Trophy, Target } from 'lucide-react';

export const BettingHistoryScreen: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [oddsRange, setOddsRange] = useState<[number, number]>([1.01, 3.0]);
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 100]);

  const bets = [
    { id: 1, match: 'Flamengo x Corinthians', bet: 'Casa', odds: 2.1, stake: 75.0, return: 157.5, status: 'won', date: '2024-06-04', competition: 'Brasileirão', aiConfidence: 85 },
    { id: 2, match: 'Barcelona x Real Madrid', bet: 'Over 2.5 gols', odds: 1.85, stake: 100.0, return: 0, status: 'lost', date: '2024-06-03', competition: 'La Liga', aiConfidence: 78 },
    { id: 3, match: 'Manchester City x Liverpool', bet: 'Casa', odds: 1.9, stake: 80.0, return: 152.0, status: 'won', date: '2024-06-02', competition: 'Premier League', aiConfidence: 92 },
    { id: 4, match: 'PSG x Marseille', bet: 'Fora', odds: 3.2, stake: 50.0, return: 0, status: 'lost', date: '2024-06-01', competition: 'Ligue 1', aiConfidence: 65 },
    { id: 5, match: 'Bayern x Dortmund', bet: 'Over 1.5 gols', odds: 1.45, stake: 120.0, return: 174.0, status: 'won', date: '2024-05-31', competition: 'Bundesliga', aiConfidence: 88 }
  ];

  const stats = {
    totalBets: bets.length,
    wonBets: bets.filter(b => b.status === 'won').length,
    lostBets: bets.filter(b => b.status === 'lost').length,
    winRate: (bets.filter(b => b.status === 'won').length / bets.length * 100).toFixed(1),
    totalStaked: bets.reduce((acc, b) => acc + b.stake, 0),
    totalReturns: bets.reduce((acc, b) => acc + b.return, 0),
    profit: bets.reduce((acc, b) => acc + b.return, 0) - bets.reduce((acc, b) => acc + b.stake, 0),
    averageOdds: (bets.reduce((acc, b) => acc + b.odds, 0) / bets.length).toFixed(2),
    avgReturnOdds: (bets.filter(b => b.status === 'won').reduce((acc, b) => acc + b.odds, 0) / bets.filter(b => b.status === 'won').length).toFixed(2)
  };

  const filteredBets = bets.filter(bet => {
    const byStatus = statusFilter === 'won' ? bet.status === 'won' : statusFilter === 'lost' ? bet.status === 'lost' : true;
    const byOdds = bet.odds >= oddsRange[0] && bet.odds <= oddsRange[1];
    const byConfidence = bet.aiConfidence >= confidenceRange[0] && bet.aiConfidence <= confidenceRange[1];
    return byStatus && byOdds && byConfidence;
  });

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Histórico de Apostas</h1>
          <p className="text-blue-600 flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            {stats.totalBets} apostas realizadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Taxa de Acerto</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.winRate}%</p>
            <p className="text-xs text-gray-600">{stats.wonBets} vitórias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">ROI</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {((stats.profit / stats.totalStaked) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Odd média de retorno: {stats.avgReturnOdds}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Estatísticas Detalhadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Apostado</p>
                <p className="font-bold">R$ {stats.totalStaked.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Retornado</p>
                <p className="font-bold">R$ {stats.totalReturns.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Odds Média</p>
                <p className="font-bold">{stats.averageOdds}</p>
              </div>
              <div>
                <p className="text-gray-600">Apostas Perdidas</p>
                <p className="font-bold text-red-600">{stats.lostBets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">💸 Cashouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Cashouts Totais</p>
                <p className="font-bold">12</p>
              </div>
              <div>
                <p className="text-gray-600">Cashouts Evitaram Perda</p>
                <p className="font-bold text-green-600">8</p>
              </div>
              <div>
                <p className="text-gray-600">Taxa de Acerto Cashout</p>
                <p className="font-bold">66.7%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-x-4 min-w-full" style={{ scrollSnapType: 'x mandatory' }}>
          {filteredBets.map(bet => (
            <Card key={bet.id} className="min-w-[calc(100%/3-1rem)] max-w-[calc(100%/3-1rem)] snap-start shrink-0">
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-center mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm">{bet.match}</h3>
                  <p className="text-xs text-gray-500">{bet.date}</p>
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
