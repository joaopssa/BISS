
import React, { useState } from 'react';
import { AppHeader } from '@/components/ui/app-header';
import { ExpandableMatchCard } from '@/components/ui/expandable-match-card';
import { SportSelector } from './SportSelector';
import { matchesData } from '@/data/matchData';
import { fetchTeamLogo } from './services/teamLogoService';
import { useEffect } from 'react';


export const HomeScreen: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState('futebol');

  const [logos, setLogos] = useState<Record<string, string>>({});

useEffect(() => {
  const fetchLogos = async () => {
    const uniqueTeams = new Set<string>();
    matchesData.forEach(m => {
  if (m.homeTeam) uniqueTeams.add(m.homeTeam.trim());
  if (m.awayTeam) uniqueTeams.add(m.awayTeam.trim());
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
    <div className="p-4 space-y-6 bg-gray-50 dark:bg-neutral-950 min-h-screen">
      <AppHeader 
        title="Partidas do Dia" 
        subtitle="IA analisou 47 partidas hoje"
      />

      <SportSelector 
        selectedSport={selectedSport}
        onSportChange={setSelectedSport}
      />

      <ExpandableMatchCard matches={matchesData} logos={logos} />
    </div>
  );
};
