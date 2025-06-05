
import React, { useState } from 'react';
import { AppHeader } from '@/components/ui/app-header';
import { ExpandableMatchCard } from '@/components/ui/expandable-match-card';
import { SportSelector } from './SportSelector';
import { matchesData } from '@/data/matchData';

export const HomeScreen: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState('futebol');

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

      <ExpandableMatchCard matches={matchesData} />
    </div>
  );
};
