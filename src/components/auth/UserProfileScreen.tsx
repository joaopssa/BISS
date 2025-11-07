// src/components/auth/UserProfileScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Heart, Trophy, Users, Shield, DollarSign, Search, X, Globe } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import api from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import leaguesJson from "@/data/leagues.json";
import { flagUrl, normalizeISO2, countryNameToISO2 } from "@/utils/flags";
import flagsMap from "@/utils/flags-map.json";

type TeamOpt = { id: number | string; name: string; logo?: string; country?: string };
type PlayerOpt = { id: number | string; name: string; photo?: string; age?: number; nationality?: string };

type LeagueOpt = {
  id: number | string;
  name: string;
  logo?: string | null;
  type?: string | null;
  country?: string | null;
  iso2?: string | null;
  flag?: string | null;
};

type CountryBucket = {
  displayName: string;
  iso2: string | null;
  flagUrl: string | null;
  leagues: LeagueOpt[];
};

// === Logos locais das ligas ===
const STATIC_LEAGUE_LOGOS: Record<string, string> = {
  "brasileirao serie a": "/src/logos/Ligas/BrasileiraoSerieA.webp",
  "brasileirao serie b": "/src/logos/Ligas/BrasileiraoSerieB.png",
  "bundesliga": "/src/logos/Ligas/Bundesliga.png",
  "champions league": "/src/logos/Ligas/ChampionsLeague.png",
  "la liga": "/src/logos/Ligas/Laliga.png",
  "libertadores": "/src/logos/Ligas/Libertadores.png",
  "ligue 1": "/src/logos/Ligas/Ligue1.png",
  "premier league": "/src/logos/Ligas/PremierLeague.png",
  "serie a": "/src/logos/Ligas/SerieATIM.png",
};


function pickStaticLogoByName(name: string): string | null {
  const key = name.toLowerCase();
  for (const k in STATIC_LEAGUE_LOGOS) {
    if (key.includes(k)) return STATIC_LEAGUE_LOGOS[k];
  }
  return null;
}

async function resolveLeagueLogoWithCache(title: string): Promise<string | null> {
  const cacheKey = `lgLogo:${title.toLowerCase()}`;
  const hit = localStorage.getItem(cacheKey);
  if (hit) return hit === "null" ? null : hit;
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) { localStorage.setItem(cacheKey, "null"); return null; }
    const j = await r.json();
    const thumb = j?.thumbnail?.source || null;
    localStorage.setItem(cacheKey, thumb ? String(thumb) : "null");
    return thumb ?? null;
  } catch {
    localStorage.setItem(cacheKey, "null");
    return null;
  }
}

const LeagueRow: React.FC<{
  lg: LeagueOpt;
  onSelect: (id: string | number, name: string) => void;
}> = ({ lg, onSelect }) => {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(lg.logo ?? null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (lg.logo) { setLogoUrl(lg.logo); return; }
      const staticHit = pickStaticLogoByName(lg.name);
      if (staticHit) { if (mounted) setLogoUrl(staticHit); return; }
      const wiki = await resolveLeagueLogoWithCache(lg.name);
      if (mounted) setLogoUrl(wiki);
    })();
    return () => { mounted = false; };
  }, [lg.logo, lg.name]);

  const flag = lg.flag || flagUrl(lg.iso2, 16);

  return (
    <div
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
      onClick={() => onSelect(lg.id, lg.name)}
    >
      {logoUrl && <img src={logoUrl} alt="" className="h-4 w-4 rounded" />}
      <span>{lg.name}</span>
      <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
        {flag && <img src={flag} alt="" className="h-3 w-4 rounded-sm" />}
      </span>
    </div>
  );
};

const CountryHeader: React.FC<{ name: string; iso2: string | null }> = ({ name, iso2 }) => {
  const f = flagUrl(iso2, 16);
  return (
    <div className="sticky top-0 bg-white/95 backdrop-blur px-3 py-2 text-xs font-semibold text-gray-700 border-b flex items-center gap-2">
      {f ? <img src={f} alt="" className="h-3.5 w-5 rounded-sm" /> : <Globe className="h-3.5 w-3.5 text-gray-500" />}
      <span>{name}</span>
    </div>
  );
};

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

  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [leagueSearchTerm, setLeagueSearchTerm] = useState("");
  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const [bettingHouseSearchTerm, setBettingHouseSearchTerm] = useState("");

  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false);
  const [showLeagueSuggestions, setShowLeagueSuggestions] = useState(false);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [showBettingHouseSuggestions, setShowBettingHouseSuggestions] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const [teamResults, setTeamResults] = useState<TeamOpt[]>([]);
  const [leagueResultsFlat, setLeagueResultsFlat] = useState<LeagueOpt[]>([]);
  const [playerResults, setPlayerResults] = useState<PlayerOpt[]>([]);

  const teamDebRef = useRef<number | undefined>(undefined);
  const leagueDebRef = useRef<number | undefined>(undefined);
  const playerDebRef = useRef<number | undefined>(undefined);

  const countryEntries = useMemo(() => {
    const names = new Set<string>();
    (leaguesJson as any[]).forEach((it) => {
      const nm = String(it?.name ?? "").trim();
      if (!nm) return;
      if (countryNameToISO2(nm)) names.add(nm);
    });
    return Array.from(names);
  }, []);

  const allLeagues: LeagueOpt[] = useMemo(() => {
    const arr = Array.isArray(leaguesJson) ? (leaguesJson as any[]) : [];
    return arr
      .map((l) => {
        const name = String(l?.name ?? "").trim();
        const isCountryOnly = !!countryNameToISO2(name);
        if (!name || isCountryOnly) return null;

        const country = (l?.country ?? null) as string | null;
        const isoFromJson = (l?.iso2 ?? null) as string | null;
        const isoFromCountry = countryNameToISO2(country);
        const isoFromMap = normalizeISO2((flagsMap as Record<string, string>)[name]);
        const iso2 = isoFromJson || isoFromCountry || isoFromMap || null;
        const flag = l?.flag ?? flagUrl(iso2, 16);

        return {
          id: l?.id ?? name,
          name,
          country,
          type: l?.type ?? null,
          logo: l?.logo ?? null,
          iso2,
          flag,
        } as LeagueOpt;
      })
      .filter((l): l is LeagueOpt => !!l);
  }, []);

  const countryBucketsBase = useMemo(() => {
    const map = new Map<string, { displayName: string; iso2: string | null }>();
    countryEntries.forEach((name) => {
      const iso2 = countryNameToISO2(name) || null;
      map.set(name.toLowerCase(), { displayName: name, iso2 });
    });
    if (!map.has("internacional")) map.set("internacional", { displayName: "Internacional", iso2: null });
    if (!map.has("international")) map.set("international", { displayName: "International", iso2: null });
    return map;
  }, [countryEntries]);

  useEffect(() => {
    if (!showLeagueSuggestions) return;
    window.clearTimeout(leagueDebRef.current);
    leagueDebRef.current = window.setTimeout(() => {
      const q = leagueSearchTerm.trim().toLowerCase();
      const filtered = (!q
        ? allLeagues
        : allLeagues.filter((l) => {
            const inName = l.name.toLowerCase().includes(q);
            const inType = (l.type ?? "").toLowerCase().includes(q);
            const inCountryTxt = (l.country ?? "").toLowerCase().includes(q);
            return inName || inType || inCountryTxt;
          })
      ).slice(0, 500);
      setLeagueResultsFlat(filtered);
    }, 150);
    return () => window.clearTimeout(leagueDebRef.current);
  }, [leagueSearchTerm, showLeagueSuggestions, allLeagues]);

  const leagueResultsGrouped: CountryBucket[] = useMemo(() => {
    const buckets = new Map<string, CountryBucket>();
    countryBucketsBase.forEach(({ displayName, iso2 }, key) => {
      buckets.set(key, { displayName, iso2, flagUrl: flagUrl(iso2, 16), leagues: [] });
    });

    const getCountryKeyForLeague = (lg: LeagueOpt): string => {
      if (lg.iso2) {
        for (const [key, b] of buckets) {
          if (b.iso2 && b.iso2 === lg.iso2) return key;
        }
      }
      for (const [key, b] of buckets) {
        if (!b.iso2) continue;
        const display = b.displayName.toLowerCase();
        if (lg.name.toLowerCase().includes(display)) return key;
      }
      const n = lg.name.toLowerCase();
      if (n.includes("champions") || n.includes("europa") || n.includes("conferencia") || n.includes("conference") || n.includes("libertador") || n.includes("sul americana") || n.includes("sudamericana") || n.includes("world cup") || n.includes("copa do mundo") || n.includes("fifa")) {
        return buckets.has("internacional") ? "internacional" : "international";
      }
      return buckets.has("internacional") ? "internacional" : "international";
    };

    for (const lg of leagueResultsFlat) {
      const key = getCountryKeyForLeague(lg);
      const b = buckets.get(key);
      if (b) b.leagues.push(lg);
    }

    const out = Array.from(buckets.values()).filter((b) => b.leagues.length > 0);
    out.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
    out.forEach((b) => b.leagues.sort((a, c) => a.name.localeCompare(c.name, "pt-BR")));
    return out;
  }, [leagueResultsFlat, countryBucketsBase]);

  useEffect(() => {
    if (!showTeamSuggestions) return;
    window.clearTimeout(teamDebRef.current);
    teamDebRef.current = window.setTimeout(async () => {
      const q = teamSearchTerm.trim();
      if (!q) { setTeamResults([]); return; }
      try {
        const { data } = await api.get("/football/search/teams", { params: { q } });
        setTeamResults(Array.isArray(data?.response) ? data.response.slice(0, 20) : []);
      } catch { setTeamResults([]); }
    }, 300);
    return () => window.clearTimeout(teamDebRef.current);
  }, [teamSearchTerm, showTeamSuggestions]);

  useEffect(() => {
    if (!showPlayerSuggestions) return;
    window.clearTimeout(playerDebRef.current);
    playerDebRef.current = window.setTimeout(async () => {
      const q = playerSearchTerm.trim();
      if (!q) { setPlayerResults([]); return; }
      try {
        const season = new Date().getFullYear();
        const { data } = await api.get("/football/search/players", { params: { q, season } });
        setPlayerResults(Array.isArray(data?.response) ? data.response.slice(0, 20) : []);
      } catch { setPlayerResults([]); }
    }, 300);
    return () => window.clearTimeout(playerDebRef.current);
  }, [playerSearchTerm, showPlayerSuggestions]);

  const handleTeamSelect = (id: string | number, name: string) => {
    setProfile((p) => ({ ...p, favoriteTeam: name }));
    setTeamSearchTerm(name);
    setShowTeamSuggestions(false);
  };

  const handleLeagueSelect = (id: string | number, name: string) => {
    setProfile((p) => {
      if (p.favoriteLeagues.includes(name) || p.favoriteLeagues.length >= 5) return p;
      return { ...p, favoriteLeagues: [...p.favoriteLeagues, name] };
    });
    setLeagueSearchTerm("");
    setShowLeagueSuggestions(false);
  };

  const handlePlayerSelect = (id: string | number, name: string) => {
    setProfile((p) => {
      if (p.favoritePlayers.includes(name) || p.favoritePlayers.length >= 5) return p;
      return { ...p, favoritePlayers: [...p.favoritePlayers, name] };
    });
    setPlayerSearchTerm("");
    setShowPlayerSuggestions(false);
  };

  const removeLeague = (leagueName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfile((p) => ({ ...p, favoriteLeagues: p.favoriteLeagues.filter((n) => n !== leagueName) }));
  };
  const removePlayer = (playerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfile((p) => ({ ...p, favoritePlayers: p.favoritePlayers.filter((n) => n !== playerName) }));
  };

  const bettingHouses = [
    { id: "bet365", name: "Bet365" }, { id: "betano", name: "Betano" }, { id: "sportingbet", name: "Sportingbet" },
    { id: "pixbet", name: "Pixbet" }, { id: "betfair", name: "Betfair" }, { id: "1xbet", name: "1xBet" },
    { id: "betway", name: "Betway" }, { id: "bodog", name: "Bodog" }, { id: "esportes-da-sorte", name: "Esportes da Sorte" },
    { id: "estrelabet", name: "EstrelaBet" }, { id: "kto", name: "KTO" },
  ];
  const filteredBettingHouses = useMemo(
    () => bettingHouses.filter((h) => h.name.toLowerCase().includes(bettingHouseSearchTerm.toLowerCase())),
    [bettingHouseSearchTerm]
  );
  const handleBettingHouseSelect = (id: string, name: string) => {
    setProfile((p) => {
      if (p.favoriteBettingHouses.includes(name) || p.favoriteBettingHouses.length >= 5) return p;
      return { ...p, favoriteBettingHouses: [...p.favoriteBettingHouses, name] };
    });
    setBettingHouseSearchTerm("");
    setShowBettingHouseSuggestions(false);
  };
  const removeBettingHouse = (houseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfile((p) => ({
      ...p,
      favoriteBettingHouses: p.favoriteBettingHouses.filter((n) => n !== houseName),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (profile.betOnlyFavoriteLeagues && profile.favoriteLeagues.length === 0) {
      setFormError("Você deve selecionar pelo menos uma liga favorita.");
      return;
    }

    const storedData = localStorage.getItem("registrationData");
    if (!storedData) {
      setFormError("Dados de registro não encontrados. Por favor, volte e comece o cadastro novamente.");
      toast({ title: "Erro", description: "Dados de registro não encontrados. Tente novamente.", variant: "destructive" });
      navigate("/register");
      return;
    }

    const registrationData = JSON.parse(storedData);
    const completeUserData = { ...registrationData, ...profile };

    try {
      await api.post("/auth/register-complete", completeUserData);
      localStorage.removeItem("registrationData");
      navigate("/login");
    } catch (err: any) {
      const message = err.response?.data?.message || "Não foi possível concluir seu cadastro.";
      setFormError(message);
      toast({ title: "Erro no Cadastro", description: message, variant: "destructive" });
    }
  };

  const clearTeamSearch = () => { setTeamSearchTerm(""); setProfile((p) => ({ ...p, favoriteTeam: "" })); setShowTeamSuggestions(false); };
  const clearLeagueSearch = () => { setLeagueSearchTerm(""); setShowLeagueSuggestions(false); };
  const clearPlayerSearch = () => { setPlayerSearchTerm(""); setShowPlayerSuggestions(false); };
  const clearBettingHouseSearch = () => { setBettingHouseSearchTerm(""); setShowBettingHouseSuggestions(false); };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-gray-100">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-800">Perfil do Usuário</CardTitle>
          <p className="text-blue-600 text-sm">Personalize sua experiência</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Apostar apenas nas ligas favoritas</Label>
                <p className="text-sm text-gray-600">Torna obrigatório selecionar ligas favoritas</p>
              </div>
              <Switch
                checked={profile.betOnlyFavoriteLeagues}
                onCheckedChange={(checked) => setProfile({ ...profile, betOnlyFavoriteLeagues: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" /> Clube Favorito
              </Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Digite o nome do seu time"
                    className="pl-10 pr-10"
                    value={teamSearchTerm}
                    onChange={(e) => { setTeamSearchTerm(e.target.value); setShowTeamSuggestions(true); }}
                    onFocus={() => setShowTeamSuggestions(true)}
                  />
                  {teamSearchTerm && (
                    <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearTeamSearch} />
                  )}
                </div>

                {showTeamSuggestions && teamResults.length > 0 && (
                  <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {teamResults.map((t) => (
                      <div
                        key={t.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                        onClick={() => handleTeamSelect(t.id, t.name)}
                      >
                        {t.logo && <img src={t.logo} alt="" className="h-4 w-4 rounded-full" />}
                        <span>{t.name}</span>
                        {t.country && <span className="ml-auto text-xs text-gray-500">{t.country}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Ligas Favoritas
                {profile.betOnlyFavoriteLeagues && <span className="text-red-500 text-xs ml-1">(obrigatório)</span>}
              </Label>

              {profile.favoriteLeagues.length < 5 && (
                <div className="relative mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Digite o nome de uma liga ou país"
                      className="pl-10 pr-10"
                      value={leagueSearchTerm}
                      onChange={(e) => { setLeagueSearchTerm(e.target.value); setShowLeagueSuggestions(true); }}
                      onFocus={() => setShowLeagueSuggestions(true)}
                    />
                    {leagueSearchTerm && (
                      <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearLeagueSearch} />
                    )}
                  </div>

                  {showLeagueSuggestions && leagueResultsGrouped.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
                      {leagueResultsGrouped.map((bucket) => (
                        <div key={`${bucket.displayName}-${bucket.iso2 ?? "xx"}`}>
                          <CountryHeader name={bucket.displayName} iso2={bucket.iso2} />
                          {bucket.leagues.map((lg) => (
                            <LeagueRow key={lg.id} lg={lg} onSelect={handleLeagueSelect} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {profile.favoriteLeagues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Ligas selecionadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.favoriteLeagues.map((league) => (
                      <div key={league} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm">
                        {league}
                        <X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => removeLeague(league, e)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-700" />
                Jogadores Favoritos
              </Label>

              {profile.favoritePlayers.length < 5 && (
                <div className="relative mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Digite o nome de um jogador"
                      className="pl-10 pr-10"
                      value={playerSearchTerm}
                      onChange={(e) => { setPlayerSearchTerm(e.target.value); setShowPlayerSuggestions(true); }}
                      onFocus={() => setShowPlayerSuggestions(true)}
                    />
                    {playerSearchTerm && (
                      <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearPlayerSearch} />
                    )}
                  </div>

                  {showPlayerSuggestions && playerResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {playerResults.map((pl) => (
                        <div
                          key={pl.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                          onClick={() => handlePlayerSelect(pl.id, pl.name)}
                        >
                          {pl.photo && <img src={pl.photo} alt="" className="h-4 w-4 rounded-full" />}
                          <span>{pl.name}</span>
                          {pl.nationality && <span className="ml-auto text-xs text-gray-500">{pl.nationality}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {profile.favoritePlayers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Jogadores selecionados:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.favoritePlayers.map((player) => (
                      <div key={player} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm">
                        {player}
                        <X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => removePlayer(player, e)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 pt-4 border-t">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" /> Configurações de Segurança e Financeiro
              </h3>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Controle de Apostas</Label>
                  <p className="text-sm text-gray-600">Ativar alertas e limites</p>
                </div>
                <Switch
                  checked={profile.bettingControl}
                  onCheckedChange={(checked) => setProfile({ ...profile, bettingControl: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Monitoramento Financeiro
                  </Label>
                  <p className="text-sm text-gray-600">Controle de bankroll automático</p>
                </div>
                <Switch
                  checked={profile.financialMonitoring}
                  onCheckedChange={(checked) => setProfile({ ...profile, financialMonitoring: checked })}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Intervalo de odds para apostar</Label>
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {profile.oddsRange[0].toFixed(2)} - {profile.oddsRange[1].toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={profile.oddsRange}
                  onValueChange={(newRange: [number, number]) => setProfile({ ...profile, oddsRange: newRange })}
                  max={10}
                  min={1.01}
                  step={0.1}
                />
              </div>

              <div className="space-y-3">
                <Label>Limite de Investimento por mês</Label>
                <RadioGroup
                  value={profile.investmentLimit}
                  onValueChange={(value) => setProfile({ ...profile, investmentLimit: value })}
                >
                  <div className="flex items-center space-x-2"><RadioGroupItem value="abaixo-100" id="r1" /><Label htmlFor="r1">Abaixo de R$100</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="100-200" id="r2" /><Label htmlFor="r2">Entre R$100 e R$200</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="200-500" id="r3" /><Label htmlFor="r3">Entre R$200 e R$500</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="acima-500" id="r4" /><Label htmlFor="r4">Acima de R$500</Label></div>
                </RadioGroup>
              </div>
            </div>

            {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-6">
              Concluir Cadastro
            </Button>
          </form>

          {profile.favoriteBettingHouses.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-600">Casas de aposta favoritas:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.favoriteBettingHouses.map((bh) => (
                  <div key={bh} className="flex items-center bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm">
                    {bh}
                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => removeBettingHouse(bh, e)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {showBettingHouseSuggestions && filteredBettingHouses.length > 0 && (
            <div className="mt-4">
              <Label className="flex items-center gap-2">Adicionar Casa de Apostas</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Digite o nome (ex.: Betano, Bet365)"
                    className="pl-10 pr-10"
                    value={bettingHouseSearchTerm}
                    onChange={(e) => setBettingHouseSearchTerm(e.target.value)}
                    onFocus={() => setShowBettingHouseSuggestions(true)}
                  />
                  {bettingHouseSearchTerm && (
                    <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={clearBettingHouseSearch} />
                  )}
                </div>
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredBettingHouses.map((h) => (
                    <div
                      key={h.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleBettingHouseSelect(h.id, h.name)}
                    >
                      {h.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
