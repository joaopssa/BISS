
export const matchesData = [
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
    isFavorite: true,
    detailedStats: {
      homeStats: {
        wins: 15,
        draws: 8,
        losses: 5,
        goalsFor: 42,
        goalsAgainst: 28
      },
      awayStats: {
        wins: 18,
        draws: 6,
        losses: 4,
        goalsFor: 48,
        goalsAgainst: 22
      },
      headToHead: [
        'Último confronto: Palmeiras 2-1 Flamengo',
        'Flamengo venceu 3 dos últimos 5 jogos',
        'Ambos marcaram em 4 dos últimos 5 confrontos'
      ]
    }
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
    isFavorite: false,
    detailedStats: {
      homeStats: {
        wins: 12,
        draws: 10,
        losses: 6,
        goalsFor: 38,
        goalsAgainst: 30
      },
      awayStats: {
        wins: 16,
        draws: 8,
        losses: 4,
        goalsFor: 44,
        goalsAgainst: 26
      },
      headToHead: [
        'Último El Clásico: Barcelona 1-3 Real Madrid',
        'Real Madrid venceu os últimos 2 confrontos',
        'Média de 3.2 gols por jogo nos últimos 5 El Clásicos'
      ]
    }
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
    isFavorite: true,
    detailedStats: {
      homeStats: {
        wins: 20,
        draws: 6,
        losses: 2,
        goalsFor: 56,
        goalsAgainst: 18
      },
      awayStats: {
        wins: 14,
        draws: 8,
        losses: 6,
        goalsFor: 42,
        goalsAgainst: 32
      },
      headToHead: [
        'Último confronto: Manchester City 4-1 Liverpool',
        'City venceu 4 dos últimos 6 confrontos',
        'City não perde em casa para o Liverpool há 3 anos'
      ]
    }
  }
];
