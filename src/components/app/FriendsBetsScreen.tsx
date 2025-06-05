
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Trophy, TrendingUp, UserPlus, Crown, Medal } from 'lucide-react';

export const FriendsBetsScreen: React.FC = () => {
  const friends = [
    {
      id: 1,
      name: 'João Silva',
      username: '@joaosilva',
      avatar: 'JS',
      winRate: 73.2,
      totalBets: 34,
      currentStreak: 5,
      lastBet: {
        match: 'Flamengo x Corinthians',
        bet: 'Casa',
        odds: 2.1,
        status: 'won'
      },
      points: 2450,
      rank: 2
    },
    {
      id: 2,
      name: 'Maria Santos',
      username: '@mariasantos',
      avatar: 'MS',
      winRate: 68.9,
      totalBets: 41,
      currentStreak: 3,
      lastBet: {
        match: 'Barcelona x Real Madrid',
        bet: 'Over 2.5',
        odds: 1.85,
        status: 'lost'
      },
      points: 1890,
      rank: 4
    },
    {
      id: 3,
      name: 'Pedro Costa',
      username: '@pedrocosta',
      avatar: 'PC',
      winRate: 82.1,
      totalBets: 28,
      currentStreak: 8,
      lastBet: {
        match: 'Manchester City x Liverpool',
        bet: 'Casa',
        odds: 1.9,
        status: 'won'
      },
      points: 3120,
      rank: 1
    },
    {
      id: 4,
      name: 'Ana Oliveira',
      username: '@anaoliveira',
      avatar: 'AO',
      winRate: 59.4,
      totalBets: 53,
      currentStreak: 1,
      lastBet: {
        match: 'PSG x Marseille',
        bet: 'Fora',
        odds: 3.2,
        status: 'won'
      },
      points: 1650,
      rank: 5
    }
  ];

  const topRankers = [
    { name: 'Pedro Costa', points: 3120, rank: 1 },
    { name: 'Você', points: 2580, rank: 2 },
    { name: 'João Silva', points: 2450, rank: 3 }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Medal className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Apostas de Amigos</h1>
          <p className="text-blue-600 flex items-center gap-1">
            <Users className="w-4 h-4" />
            Conecte-se com outros apostadores
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Ranking Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking de Pontuação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topRankers.map((ranker, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getRankIcon(ranker.rank)}
                  <span className="font-semibold text-gray-800">
                    {ranker.rank}º {ranker.name}
                  </span>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  {ranker.points} pts
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Friends List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Seus Amigos</h2>
        
        {friends.map((friend) => (
          <Card key={friend.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {friend.avatar}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{friend.name}</h3>
                    {getRankIcon(friend.rank)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{friend.username}</p>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Taxa de Acerto</p>
                      <p className="font-bold text-green-600">{friend.winRate}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Apostas</p>
                      <p className="font-bold text-gray-800">{friend.totalBets}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Sequência</p>
                      <p className="font-bold text-blue-600">{friend.currentStreak}</p>
                    </div>
                  </div>

                  {/* Last Bet */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">Última Aposta</p>
                      <Badge 
                        className={`text-xs ${
                          friend.lastBet.status === 'won' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                            : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {friend.lastBet.status === 'won' ? 'Ganhou' : 'Perdeu'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {friend.lastBet.match} • {friend.lastBet.bet} • {friend.lastBet.odds}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1">
                      Seguir
                    </Button>
                    <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Ver Perfil
                    </Button>
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
