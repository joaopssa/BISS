// src/components/auth/UserProfileScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { Heart, Trophy, Users, Search, X, Building } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import api from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";
import { getFlagByCountryCode } from "@/utils/getFlagByCountryCode";

import {
  loadPlayersFromCSV,
  convertToPlayerOpt,
} from "@/utils/loadPlayers";

// ====================== Tipos ======================
type TeamOpt = {
  id: string;
  name: string;
  logo?: string | null;
  country?: string | null;
  countryCode?: string | null;
  flag?: string | null;
};

type LeagueOpt = {
  id: string;
  name: string;
  logo?: string | null;
};

// agora os jogadores usam logo + clube + liga
type PlayerOpt = {
  id: string;
  name: string;
  logo?: string | null;
  club?: string | null;
  league?: string | null;
};

type BettingHouseOpt = { id: string; name: string };

// ====================== Funções utilitárias ======================
function normalizeKeyForLookup(s?: string | null): string {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ====================== Ligas ======================
const KNOWN_LEAGUES: LeagueOpt[] = [
  { id: "brasileirao-serie-a", name: "Brasileirão Série A", logo: "/logos/Ligas/BrasileiraoSerieA.webp" },
  { id: "brasileirao-serie-b", name: "Brasileirão Série B", logo: "/logos/Ligas/BrasileiraoSerieB.png" },
  { id: "champions-league", name: "Champions League", logo: "/logos/Ligas/ChampionsLeague.png" },
  { id: "libertadores", name: "Copa Libertadores", logo: "/logos/Ligas/Libertadores.png" },
  { id: "premier-league", name: "Premier League", logo: "/logos/Ligas/PremierLeague.png" },
  { id: "la-liga", name: "La Liga", logo: "/logos/Ligas/LaLiga.png" },
  { id: "serie-a", name: "Serie A TIM", logo: "/logos/Ligas/SerieATIM.png" },
  { id: "ligue-1", name: "Ligue 1", logo: "/logos/Ligas/Ligue1.png" },
  { id: "bundesliga", name: "Bundesliga", logo: "/logos/Ligas/Bundesliga.png" },
];

const ALL_LEAGUES = KNOWN_LEAGUES;

// ====================== Casas ======================
const BETTING_HOUSES: BettingHouseOpt[] = [
  { id: "betano", name: "Betano" },
  { id: "bet365", name: "Bet365" },
  { id: "pixbet", name: "PixBet" },
  { id: "blaze", name: "Blaze" },
  { id: "sportingbet", name: "SportingBet" },
];

// ====================== Componente ======================
export const UserProfileScreen: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    favoriteTeam: "",
    favoriteLeagues: [] as string[],
    favoritePlayers: [] as string[],
    favoriteBettingHouses: [] as string[],
    bettingControl: true,
    financialMonitoring: true,
    betOnlyFavoriteLeagues: false,
    oddsRange: [1.5, 3.0] as [number, number],
    investmentLimit: "abaixo-100",
  });

  // ======= SEARCH STATES =======
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [leagueSearchTerm, setLeagueSearchTerm] = useState("");
  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const [bettingHouseSearchTerm, setBettingHouseSearchTerm] = useState("");

  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false);
  const [showLeagueSuggestions, setShowLeagueSuggestions] = useState(false);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [showBettingHouseSuggestions, setShowBettingHouseSuggestions] = useState(false);

  const [teamResults, setTeamResults] = useState<TeamOpt[]>([]);
  const [leagueResults, setLeagueResults] = useState<LeagueOpt[]>([]);
  const [playerResults, setPlayerResults] = useState<PlayerOpt[]>([]);
  const [bettingHouseResults, setBettingHouseResults] = useState<BettingHouseOpt[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const teamDebRef = useRef<number>();
  const leagueDebRef = useRef<number>();
  const playerDebRef = useRef<number>();
  const houseDebRef = useRef<number>();

  // ======= REAL PLAYERS FROM CSV =======
  const [allPlayers, setAllPlayers] = useState<PlayerOpt[]>([]);

  useEffect(() => {
    async function loadCSV() {
      try {
        const raw = await loadPlayersFromCSV();
        const mapped = convertToPlayerOpt(raw);
        setAllPlayers(mapped);
      } catch (err) {
        console.error("Erro ao carregar CSV de jogadores:", err);
      }
    }
    loadCSV();
  }, []);

  // ====================== Times ======================
  useEffect(() => {
    if (!showTeamSuggestions) return;

    window.clearTimeout(teamDebRef.current);

    teamDebRef.current = window.setTimeout(() => {
      const q = normalizeKeyForLookup(teamSearchTerm);
      const results: TeamOpt[] = [];

      for (const cname in clubsMap as Record<string, any>) {
        const club = clubsMap[cname];
        const nk = normalizeKeyForLookup(cname);

        if (!q || nk.includes(q)) {
          const logo = club?.logo ? getLocalLogo(club.logo) : null;
          const flag = getFlagByCountryCode(club?.countryCode);

          results.push({
            id: cname,
            name: cname,
            logo,
            country: club?.country,
            countryCode: club?.countryCode,
            flag,
          });
        }
      }

      setTeamResults(results.slice(0, 200));
    }, 150);

    return () => window.clearTimeout(teamDebRef.current);
  }, [teamSearchTerm, showTeamSuggestions]);

  // ====================== Ligas ======================
  useEffect(() => {
    if (!showLeagueSuggestions) return;
    window.clearTimeout(leagueDebRef.current);

    leagueDebRef.current = window.setTimeout(() => {
      const q = normalizeKeyForLookup(leagueSearchTerm);

      const filtered = ALL_LEAGUES.filter((l) =>
        normalizeKeyForLookup(l.name).includes(q)
      ).slice(0, 100);

      setLeagueResults(filtered);
    }, 150);

    return () => window.clearTimeout(leagueDebRef.current);
  }, [leagueSearchTerm, showLeagueSuggestions]);

  // ====================== Jogadores REAL CSV ======================
  useEffect(() => {
    if (!showPlayerSuggestions) return;

    window.clearTimeout(playerDebRef.current);

    playerDebRef.current = window.setTimeout(() => {
      const q = normalizeKeyForLookup(playerSearchTerm);

      const filtered = allPlayers
        .filter(
          (p) =>
            normalizeKeyForLookup(p.name).includes(q) ||
            normalizeKeyForLookup(p.club ?? "").includes(q)
        )
        .slice(0, 40);

      setPlayerResults(filtered);
    }, 150);

    return () => window.clearTimeout(playerDebRef.current);
  }, [playerSearchTerm, showPlayerSuggestions, allPlayers]);

  // ====================== Casas ======================
  useEffect(() => {
    if (!showBettingHouseSuggestions) return;
    window.clearTimeout(houseDebRef.current);

    houseDebRef.current = window.setTimeout(() => {
      const q = normalizeKeyForLookup(bettingHouseSearchTerm);

      const filtered = BETTING_HOUSES.filter((h) =>
        normalizeKeyForLookup(h.name).includes(q)
      );

      setBettingHouseResults(filtered);
    }, 150);

    return () => window.clearTimeout(houseDebRef.current);
  }, [bettingHouseSearchTerm, showBettingHouseSuggestions]);

  // ====================== Seleção ======================
  const handleTeamSelect = (team: TeamOpt) => {
    setProfile({ ...profile, favoriteTeam: team.name });
    setTeamSearchTerm(team.name);
    setShowTeamSuggestions(false);
  };

  const handleLeagueSelect = (league: LeagueOpt) => {
    if (
      !profile.favoriteLeagues.includes(league.name) &&
      profile.favoriteLeagues.length < 5
    ) {
      setProfile({
        ...profile,
        favoriteLeagues: [...profile.favoriteLeagues, league.name],
      });
    }
    setLeagueSearchTerm("");
    setShowLeagueSuggestions(false);
  };

  const handlePlayerSelect = (player: PlayerOpt) => {
    if (
      !profile.favoritePlayers.includes(player.name) &&
      profile.favoritePlayers.length < 5
    ) {
      setProfile({
        ...profile,
        favoritePlayers: [...profile.favoritePlayers, player.name],
      });
    }
    setPlayerSearchTerm("");
    setShowPlayerSuggestions(false);
  };

  const handleHouseSelect = (house: BettingHouseOpt) => {
    if (
      !profile.favoriteBettingHouses.includes(house.name) &&
      profile.favoriteBettingHouses.length < 5
    ) {
      setProfile({
        ...profile,
        favoriteBettingHouses: [...profile.favoriteBettingHouses, house.name],
      });
    }
    setBettingHouseSearchTerm("");
    setShowBettingHouseSuggestions(false);
  };

  // ====================== Remoções ======================
  const removeLeague = (name: string) =>
    setProfile({
      ...profile,
      favoriteLeagues: profile.favoriteLeagues.filter((l) => l !== name),
    });

  const removePlayer = (name: string) =>
    setProfile({
      ...profile,
      favoritePlayers: profile.favoritePlayers.filter((p) => p !== name),
    });

  const removeHouse = (name: string) =>
    setProfile({
      ...profile,
      favoriteBettingHouses: profile.favoriteBettingHouses.filter((h) => h !== name),
    });

  // ====================== Submit ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (profile.betOnlyFavoriteLeagues && profile.favoriteLeagues.length === 0) {
      setFormError("Você deve selecionar pelo menos uma liga favorita.");
      return;
    }

    const storedData = localStorage.getItem("registrationData");
    if (!storedData) {
      setFormError("Dados de registro não encontrados.");
      toast({
        title: "Erro",
        description: "Dados de registro não encontrados.",
        variant: "destructive",
      });
      navigate("/register");
      return;
    }

    try {
      await api.put("/user/profile", profile);
      localStorage.removeItem("registrationData");
      navigate("/login");
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Não foi possível concluir seu cadastro.";

      setFormError(message);
      toast({
        title: "Erro no Cadastro",
        description: message,
        variant: "destructive",
      });
    }
  };

  // ====================== RENDER ======================
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-gray-100">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-800">
            Perfil do Usuário
          </CardTitle>
          <p className="text-blue-600 text-sm">Personalize sua experiência</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ===== Clube Favorito ===== */}
            <div>
              <Label className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" /> Clube Favorito
              </Label>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />

                <Input
                  placeholder="Digite o nome do seu time"
                  className="pl-10 pr-10"
                  value={teamSearchTerm}
                  onChange={(e) => {
                    setTeamSearchTerm(e.target.value);
                    setShowTeamSuggestions(true);
                  }}
                  onFocus={() => setShowTeamSuggestions(true)}
                />

                {teamSearchTerm && (
                  <X
                    className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer"
                    onClick={() => {
                      setTeamSearchTerm("");
                      setProfile({ ...profile, favoriteTeam: "" });
                    }}
                  />
                )}

                {showTeamSuggestions && teamResults.length > 0 && (
                  <div className="absolute z-40 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                    {teamResults.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleTeamSelect(t)}
                      >
                        {t.logo && <img src={t.logo} className="h-4 w-4" />}
                        <span>{t.name}</span>
                        {t.flag && <img src={t.flag} className="h-4 w-4 ml-auto" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {profile.favoriteTeam && (
                <div className="mt-2 flex items-center bg-green-50 text-green-800 rounded-full px-3 py-1 text-sm gap-2">
                  {(() => {
                    const club = clubsMap[profile.favoriteTeam];
                    if (!club) return null;

                    const logo = club.logo ? getLocalLogo(club.logo) : null;
                    const flag = getFlagByCountryCode(club.countryCode);

                    return (
                      <>
                        {logo && <img src={logo} className="h-5 w-5" />}
                        {flag && <img src={flag} className="h-4 w-4 ml-1" />}
                      </>
                    );
                  })()}

                  <span>{profile.favoriteTeam}</span>

                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setProfile({ ...profile, favoriteTeam: "" })}
                  />
                </div>
              )}
            </div>

            {/* ===== Ligas ===== */}
            <div>
              <Label className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Ligas Favoritas
              </Label>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />

                <Input
                  placeholder="Digite o nome de uma liga"
                  className="pl-10 pr-10"
                  value={leagueSearchTerm}
                  onChange={(e) => {
                    setLeagueSearchTerm(e.target.value);
                    setShowLeagueSuggestions(true);
                  }}
                  onFocus={() => setShowLeagueSuggestions(true)}
                />

                {leagueSearchTerm && (
                  <X
                    className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer"
                    onClick={() => setLeagueSearchTerm("")}
                  />
                )}

                {showLeagueSuggestions && leagueResults.length > 0 && (
                  <div className="absolute z-30 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                    {leagueResults.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleLeagueSelect(l)}
                      >
                        {l.logo && <img src={l.logo} className="h-4 w-4" />}
                        <span>{l.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {profile.favoriteLeagues.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.favoriteLeagues.map((league) => (
                    <div
                      key={league}
                      className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm gap-2"
                    >
                      <span>{league}</span>
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removeLeague(league)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== Jogadores ===== */}
            <div>
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-700" /> Jogadores Favoritos
              </Label>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />

                <Input
                  placeholder="Digite o nome de um jogador"
                  className="pl-10 pr-10"
                  value={playerSearchTerm}
                  onChange={(e) => {
                    setPlayerSearchTerm(e.target.value);
                    setShowPlayerSuggestions(true);
                  }}
                  onFocus={() => setShowPlayerSuggestions(true)}
                />

                {playerSearchTerm && (
                  <X
                    className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer"
                    onClick={() => setPlayerSearchTerm("")}
                  />
                )}

                {showPlayerSuggestions && playerResults.length > 0 && (
                  <div className="absolute z-20 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                    {playerResults.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handlePlayerSelect(p)}
                      >
                        {p.logo && (
                          <img
                            src={p.logo}
                            className="h-5 w-5 rounded-sm object-cover"
                          />
                        )}
                        <span>{p.name}</span>
                        {p.club && (
                          <span className="ml-auto text-xs text-gray-500">
                            {p.club}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {profile.favoritePlayers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.favoritePlayers.map((player) => (
                    <div
                      key={player}
                      className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm gap-2"
                    >
                      {player}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removePlayer(player)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== Casas ===== */}
            <div>
              <Label className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-700" /> Casas de Apostas
              </Label>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />

                <Input
                  placeholder="Digite o nome da casa de apostas"
                  className="pl-10 pr-10"
                  value={bettingHouseSearchTerm}
                  onChange={(e) => {
                    setBettingHouseSearchTerm(e.target.value);
                    setShowBettingHouseSuggestions(true);
                  }}
                  onFocus={() => setShowBettingHouseSuggestions(true)}
                />

                {bettingHouseSearchTerm && (
                  <X
                    className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer"
                    onClick={() => setBettingHouseSearchTerm("")}
                  />
                )}

                {showBettingHouseSuggestions &&
                  bettingHouseResults.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                      {bettingHouseResults.map((h) => (
                        <div
                          key={h.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleHouseSelect(h)}
                        >
                          {h.name}
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {profile.favoriteBettingHouses.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.favoriteBettingHouses.map((house) => (
                    <div
                      key={house}
                      className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm gap-2"
                    >
                      {house}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removeHouse(house)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== Configurações ===== */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <Label>Controle de Apostas</Label>
                <Switch
                  checked={profile.bettingControl}
                  onCheckedChange={(checked) =>
                    setProfile({ ...profile, bettingControl: checked })
                  }
                />
              </div>

              <div className="flex justify-between items-center">
                <Label>Monitoramento Financeiro</Label>
                <Switch
                  checked={profile.financialMonitoring}
                  onCheckedChange={(checked) =>
                    setProfile({ ...profile, financialMonitoring: checked })
                  }
                />
              </div>

              <div>
                <Label>Intervalo de odds</Label>
                <Slider
                  value={profile.oddsRange}
                  onValueChange={(range) =>
                    setProfile({ ...profile, oddsRange: range as [number, number] })
                  }
                  min={1.01}
                  max={10}
                  step={0.1}
                />

                <p className="text-sm text-gray-600 mt-1">
                  {profile.oddsRange[0].toFixed(2)} –{" "}
                  {profile.oddsRange[1].toFixed(2)}
                </p>
              </div>

              <div>
                <Label>Limite de investimento mensal</Label>

                <RadioGroup
                  value={profile.investmentLimit}
                  onValueChange={(v) =>
                    setProfile({ ...profile, investmentLimit: v })
                  }
                >
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="abaixo-100" id="r1" />
                      <Label htmlFor="r1">Abaixo de R$100</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="100-200" id="r2" />
                      <Label htmlFor="r2">Entre R$100 e R$200</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="200-500" id="r3" />
                      <Label htmlFor="r3">Entre R$200 e R$500</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="acima-500" id="r4" />
                      <Label htmlFor="r4">Acima de R$500</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* ===== Erros ===== */}
            {formError && (
              <p className="text-red-500 text-sm text-center">{formError}</p>
            )}

            {/* ===== Botão ===== */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
            >
              Concluir Cadastro
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
