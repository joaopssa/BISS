
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Filter, Trophy, Target, Calendar } from 'lucide-react';

export const BettingHistoryScreen: React.FC = () => {
  const [filter, setFilter] = useState('all');
  
  const stats = {
    totalBets: 47,
    wonBets: 29,
    lostBets: 18,
    winRate: 61.7,
    totalStaked: 2350.00,
    totalReturns: 2801.75,
    profit: 451.75,
    averageOdds: 2.34
  };

  const bets = [
    {
      id: 1,
      match: 'Flamengo x Corinthians',
      bet: 'Casa',
      odds: 2.1,
      stake: 75.00,
      return: 157.50,
      status: 'won',
      date: '2024-06-04',
      competition: 'Brasileirão',
      aiConfidence: 85
    },
    {
      id: 2,
      match: 'Barcelona x Real Madrid',
      bet: 'Over 2.5 gols',
      odds: 1.85,
      stake: 100.00,
      return: 0,
      status: 'lost',
      date: '2024-06-03',
      competition: 'La Liga',
      aiConfidence: 78
    },
    {
      id: 3,
      match: 'Manchester City x Liverpool',
      bet: 'Casa',
      odds: 1.9,
      stake: 80.00,
      return: 152.00,
      status: 'won',
      date: '2024-06-02',
      competition: 'Premier League',
      aiConfidence: 92
    },
    {
      id: 4,
      match: 'PSG x Marseille',
      bet: 'Fora',
      odds: 3.2,
      stake: 50.00,
      return: 0,
      status: 'lost',
      date: '2024-06-01',
      competition: 'Ligue 1',
      aiConfidence: 65
    },
    {
      id: 5,
      match: 'Bayern x Dortmund',
      bet: 'Over 1.5 gols',
      odds: 1.45,
      stake: 120.00,
      return: 174.00,
      status: 'won',
      date: '2024-05-31',
      competition: 'Bundesliga',
      aiConfidence: 88
    }
  ];

  const filteredBets = bets.filter(bet => {
    if (filter === 'won') return bet.status === 'won';
    if (filter === 'lost') return bet.status === 'lost';
    return true;
  });

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Histórico de Apostas</h1>
          <p className="text-blue-600 flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            {stats.totalBets} apostas realizadas
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Taxa de Acerto</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.winRate}%
            </p>
            <p className="text-xs text-gray-600">
              {stats.wonBets} vitórias / {stats.totalBets} apostas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Lucro Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              R$ {stats.profit.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600">
              ROI: {((stats.profit / stats.totalStaked) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Estatísticas Detalhadas
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-600" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar apostas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as apostas</SelectItem>
            <SelectItem value="won">Apostas ganhas</SelectItem>
            <SelectItem value="lost">Apostas perdidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bets List */}
      <div className="space-y-3">
        {filteredBets.map((bet) => (
          <Card key={bet.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{bet.match}</h3>
                  <p className="text-sm text-gray-600">{bet.bet}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {bet.competition}
                    </Badge>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {bet.date}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={`${
                      bet.status === 'won' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                        : 'bg-red-100 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {bet.status === 'won' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {bet.status === 'won' ? 'Ganhou' : 'Perdeu'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Odds</p>
                  <p className="font-bold">{bet.odds}</p>
                </div>
                <div>
                  <p className="text-gray-600">Apostado</p>
                  <p className="font-bold">R$ {bet.stake.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Retorno</p>
                  <p className={`font-bold ${bet.status === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {bet.return.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Confiança IA</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full" 
                        style={{ width: `${bet.aiConfidence}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">{bet.aiConfidence}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
