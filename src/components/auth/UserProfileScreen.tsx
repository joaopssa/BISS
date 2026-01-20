// src/components/auth/UserProfileScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  Trophy,
  Users,
  Search,
  X,
  Building,
  ShieldCheck,
  Wallet,
} from "lucide-react";

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

import { loadPlayersFromCSV, convertToPlayerOpt } from "@/utils/loadPlayers";

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
  {
    id: "brasileirao-serie-a",
    name: "Brasileirão Série A",
    logo: "/logos/Ligas/BrasileiraoSerieA.webp",
  },
  {
    id: "brasileirao-serie-b",
    name: "Brasileirão Série B",
    logo: "/logos/Ligas/BrasileiraoSerieB.png",
  },
  {
    id: "champions-league",
    name: "Champions League",
    logo: "/logos/Ligas/ChampionsLeague.png",
  },
  {
    id: "libertadores",
    name: "Copa Libertadores",
    logo: "/logos/Ligas/Libertadores.png",
  },
  {
    id: "premier-league",
    name: "Premier League",
    logo: "/logos/Ligas/PremierLeague.png",
  },
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
  const [showBettingHouseSuggestions, setShowBettingHouseSuggestions] =
    useState(false);

  const [teamResults, setTeamResults] = useState<TeamOpt[]>([]);
  const [leagueResults, setLeagueResults] = useState<LeagueOpt[]>([]);
  const [playerResults, setPlayerResults] = useState<PlayerOpt[]>([]);
  const [bettingHouseResults, setBettingHouseResults] = useState<
    BettingHouseOpt[]
  >([]);
  const [formError, setFormError] = useState<string | null>(null);

  const teamDebRef = useRef<number>();
  const leagueDebRef = useRef<number>();
  const playerDebRef = useRef<number>();
  const houseDebRef = useRef<number>();

  // ======= REFS PARA DETECTAR CLIQUE FORA =======
  const teamWrapperRef = useRef<HTMLDivElement>(null);
  const leagueWrapperRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const houseWrapperRef = useRef<HTMLDivElement>(null);

  // ======= REAL PLAYERS FROM CSV =======
  const [allPlayers, setAllPlayers] = useState<PlayerOpt[]>([]);

  // ======= USE EFFECT PARA FECHAR MENUS AO CLICAR FORA =======
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        teamWrapperRef.current &&
        !teamWrapperRef.current.contains(event.target as Node)
      ) {
        setShowTeamSuggestions(false);
      }
      if (
        leagueWrapperRef.current &&
        !leagueWrapperRef.current.contains(event.target as Node)
      ) {
        setShowLeagueSuggestions(false);
      }
      if (
        playerWrapperRef.current &&
        !playerWrapperRef.current.contains(event.target as Node)
      ) {
        setShowPlayerSuggestions(false);
      }
      if (
        houseWrapperRef.current &&
        !houseWrapperRef.current.contains(event.target as Node)
      ) {
        setShowBettingHouseSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        const club = (clubsMap as any)[cname];
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
      favoriteBettingHouses: profile.favoriteBettingHouses.filter(
        (h) => h !== name
      ),
    });

  // ====================== Submit ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (profile.betOnlyFavoriteLeagues && profile.favoriteLeagues.length === 0) {
      setFormError("Você deve selecionar pelo menos uma liga favorita.");
      return;
    }

    try {
      await api.put("/user/profile", profile);
      try {
        localStorage.removeItem("registrationData");
      } catch {}
      navigate("/");
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
      <Card className="w-full max-w-3xl shadow-xl rounded-3xl border border-gray-200/70 bg-white/70 backdrop-blur dark:bg-neutral-950/40 dark:border-neutral-800">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-extrabold text-gray-900 dark:text-white">
                Perfil do Usuário
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Personalize sua experiência
              </p>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/")}
                className="rounded-xl"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                form="user-profile-form"
                className="rounded-xl bg-[#014a8f] hover:bg-[#003b70] text-white font-semibold"
              >
                Salvar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form id="user-profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* COLUNA 1 */}
              <div className="space-y-4">
                {/* ===== Clube Favorito ===== */}
                <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
                  <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    <Heart className="w-4 h-4 text-red-500" />
                    Clube Favorito
                  </Label>

                  <div ref={teamWrapperRef}>
                    {/* input */}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                      <Input
                        placeholder="Digite o nome do seu time"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                        value={teamSearchTerm}
                        onChange={(e) => {
                          setTeamSearchTerm(e.target.value);
                          setShowTeamSuggestions(true);
                        }}
                        onFocus={() => setShowTeamSuggestions(true)}
                      />

                      {teamSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setTeamSearchTerm("");
                            setProfile({ ...profile, favoriteTeam: "" });
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          aria-label="Limpar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {showTeamSuggestions && teamResults.length > 0 && (
                        <div className="absolute z-40 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur shadow-lg">
                          {teamResults.map((t) => (
                            <button
                              type="button"
                              key={t.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                              onClick={() => handleTeamSelect(t)}
                            >
                              {t.logo && (
                                <img src={t.logo} className="h-5 w-5" alt={t.name} />
                              )}
                              <span className="text-sm text-gray-800 dark:text-gray-100">
                                {t.name}
                              </span>
                              {t.flag && (
                                <img
                                  src={t.flag}
                                  className="h-4 w-4 ml-auto"
                                  alt={t.country ?? "País"}
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* chip */}
                    {profile.favoriteTeam && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-green-200/70 dark:border-green-900/40 bg-green-50/70 dark:bg-green-950/20 px-3 py-2 text-sm text-green-800 dark:text-green-200">
                        {(() => {
                          const club = (clubsMap as any)[profile.favoriteTeam];
                          const logo = club?.logo ? getLocalLogo(club.logo) : null;
                          const flag = getFlagByCountryCode(club?.countryCode);
                          return (
                            <>
                              {logo ? <img src={logo} className="h-5 w-5" alt="logo" /> : null}
                              {flag ? <img src={flag} className="h-4 w-4" alt="flag" /> : null}
                            </>
                          );
                        })()}
                        <span className="font-semibold">{profile.favoriteTeam}</span>
                        <button
                          type="button"
                          onClick={() => setProfile({ ...profile, favoriteTeam: "" })}
                          className="ml-1 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/20"
                          aria-label="Remover"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== Ligas ===== */}
                <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
                  <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Ligas Favoritas
                  </Label>

                  <div ref={leagueWrapperRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                      <Input
                        placeholder="Digite o nome de uma liga"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                        value={leagueSearchTerm}
                        onChange={(e) => {
                          setLeagueSearchTerm(e.target.value);
                          setShowLeagueSuggestions(true);
                        }}
                        onFocus={() => setShowLeagueSuggestions(true)}
                      />

                      {leagueSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setLeagueSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          aria-label="Limpar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {showLeagueSuggestions && leagueResults.length > 0 && (
                        <div className="absolute z-30 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur shadow-lg">
                          {leagueResults.map((l) => (
                            <button
                              type="button"
                              key={l.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                              onClick={() => handleLeagueSelect(l)}
                            >
                              {l.logo && <img src={l.logo} className="h-5 w-5" alt={l.name} />}
                              <span className="text-sm text-gray-800 dark:text-gray-100">
                                {l.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!!profile.favoriteLeagues.length && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {profile.favoriteLeagues.map((league) => (
                          <span
                            key={league}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-200"
                          >
                            {league}
                            <button
                              type="button"
                              onClick={() => removeLeague(league)}
                              className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              aria-label="Remover liga"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUNA 2 */}
              <div className="space-y-4">
                {/* ===== Jogadores ===== */}
                <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
                  <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    <Users className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    Jogadores Favoritos
                  </Label>

                  <div ref={playerWrapperRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                      <Input
                        placeholder="Digite o nome de um jogador"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                        value={playerSearchTerm}
                        onChange={(e) => {
                          setPlayerSearchTerm(e.target.value);
                          setShowPlayerSuggestions(true);
                        }}
                        onFocus={() => setShowPlayerSuggestions(true)}
                      />

                      {playerSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setPlayerSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          aria-label="Limpar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {showPlayerSuggestions && playerResults.length > 0 && (
                        <div className="absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur shadow-lg">
                          {playerResults.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                              onClick={() => handlePlayerSelect(p)}
                            >
                              {p.logo ? (
                                <img
                                  src={p.logo}
                                  className="h-5 w-5 rounded-sm object-cover"
                                  alt={p.name}
                                />
                              ) : null}
                              <span className="text-sm text-gray-800 dark:text-gray-100">
                                {p.name}
                              </span>
                              {p.club && (
                                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                                  {p.club}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!!profile.favoritePlayers.length && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {profile.favoritePlayers.map((player) => (
                          <span
                            key={player}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-200"
                          >
                            {player}
                            <button
                              type="button"
                              onClick={() => removePlayer(player)}
                              className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              aria-label="Remover jogador"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== Casas ===== */}
                <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
                  <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    <Building className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    Casas de Apostas
                  </Label>

                  <div ref={houseWrapperRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                      <Input
                        placeholder="Digite o nome da casa de apostas"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                        value={bettingHouseSearchTerm}
                        onChange={(e) => {
                          setBettingHouseSearchTerm(e.target.value);
                          setShowBettingHouseSuggestions(true);
                        }}
                        onFocus={() => setShowBettingHouseSuggestions(true)}
                      />

                      {bettingHouseSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setBettingHouseSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          aria-label="Limpar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {showBettingHouseSuggestions &&
                        bettingHouseResults.length > 0 && (
                          <div className="absolute z-10 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur shadow-lg">
                            {bettingHouseResults.map((h) => (
                              <button
                                type="button"
                                key={h.id}
                                className="w-full px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                                onClick={() => handleHouseSelect(h)}
                              >
                                {h.name}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    {!!profile.favoriteBettingHouses.length && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {profile.favoriteBettingHouses.map((house) => (
                          <span
                            key={house}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-200"
                          >
                            {house}
                            <button
                              type="button"
                              onClick={() => removeHouse(house)}
                              className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              aria-label="Remover casa"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== Configurações ===== */}
                <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                      <ShieldCheck className="w-4 h-4 text-[#014a8f]" />
                      Controle de Apostas
                    </Label>
                    <Switch
                      checked={profile.bettingControl}
                      onCheckedChange={(checked) =>
                        setProfile({ ...profile, bettingControl: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                      <Wallet className="w-4 h-4 text-green-700" />
                      Monitoramento Financeiro
                    </Label>
                    <Switch
                      checked={profile.financialMonitoring}
                      onCheckedChange={(checked) =>
                        setProfile({ ...profile, financialMonitoring: checked })
                      }
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block font-semibold text-gray-900 dark:text-gray-100">
                      Intervalo de odds
                    </Label>
                    <Slider
                      value={profile.oddsRange}
                      onValueChange={(range) =>
                        setProfile({
                          ...profile,
                          oddsRange: range as [number, number],
                        })
                      }
                      min={1.01}
                      max={10}
                      step={0.1}
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {profile.oddsRange[0].toFixed(2)} –{" "}
                      {profile.oddsRange[1].toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <Label className="mb-2 block font-semibold text-gray-900 dark:text-gray-100">
                      Limite de investimento mensal
                    </Label>

                    <RadioGroup
                      value={profile.investmentLimit}
                      onValueChange={(v) =>
                        setProfile({ ...profile, investmentLimit: v })
                      }
                    >
                      <div className="flex flex-col gap-2 mt-1 text-sm">
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

                  {formError && (
                    <p className="text-red-500 text-sm text-center">{formError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* CTA mobile (caso queira um botão embaixo no mobile) */}
            <div className="pt-2 lg:hidden">
              <Button
                type="submit"
                className="w-full rounded-xl bg-[#014a8f] hover:bg-[#003b70] text-white font-semibold"
              >
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
