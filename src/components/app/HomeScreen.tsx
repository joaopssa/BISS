import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Star, Clock, Trophy, Target, Brain } from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState('futebol');

  const matches = [
    {
      id: 1,
      homeTeam: 'Flamengo',
      awayTeam: 'Palmeiras',
      time: '16:00',
      date: 'Hoje',
      competition: 'Brasileirão',
      odds: {
        home: 2.1,
        draw: 3.2,
        away: 3.8
      },
      aiRecommendation: {
        type: 'value_bet',
        confidence: 85,
        suggestion: 'Casa',
        reasoning: 'Flamengo com 73% de aproveitamento em casa'
      },
      isFavorite: true
    },
    {
      id: 2,
      homeTeam: 'Barcelona',
      awayTeam: 'Real Madrid',
      time: '17:00',
      date: 'Hoje',
      competition: 'La Liga',
      odds: {
        home: 2.5,
        draw: 3.1,
        away: 2.9
      },
      aiRecommendation: {
        type: 'high_value',
        confidence: 78,
        suggestion: 'Over 2.5',
        reasoning: 'Ambos times marcaram em 80% dos últimos jogos'
      },
      isFavorite: false
    },
    {
      id: 3,
      homeTeam: 'Manchester City',
      awayTeam: 'Liverpool',
      time: '14:30',
      date: 'Amanhã',
      competition: 'Premier League',
      odds: {
        home: 1.9,
        draw: 3.4,
        away: 4.2
      },
      aiRecommendation: {
        type: 'safe_bet',
        confidence: 92,
        suggestion: 'Casa',
        reasoning: 'City invicto há 12 jogos em casa'
      },
      isFavorite: true
    }
  ];

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'value_bet': return 'bg-green-100 text-green-700';
      case 'high_value': return 'bg-orange-100 text-orange-700';
      case 'safe_bet': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'value_bet': return <Target className="w-3 h-3" />;
      case 'high_value': return <TrendingUp className="w-3 h-3" />;
      case 'safe_bet': return <Star className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Partidas do Dia</h1>
          <p className="text-blue-600 flex items-center gap-1">
            <Brain className="w-4 h-4" />
            IA analisou 47 partidas hoje
          </p>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
          <img 
            src="/lovable-uploads/f77e9c7d-1d78-46ea-9b89-391284783838.png" 
            alt="BISS" 
            className="w-8 h-8 object-contain"
          />
        </div>
      </div>

      {/* Sport Filter */}
      <div className="w-full">
        <Select value={selectedSport} onValueChange={setSelectedSport}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o esporte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="futebol">⚽ Futebol</SelectItem>
            <SelectItem value="basquete">🏀 Basquete</SelectItem>
            <SelectItem value="tenis">🎾 Tênis</SelectItem>
            <SelectItem value="volei">🏐 Vôlei</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {matches.map((match) => (
          <Card key={match.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {match.competition}
                  </Badge>
                  {match.isFavorite && (
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {match.date} • {match.time}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Teams */}
              <div className="grid grid-cols-3 items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="font-semibold text-gray-800">{match.homeTeam}</p>
                  <Button variant="outline" size="sm" className="mt-1 text-xs">
                    {match.odds.home}
                  </Button>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">VS</p>
                  <Button variant="outline" size="sm" className="text-xs">
                    {match.odds.draw}
                  </Button>
                </div>
                
                <div className="text-center">
                  <p className="font-semibold text-gray-800">{match.awayTeam}</p>
                  <Button variant="outline" size="sm" className="mt-1 text-xs">
                    {match.odds.away}
                  </Button>
                </div>
              </div>

              {/* AI Recommendation */}
              <div className={`rounded-lg p-3 mb-3 ${getRecommendationColor(match.aiRecommendation.type)}`}>
                <div className="flex items-center gap-2 mb-1">
                  {getRecommendationIcon(match.aiRecommendation.type)}
                  <span className="font-semibold text-sm">
                    Sugestão IA ({match.aiRecommendation.confidence}%)
                  </span>
                </div>
                <p className="text-sm font-medium">
                  {match.aiRecommendation.suggestion}
                </p>
                <p className="text-xs mt-1 opacity-80">
                  {match.aiRecommendation.reasoning}
                </p>
              </div>

              {/* Action Button */}
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Trophy className="w-4 h-4 mr-2" />
                Apostar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};