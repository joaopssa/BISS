
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SportSelectorProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
}

export const SportSelector: React.FC<SportSelectorProps> = ({ selectedSport, onSportChange }) => {
  return (
    <div className="w-full">
      <Select value={selectedSport} onValueChange={onSportChange}>
        <SelectTrigger className="w-full bg-white dark:bg-neutral-900">
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
  );
};
