import React, { useState, useEffect } from 'react';
import { ExpandableMatchCard } from '@/components/ui/expandable-match-card';
import { SportSelector } from './SportSelector';
import { matchesData } from '@/data/matchData';
import { fetchTeamLogo } from './services/teamLogoService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      
      {/* Top Bar com "Em Alta" e perfil resumido */}
<div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#014a8f] text-white shadow">
  {/* Navegação principal */}
  <div className="flex flex-wrap items-center gap-4">
    <Button variant="ghost">Apostas Esportivas</Button>
    <Button variant="ghost">Apostas Ao Vivo</Button>
    <Button variant="ghost">Bilhetes</Button>
    <Button variant="ghost">Em Alta</Button>
    <input
      type="text"
      placeholder="Encontre aqui seu jogo"
      className="w-64 h-10 px-3 py-2 text-sm font-medium text-white placeholder-white bg-[#014a8f] border border-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
    />
  </div>

  {/* Avatar + Info do perfil */}
  <div className="flex items-center gap-4 mt-2 sm:mt-0">
    <div className="text-right text-sm leading-4 hidden sm:block">
      <p className="text-green-400 font-semibold">61.7% acerto</p>
      <p className="text-orange-400 font-semibold">Sequência 4</p>
      <p className="text-yellow-300 font-bold">2580 pts</p>
    </div>
    <Avatar>
      <AvatarImage src="/usuario.jpg" alt="Usuário" />
      <AvatarFallback className="text-black">US</AvatarFallback>
    </Avatar>
  </div>
</div>


      {/* Conteúdo principal */}
      <div className="p-4 space-y-6">
        {/* Título e subtítulo */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Partidas do Dia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">IA analisou 47 partidas hoje</p>
        </div>

        {/* Filtro de esporte */}
        <SportSelector
          selectedSport={selectedSport}
          onSportChange={setSelectedSport}
        />

        {/* Jogos do dia com logos */}
        <ExpandableMatchCard matches={matchesData} logos={logos} />
      </div>
    </div>
  );
};
