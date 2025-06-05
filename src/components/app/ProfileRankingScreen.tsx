
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Trophy, Target, TrendingUp, Award, Settings, Crown, Medal, Star } from 'lucide-react';

export const ProfileRankingScreen: React.FC = () => {
  const userProfile = {
    name: 'Você',
    username: '@seunome',
    avatar: 'SN',
    rank: 2,
    points: 2580,
    level: 'Apostador Experiente',
    winRate: 61.7,
    totalBets: 47,
    totalProfit: 451.75,
    currentStreak: 4,
    longestStreak: 9,
    joinDate: '2024-01-15'
  };

  const achievements = [
    {
      id: 1,
      title: 'Primeira Vitória',
      description: 'Ganhe sua primeira aposta',
      icon: Trophy,
      earned: true,
      earnedDate: '2024-01-16'
    },
    {
      id: 2,
      title: 'Sequência de 5',
      description: 'Ganhe 5 apostas consecutivas',
      icon: TrendingUp,
      earned: true,
      earnedDate: '2024-02-10'
    },
    {
      id: 3,
      title: 'Apostador Consistente',
      description: 'Mantenha taxa de acerto acima de 60%',
      icon: Target,
      earned: true,
      earnedDate: '2024-03-05'
    },
    {
      id: 4,
      title: 'Centena de Lucro',
      description: 'Obtenha R$ 100 de lucro',
      icon: Award,
      earned: true,
      earnedDate: '2024-04-12'
    },
    {
      id: 5,
      title: 'Sequência de 10',
      description: 'Ganhe 10 apostas consecutivas',
      icon: Crown,
      earned: false,
      progress: '9/10'
    },
    {
      id: 6,
      title: 'Apostador Elite',
      description: 'Mantenha taxa de acerto acima de 75%',
      icon: Star,
      earned: false,
      progress: '61.7/75%'
    }
  ];

  const monthlyStats = [
    { month: 'Janeiro', bets: 12, winRate: 58.3, profit: 87.50 },
    { month: 'Fevereiro', bets: 15, winRate: 66.7, profit: 134.25 },
    { month: 'Março', bets: 20, winRate: 60.0, profit: 230.00 },
    { month: 'Total', bets: 47, winRate: 61.7, profit: 451.75 }
  ];

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
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-lg">
                {userProfile.avatar}
              </AvatarFallback>
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
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{userProfile.rank}º</p>
              <p className="text-sm text-gray-600">Posição</p>
            </div>
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
