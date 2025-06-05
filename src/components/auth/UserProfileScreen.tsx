import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Trophy, Users, Shield, DollarSign } from 'lucide-react';

interface UserProfileScreenProps {
  onComplete: () => void;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ onComplete }) => {
  const [profile, setProfile] = useState({
    favoriteTeam: '',
    favoriteLeagues: [],
    favoritePlayers: '',
    bettingControl: true,
    financialMonitoring: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-800">Perfil do Usuário</CardTitle>
          <p className="text-blue-600 text-sm">Personalize sua experiência</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-blue-600" />
                Clube Favorito
              </Label>
              <Select onValueChange={(value) => setProfile({...profile, favoriteTeam: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flamengo">Flamengo</SelectItem>
                  <SelectItem value="palmeiras">Palmeiras</SelectItem>
                  <SelectItem value="corinthians">Corinthians</SelectItem>
                  <SelectItem value="sao-paulo">São Paulo</SelectItem>
                  <SelectItem value="santos">Santos</SelectItem>
                  <SelectItem value="atletico-mg">Atlético-MG</SelectItem>
                  <SelectItem value="gremio">Grêmio</SelectItem>
                  <SelectItem value="internacional">Internacional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-600" />
                Ligas Favoritas
              </Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione as ligas de interesse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brasileirao">Brasileirão</SelectItem>
                  <SelectItem value="champions">Champions League</SelectItem>
                  <SelectItem value="premier">Premier League</SelectItem>
                  <SelectItem value="laliga">La Liga</SelectItem>
                  <SelectItem value="bundesliga">Bundesliga</SelectItem>
                  <SelectItem value="serie-a">Serie A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jogadores Favoritos</Label>
              <Input
                placeholder="Digite os nomes separados por vírgula"
                value={profile.favoritePlayers}
                onChange={(e) => setProfile({...profile, favoritePlayers: e.target.value})}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Configurações de Segurança
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Controle de Apostas</Label>
                  <p className="text-sm text-gray-600">Ativar alertas e limites</p>
                </div>
                <Switch
                  checked={profile.bettingControl}
                  onCheckedChange={(checked) => setProfile({...profile, bettingControl: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Monitoramento Financeiro
                  </Label>
                  <p className="text-sm text-gray-600">Controle de bankroll automático</p>
                </div>
                <Switch
                  checked={profile.financialMonitoring}
                  onCheckedChange={(checked) => setProfile({...profile, financialMonitoring: checked})}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-6">
              Concluir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
