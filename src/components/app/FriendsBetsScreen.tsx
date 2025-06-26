import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Trophy, UserPlus, Crown, Medal, Circle } from 'lucide-react';

export const FriendsBetsScreen: React.FC = () => {
  const [rankingFilter, setRankingFilter] = useState<'points' | 'roi' | 'winRate' | 'streak'>('points');

  const friends = [
    {
      id: 1, name: 'João Silva', username: '@joaosilva', avatar: 'JS', winRate: 73.2, totalBets: 34, currentStreak: 7, roi: 12.4,
      lastBet: { match: 'Flamengo x Corinthians', bet: 'Casa', odds: 2.1, status: 'won' },
      recentResults: ['won', 'won', 'won', 'won', 'won'],
      points: 2450, rank: 2, isFollowing: true, followsBack: true
    },
    {
      id: 2, name: 'Maria Santos', username: '@mariasantos', avatar: 'MS', winRate: 68.9, totalBets: 41, currentStreak: 3, roi: 8.9,
      lastBet: { match: 'Barcelona x Real Madrid', bet: 'Over 2.5', odds: 1.85, status: 'won' },
      recentResults: ['lost', 'lost', 'won', 'won', 'won'],
      points: 1890, rank: 4, isFollowing: true, followsBack: false
    },
    {
      id: 3, name: 'Pedro Costa', username: '@pedrocosta', avatar: 'PC', winRate: 82.1, totalBets: 28, currentStreak: 4, roi: 15.3,
      lastBet: { match: 'Manchester City x Liverpool', bet: 'Casa', odds: 1.9, status: 'won' },
      recentResults: ['lost', 'won', 'won', 'won', 'won'],
      points: 3120, rank: 1, isFollowing: false, followsBack: true
    },
    {
      id: 4, name: 'Ana Oliveira', username: '@anaoliveira', avatar: 'AO', winRate: 59.4, totalBets: 53, currentStreak: 1, roi: 5.1,
      lastBet: { match: 'PSG x Marseille', bet: 'Fora', odds: 3.2, status: 'lost' },
      recentResults: ['won', 'lost', 'lost', 'won', 'lost'],
      points: 1650, rank: 5, isFollowing: true, followsBack: false
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Medal className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const getResultColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-green-500';
      case 'lost': return 'text-red-500';
      case 'void': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const sortedFriends = [...friends].sort((a, b) => {
    switch (rankingFilter) {
      case 'roi': return b.roi - a.roi;
      case 'winRate': return b.winRate - a.winRate;
      case 'streak': return b.currentStreak - a.currentStreak;
      default: return b.points - a.points;
    }
  }).slice(0, 3);

  const followingOnly = friends.filter(f => f.isFollowing && !f.followsBack && !friends.some(fr => fr.name === f.name));

  return (
    <div className="p-4 space-y-6">
      {/* ...código anterior omitido para brevidade... */}

      {/* Ranking com Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Ranking de Pontuação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant={rankingFilter === 'points' ? 'default' : 'outline'} onClick={() => setRankingFilter('points')}>Pontos</Button>
            <Button variant={rankingFilter === 'roi' ? 'default' : 'outline'} onClick={() => setRankingFilter('roi')}>ROI</Button>
            <Button variant={rankingFilter === 'winRate' ? 'default' : 'outline'} onClick={() => setRankingFilter('winRate')}>Assertividade</Button>
            <Button variant={rankingFilter === 'streak' ? 'default' : 'outline'} onClick={() => setRankingFilter('streak')}>Sequência</Button>
          </div>
          <div className="space-y-3">
            {sortedFriends.map((ranker, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-semibold">{ranker.avatar}</AvatarFallback>
                  </Avatar>
                  {getRankIcon(index + 1)}
                  <span className="font-semibold text-gray-800">{index + 1}º {ranker.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {rankingFilter === 'roi' ? `${ranker.roi}% ROI` :
                     rankingFilter === 'winRate' ? `${ranker.winRate}%` :
                     rankingFilter === 'streak' ? `${ranker.currentStreak} vitórias` : `${ranker.points} pts`}
                  </Badge>
                  <div className="flex gap-1">
                    {ranker.recentResults.map((res, i) => (
                      <Circle key={i} className={`w-4 h-4 ${getResultColor(res)}`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

            {/* Seus Amigos */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Seus Amigos</h2>
        {friends.map((friend) => (
          <Card key={friend.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">{friend.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{friend.name}</h3>
                    {getRankIcon(friend.rank)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{friend.username}</p>
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
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">Última Aposta</p>
                      <Badge className={`text-xs ${friend.lastBet.status === 'won' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {friend.lastBet.status === 'won' ? 'Ganhou' : 'Perdeu'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{friend.lastBet.match} • {friend.lastBet.bet} • {friend.lastBet.odds}</p>
                  </div>
                  <div className="flex mt-3">
                    <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">Ver Perfil</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Seguindo */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Seguindo</h2>
        {followingOnly.length === 0 && <p className="text-sm text-gray-500">Você não está seguindo ninguém que não te segue de volta.</p>}
        {followingOnly.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">{user.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.username}</p>
                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">Última Aposta</p>
                      <Badge className={`text-xs ${user.lastBet.status === 'won' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.lastBet.status === 'won' ? 'Ganhou' : 'Perdeu'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{user.lastBet.match} • {user.lastBet.bet} • {user.lastBet.odds}</p>
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