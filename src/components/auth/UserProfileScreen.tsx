import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Heart, Trophy, Users, Shield, DollarSign, Search, X, Building } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/services/api';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';

export const UserProfileScreen: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    favoriteTeam: '',
    favoriteLeagues: [] as string[],
    favoritePlayers: [] as string[],
    favoriteBettingHouses: [] as string[],
    bettingControl: true,
    financialMonitoring: true,
    betOnlyFavoriteLeagues: false,
    oddsRange: [1.5, 3.0] as [number, number],
    investmentLimit: 'abaixo-100',
    // A linha 'investmentAwareness' foi removida daqui.
  });

  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [leagueSearchTerm, setLeagueSearchTerm] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [bettingHouseSearchTerm, setBettingHouseSearchTerm] = useState('');
  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false);
  const [showLeagueSuggestions, setShowLeagueSuggestions] = useState(false);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [showBettingHouseSuggestions, setShowBettingHouseSuggestions] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const teams = [
    { id: 'flamengo', name: 'Flamengo' }, { id: 'palmeiras', name: 'Palmeiras' }, { id: 'corinthians', name: 'Corinthians' }, { id: 'sao-paulo', name: 'São Paulo' }, { id: 'santos', name: 'Santos' }, { id: 'atletico-mg', name: 'Atlético-MG' }, { id: 'gremio', name: 'Grêmio' }, { id: 'internacional', name: 'Internacional' }, { id: 'fluminense', name: 'Fluminense' }, { id: 'botafogo', name: 'Botafogo' }, { id: 'vasco', name: 'Vasco da Gama' }, { id: 'cruzeiro', name: 'Cruzeiro' }, { id: 'real-madrid', name: 'Real Madrid' }, { id: 'barcelona', name: 'Barcelona' }, { id: 'manchester-united', name: 'Manchester United' }, { id: 'liverpool', name: 'Liverpool' },
  ];

  const leagues = [
    { id: 'brasileirao', name: 'Brasileirão Série A' }, { id: 'champions', name: 'Champions League' }, { id: 'premier', name: 'Premier League' }, { id: 'laliga', name: 'La Liga' }, { id: 'bundesliga', name: 'Bundesliga' }, { id: 'serie-a', name: 'Serie A (Itália)' }, { id: 'libertadores', name: 'Copa Libertadores' }, { id: 'copa-brasil', name: 'Copa do Brasil' }, { id: 'copa-sul-americana', name: 'Copa Sul-Americana' }, { id: 'brasileirao-b', name: 'Brasileirão Série B' }, { id: 'mls', name: 'MLS' }, { id: 'liga-portugal', name: 'Liga Portugal' },
  ];
  
  const players = [
    { id: 'neymar', name: 'Neymar Jr.' }, { id: 'messi', name: 'Lionel Messi' }, { id: 'cristiano', name: 'Cristiano Ronaldo' }, { id: 'vini-jr', name: 'Vinícius Júnior' }, { id: 'haaland', name: 'Erling Haaland' }, { id: 'mbappe', name: 'Kylian Mbappé' }, { id: 'de-bruyne', name: 'Kevin De Bruyne' }, { id: 'arrascaeta', name: 'Giorgian De Arrascaeta' }, { id: 'endrick', name: 'Endrick' }, { id: 'bellingham', name: 'Jude Bellingham' }, { id: 'salah', name: 'Mohamed Salah' }, { id: 'lewandowski', name: 'Robert Lewandowski' },
  ];
  
  const bettingHouses = [
      { id: 'bet365', name: 'Bet365' }, { id: 'betano', name: 'Betano' }, { id: 'sportingbet', name: 'Sportingbet' }, { id: 'pixbet', name: 'Pixbet' }, { id: 'betfair', name: 'Betfair' }, { id: '1xbet', name: '1xBet' }, { id: 'betway', name: 'Betway' }, { id: 'bodog', name: 'Bodog' }, { id: 'esportes-da-sorte', name: 'Esportes da Sorte' }, { id: 'estrelabet', name: 'EstrelaBet' }, { id: 'kto', name: 'KTO' },
  ];

  const filteredTeams = teams.filter(team => team.name.toLowerCase().includes(teamSearchTerm.toLowerCase()));
  const filteredLeagues = leagues.filter(league => league.name.toLowerCase().includes(leagueSearchTerm.toLowerCase()));
  const filteredPlayers = players.filter(player => player.name.toLowerCase().includes(playerSearchTerm.toLowerCase()));
  const filteredBettingHouses = bettingHouses.filter(house => house.name.toLowerCase().includes(bettingHouseSearchTerm.toLowerCase()));

  const handleTeamSelect = (teamId: string) => {
    const selectedTeam = teams.find(team => team.id === teamId);
    if (selectedTeam) { setProfile({...profile, favoriteTeam: selectedTeam.name}); setTeamSearchTerm(selectedTeam.name); }
    setShowTeamSuggestions(false);
  };

  const handleLeagueSelect = (leagueId: string) => {
    const selectedLeague = leagues.find(league => league.id === leagueId);
    if (selectedLeague && !profile.favoriteLeagues.includes(selectedLeague.name) && profile.favoriteLeagues.length < 5) {
      setProfile({ ...profile, favoriteLeagues: [...profile.favoriteLeagues, selectedLeague.name] });
    }
    setLeagueSearchTerm('');
    setShowLeagueSuggestions(false);
  };
  
  const handlePlayerSelect = (playerId: string) => {
    const selectedPlayer = players.find(player => player.id === playerId);
    if (selectedPlayer && !profile.favoritePlayers.includes(selectedPlayer.name) && profile.favoritePlayers.length < 5) {
        setProfile({ ...profile, favoritePlayers: [...profile.favoritePlayers, selectedPlayer.name] });
    }
    setPlayerSearchTerm('');
    setShowPlayerSuggestions(false);
  };

  const handleBettingHouseSelect = (houseId: string) => {
      const selectedHouse = bettingHouses.find(house => house.id === houseId);
      if (selectedHouse && !profile.favoriteBettingHouses.includes(selectedHouse.name) && profile.favoriteBettingHouses.length < 5) {
          setProfile({ ...profile, favoriteBettingHouses: [...profile.favoriteBettingHouses, selectedHouse.name] });
      }
      setBettingHouseSearchTerm('');
      setShowBettingHouseSuggestions(false);
  };

  const removeLeague = (leagueName: string, e: React.MouseEvent) => { e.stopPropagation(); setProfile({...profile, favoriteLeagues: profile.favoriteLeagues.filter(name => name !== leagueName)}); };
  const removePlayer = (playerName: string, e: React.MouseEvent) => { e.stopPropagation(); setProfile({...profile, favoritePlayers: profile.favoritePlayers.filter(name => name !== playerName)}); };
  const removeBettingHouse = (houseName: string, e: React.MouseEvent) => { e.stopPropagation(); setProfile({...profile, favoriteBettingHouses: profile.favoriteBettingHouses.filter(name => name !== houseName)}); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (profile.betOnlyFavoriteLeagues && profile.favoriteLeagues.length === 0) { 
        setFormError("Você deve selecionar pelo menos uma liga favorita."); 
        return; 
    }
    // A validação do termo de consentimento foi removida daqui.

    const storedData = localStorage.getItem('registrationData');
    if (!storedData) {
        setFormError("Dados de registro não encontrados. Por favor, volte e comece o cadastro novamente.");
        toast({
          title: "Erro",
          description: "Dados de registro não encontrados. Tente novamente.",
          variant: "destructive",
        });
        navigate('/register');
        return;
    }
    const registrationData = JSON.parse(storedData);

    const completeUserData = {
        ...registrationData,
        ...profile
    };

    try {
      await api.post('/auth/register-complete', completeUserData);
      
      toast({
        title: "Cadastro Concluído!",
        description: "Sua conta foi criada com sucesso. Agora você pode fazer o login.",
      });
      
      localStorage.removeItem('registrationData');
      navigate('/login');
      
    } catch (err: any) {
      const message = err.response?.data?.message || "Não foi possível concluir seu cadastro.";
      setFormError(message);
      toast({
        title: "Erro no Cadastro",
        description: message,
        variant: "destructive",
      });
    }
  };

  const clearTeamSearch = () => { setTeamSearchTerm(''); setProfile({...profile, favoriteTeam: ''}); setShowTeamSuggestions(false); };
  const clearLeagueSearch = () => { setLeagueSearchTerm(''); setShowLeagueSuggestions(false); };
  const clearPlayerSearch = () => { setPlayerSearchTerm(''); setShowPlayerSuggestions(false); };
  const clearBettingHouseSearch = () => { setBettingHouseSearchTerm(''); setShowBettingHouseSuggestions(false); };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-gray-100">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center"><div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center"><Users className="w-8 h-8 text-white" /></div><CardTitle className="text-2xl font-bold text-blue-800">Perfil do Usuário</CardTitle><p className="text-blue-600 text-sm">Personalize sua experiência</p></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex items-center justify-between"><div className="space-y-1"><Label>Apostar apenas nas ligas favoritas</Label><p className="text-sm text-gray-600">Torna obrigatório selecionar ligas favoritas</p></div><Switch checked={profile.betOnlyFavoriteLeagues} onCheckedChange={(checked) => setProfile({...profile, betOnlyFavoriteLeagues: checked})} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> Clube Favorito</Label><div className="relative"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><Input placeholder="Digite o nome do seu time" className="pl-10 pr-10" value={teamSearchTerm} onChange={(e) => { setTeamSearchTerm(e.target.value); setShowTeamSuggestions(true); }} onFocus={() => setShowTeamSuggestions(true)} />{teamSearchTerm && (<X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearTeamSearch}/>)}</div>{showTeamSuggestions && (<div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">{(teamSearchTerm ? filteredTeams : teams.slice(0, 4)).map(team => (<div key={team.id} className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleTeamSelect(team.id)}>{team.name}</div>))}</div>)}</div></div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Ligas Favoritas
                {profile.betOnlyFavoriteLeagues && (<span className="text-red-500 text-xs ml-1">(obrigatório)</span>)}
              </Label>
              {profile.favoriteLeagues.length < 5 && (
                <div className="relative mb-3">
                  <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><Input placeholder="Digite o nome de uma liga" className="pl-10 pr-10" value={leagueSearchTerm} onChange={(e) => { setLeagueSearchTerm(e.target.value); setShowLeagueSuggestions(true);}} onFocus={() => setShowLeagueSuggestions(true)} />{leagueSearchTerm && (<X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearLeagueSearch}/>)}</div>
                  {showLeagueSuggestions && (<div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">{(leagueSearchTerm ? filteredLeagues : leagues.slice(0, 4)).map(league => (<div key={league.id} className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleLeagueSelect(league.id)}>{league.name}</div>))}</div>)}
                </div>
              )}
              {profile.favoriteLeagues.length > 0 && (<div className="space-y-2"><p className="text-sm text-gray-600">Ligas selecionadas:</p><div className="flex flex-wrap gap-2">{profile.favoriteLeagues.map(league => (<div key={league} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm">{league}<X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => removeLeague(league, e)}/></div>))}</div></div>)}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-700" /> 
                Jogadores Favoritos
              </Label>
              {profile.favoritePlayers.length < 5 && (
                <div className="relative mb-3">
                  <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><Input placeholder="Digite o nome de um jogador" className="pl-10 pr-10" value={playerSearchTerm} onChange={(e) => { setPlayerSearchTerm(e.target.value); setShowPlayerSuggestions(true);}} onFocus={() => setShowPlayerSuggestions(true)} />{playerSearchTerm && (<X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearPlayerSearch}/>)}</div>
                  {showPlayerSuggestions && (<div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">{(playerSearchTerm ? filteredPlayers : players.slice(0, 4)).map(player => (<div key={player.id} className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handlePlayerSelect(player.id)}>{player.name}</div>))}</div>)}
                </div>
              )}
              {profile.favoritePlayers.length > 0 && (<div className="space-y-2"><p className="text-sm text-gray-600">Jogadores selecionados:</p><div className="flex flex-wrap gap-2">{profile.favoritePlayers.map(player => (<div key={player} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm">{player}<X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => removePlayer(player, e)}/></div>))}</div></div>)}
            </div>
            
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-700" /> 
                  Casas de Apostas
                </Label>
                {profile.favoriteBettingHouses.length < 5 && (
                  <div className="relative mb-3">
                      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><Input placeholder="Digite o nome da casa de apostas" className="pl-10 pr-10" value={bettingHouseSearchTerm} onChange={(e) => { setBettingHouseSearchTerm(e.target.value); setShowBettingHouseSuggestions(true);}} onFocus={() => setShowBettingHouseSuggestions(true)} />{bettingHouseSearchTerm && (<X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearBettingHouseSearch}/>)}</div>
                      {showBettingHouseSuggestions && (<div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">{(bettingHouseSearchTerm ? filteredBettingHouses : bettingHouses.slice(0, 4)).map(house => (<div key={house.id} className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleBettingHouseSelect(house.id)}>{house.name}</div>))}</div>)}
                  </div>
                )}
                {profile.favoriteBettingHouses.length > 0 && (<div className="space-y-2"><p className="text-sm text-gray-600">Casas selecionadas:</p><div className="flex flex-wrap gap-2">{profile.favoriteBettingHouses.map(house => (<div key={house} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm">{house}<X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => removeBettingHouse(house, e)}/></div>))}</div></div>)}
            </div>

            <div className="space-y-6 pt-4 border-t">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> Configurações de Segurança e Financeiro</h3>
              <div className="flex items-center justify-between"><div className="space-y-1"><Label>Controle de Apostas</Label><p className="text-sm text-gray-600">Ativar alertas e limites</p></div><Switch checked={profile.bettingControl} onCheckedChange={(checked) => setProfile({...profile, bettingControl: checked})}/></div>
              <div className="flex items-center justify-between"><div className="space-y-1"><Label className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Monitoramento Financeiro</Label><p className="text-sm text-gray-600">Controle de bankroll automático</p></div><Switch checked={profile.financialMonitoring} onCheckedChange={(checked) => setProfile({...profile, financialMonitoring: checked})}/></div>
              <div className="space-y-3"><div className="flex justify-between items-center"><Label>Intervalo de odds para apostar</Label><span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">{profile.oddsRange[0].toFixed(2)} - {profile.oddsRange[1].toFixed(2)}</span></div><Slider value={profile.oddsRange} onValueChange={(newRange: [number, number]) => setProfile({ ...profile, oddsRange: newRange })} max={10} min={1.01} step={0.1}/></div>
              <div className="space-y-3">
                <Label>Limite de Investimento por mês</Label>
                <RadioGroup value={profile.investmentLimit} onValueChange={(value) => setProfile({ ...profile, investmentLimit: value })}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="abaixo-100" id="r1" /><Label htmlFor="r1">Abaixo de R$100</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="100-200" id="r2" /><Label htmlFor="r2">Entre R$100 e R$200</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="200-500" id="r3" /><Label htmlFor="r3">Entre R$200 e R$500</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="acima-500" id="r4" /><Label htmlFor="r4">Acima de R$500</Label></div>
                </RadioGroup>
              </div>
              
              {/* O bloco do checkbox/termo de consentimento foi removido daqui. */}
              
            </div>

            {formError && (<p className="text-red-500 text-sm text-center">{formError}</p>)}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-6">Concluir Cadastro</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};