import React, { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from "@/components/ui/checkbox"
import { Search, X, Heart, Users, Trophy, Building, ShieldCheck, Wallet } from 'lucide-react'
import clubsMap from '@/utils/clubs-map.json'
import { getLocalLogo } from '@/utils/getLocalLogo'
import { useToast } from "@/components/ui/use-toast"
import { loadPlayersFromCSV, convertToPlayerOpt } from '@/utils/loadPlayers'

type Props = {
  profile: any
  onCancel: () => void
  onSave: (newProfile: any) => void
}

const KNOWN_LEAGUES = [
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

const BETTING_HOUSES = [
  { id: "betano", name: "Betano" },
  { id: "bet365", name: "Bet365" },
  { id: "pixbet", name: "PixBet" },
  { id: "blaze", name: "Blaze" },
  { id: "sportingbet", name: "SportingBet" },
];

const normalizeArrayField = (raw: any): string[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String)
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
      if (typeof parsed === "string") return [parsed]
      return []
    } catch {
      return raw ? [raw] : []
    }
  }
  return [String(raw)]
}

const toBool = (v: any) => v === true || v === 1 || v === "1" || v === "true"

const normalizeOddsRange = (minV: any, maxV: any, fallback: [number, number] = [1.5, 3.0]) => {
  const min = Number(minV)
  const max = Number(maxV)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback
  return [min, max]
}

export const EditProfileCard: React.FC<Props> = ({ profile, onCancel, onSave }) => {
  const [form, setForm] = useState<any>({
    favoriteTeam: profile?.favoriteTeam || '',
    favoriteLeagues: profile?.favoriteLeagues || [],
    favoritePlayers: profile?.favoritePlayers || [],
    favoriteBettingHouses: profile?.favoriteBettingHouses || [],
    bettingControl: !!profile?.bettingControl,
    financialMonitoring: !!profile?.financialMonitoring,
    betOnlyFavoriteLeagues: !!profile?.betOnlyFavoriteLeagues,
    oddsRange: profile?.oddsRange || [1.5, 3.0],
    investmentLimit: profile?.investmentLimit || 'abaixo-100',
  })

  const [teamSearchTerm, setTeamSearchTerm] = useState('')
  const [teamResults, setTeamResults] = useState<any[]>([])
  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false)
  const teamWrapperRef = useRef<HTMLDivElement>(null)

  const [playerSearchTerm, setPlayerSearchTerm] = useState('')
  const [playerResults, setPlayerResults] = useState<any[]>([])
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false)
  const playerWrapperRef = useRef<HTMLDivElement>(null)
  const [allPlayers, setAllPlayers] = useState<any[]>([])

  // Ligas
  const [leagueSearchTerm, setLeagueSearchTerm] = useState('')
  const [leagueResults, setLeagueResults] = useState<any[]>([])
  const [showLeagueSuggestions, setShowLeagueSuggestions] = useState(false)
  const leagueWrapperRef = useRef<HTMLDivElement>(null)

  // Casas
  const [houseSearchTerm, setHouseSearchTerm] = useState('')
  const [houseResults, setHouseResults] = useState<any[]>([])
  const [showHouseSuggestions, setShowHouseSuggestions] = useState(false)
  const houseWrapperRef = useRef<HTMLDivElement>(null)

  const toast = useToast()

  // ---------------------------------------------------------
  // Carrega lista de jogadores (CSV)
  // ---------------------------------------------------------
  useEffect(() => {
    async function loadPlayers() {
      try {
        const raw = await loadPlayersFromCSV()
        const mapped = convertToPlayerOpt(raw)
        setAllPlayers(mapped)
      } catch (err) {
        // fallback silent
      }
    }
    loadPlayers()
  }, [])

  // ---------------------------------------------------------
  // Ao abrir o modal, tenta buscar preferências reais do backend
  // (para preencher o form mesmo se o profile prop veio incompleto)
  // ---------------------------------------------------------
  useEffect(() => {
    let mounted = true

    const applyBackendData = (data: any) => {
      const favoriteTeam =
        data?.favoriteTeam ??
        data?.clubes_favoritos ??
        data?.clube_favorito ??
        ''

      const favoriteLeagues =
        data?.favoriteLeagues ??
        data?.ligasFavoritas ??
        normalizeArrayField(data?.ligas_favoritas)

      const favoritePlayers =
        data?.favoritePlayers ??
        normalizeArrayField(data?.jogadores_favoritos)

      const favoriteBettingHouses =
        data?.favoriteBettingHouses ??
        normalizeArrayField(data?.casas_apostas_favoritas)

      const bettingControl =
        data?.bettingControl ??
        toBool(data?.controle_apostas_ativo)

      const financialMonitoring =
        data?.financialMonitoring ??
        toBool(data?.monitoramento_financeiro_ativo)

      const betOnlyFavoriteLeagues =
        data?.betOnlyFavoriteLeagues ??
        toBool(data?.apostar_apenas_ligas_favoritas)

      const oddsRange =
        data?.oddsRange ??
        normalizeOddsRange(data?.odd_minima, data?.odd_maxima, [1.5, 3.0])

      const investmentLimit =
        data?.investmentLimit ??
        data?.limite_investimento_mensal ??
        'abaixo-100'

      const next = {
        favoriteTeam: favoriteTeam || '',
        favoriteLeagues: Array.isArray(favoriteLeagues) ? favoriteLeagues : [],
        favoritePlayers: Array.isArray(favoritePlayers) ? favoritePlayers : [],
        favoriteBettingHouses: Array.isArray(favoriteBettingHouses) ? favoriteBettingHouses : [],
        bettingControl: !!bettingControl,
        financialMonitoring: !!financialMonitoring,
        betOnlyFavoriteLeagues: !!betOnlyFavoriteLeagues,
        oddsRange: Array.isArray(oddsRange) ? oddsRange : [1.5, 3.0],
        investmentLimit: investmentLimit || 'abaixo-100',
      }

      if (mounted) setForm((prev: any) => ({ ...prev, ...next }))
    }

    const fetchPrefs = async () => {
      try {
        const api = (await import('@/services/api')).default

        // 1) Se existir GET /user/profile, usa direto
        try {
          const pr = await api.get('/user/profile')
          if (pr?.data) {
            applyBackendData(pr.data)
            return
          }
        } catch {
          // fallback abaixo
        }

        // 2) Fallback: /auth/me + /user/preferences + /user/betting-control-status
        const [meRes, prefsRes, bcRes] = await Promise.allSettled([
          api.get('/auth/me'),
          api.get('/user/preferences'),
          api.get('/user/betting-control-status'),
        ])

        const merged: any = {}

        if (meRes.status === 'fulfilled' && meRes.value?.data?.user) {
          const u = meRes.value.data.user
          merged.favoriteTeam = u.favoriteTeam ?? merged.favoriteTeam ?? ''
        }

        if (prefsRes.status === 'fulfilled' && prefsRes.value?.data) {
          const ligas = prefsRes.value.data.ligasFavoritas
          merged.ligasFavoritas = Array.isArray(ligas) ? ligas : []
        }

        if (bcRes.status === 'fulfilled' && bcRes.value?.data) {
          merged.controle_apostas_ativo = bcRes.value.data.bettingControlActive ? 1 : 0
        }

        applyBackendData(merged)
      } catch {
        // silent
      }
    }

    fetchPrefs()
    return () => { mounted = false }
  }, [])

  // ---------------------------------------------------------
  // Sugestões - Clubes
  // ---------------------------------------------------------
  useEffect(() => {
    if (!showTeamSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(teamSearchTerm || '').toLowerCase()
      const results: any[] = []
      for (const key in (clubsMap as any)) {
        const club = (clubsMap as any)[key]
        if (!q || key.toLowerCase().includes(q) || (club.name || '').toLowerCase().includes(q)) {
          const logo = club.logo ? getLocalLogo(club.logo) : null
          results.push({ id: key, name: key, logo })
        }
      }
      setTeamResults(results.slice(0, 200))
    }, 120)
    return () => window.clearTimeout(id)
  }, [teamSearchTerm, showTeamSuggestions])

  // ---------------------------------------------------------
  // Sugestões - Jogadores
  // ---------------------------------------------------------
  useEffect(() => {
    if (!showPlayerSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(playerSearchTerm || '').toLowerCase()
      const filtered = allPlayers
        .filter((p: any) =>
          (p.name || '').toLowerCase().includes(q) || (p.club || '').toLowerCase().includes(q)
        )
        .slice(0, 40)
      setPlayerResults(filtered)
    }, 120)
    return () => window.clearTimeout(id)
  }, [playerSearchTerm, showPlayerSuggestions, allPlayers])

  // ---------------------------------------------------------
  // Sugestões - Ligas
  // ---------------------------------------------------------
  useEffect(() => {
    if (!showLeagueSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(leagueSearchTerm || '').toLowerCase()
      const filtered = KNOWN_LEAGUES.filter(l => !q || l.name.toLowerCase().includes(q)).slice(0, 50)
      setLeagueResults(filtered)
    }, 100)
    return () => window.clearTimeout(id)
  }, [leagueSearchTerm, showLeagueSuggestions])

  // ---------------------------------------------------------
  // Sugestões - Casas
  // ---------------------------------------------------------
  useEffect(() => {
    if (!showHouseSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(houseSearchTerm || '').toLowerCase()
      const filtered = BETTING_HOUSES.filter(h => !q || h.name.toLowerCase().includes(q))
      setHouseResults(filtered)
    }, 100)
    return () => window.clearTimeout(id)
  }, [houseSearchTerm, showHouseSuggestions])

  // ---------------------------------------------------------
  // Clique fora fecha dropdowns
  // ---------------------------------------------------------
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (teamWrapperRef.current && !teamWrapperRef.current.contains(e.target as Node)) setShowTeamSuggestions(false)
      if (playerWrapperRef.current && !playerWrapperRef.current.contains(e.target as Node)) setShowPlayerSuggestions(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    function handleOutside2(e: MouseEvent) {
      if (leagueWrapperRef.current && !leagueWrapperRef.current.contains(e.target as Node)) setShowLeagueSuggestions(false)
      if (houseWrapperRef.current && !houseWrapperRef.current.contains(e.target as Node)) setShowHouseSuggestions(false)
    }
    document.addEventListener('mousedown', handleOutside2)
    return () => document.removeEventListener('mousedown', handleOutside2)
  }, [])

  // ---------------------------------------------------------
  // Sempre que profile mudar (prop), reflete no form (sem apagar o que veio do backend)
  // ---------------------------------------------------------
  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      favoriteTeam: profile?.favoriteTeam ?? prev.favoriteTeam ?? '',
      favoriteLeagues: profile?.favoriteLeagues ?? prev.favoriteLeagues ?? [],
      favoritePlayers: profile?.favoritePlayers ?? prev.favoritePlayers ?? [],
      favoriteBettingHouses: profile?.favoriteBettingHouses ?? prev.favoriteBettingHouses ?? [],
      bettingControl: profile?.bettingControl ?? prev.bettingControl ?? false,
      financialMonitoring: profile?.financialMonitoring ?? prev.financialMonitoring ?? false,
      betOnlyFavoriteLeagues: profile?.betOnlyFavoriteLeagues ?? prev.betOnlyFavoriteLeagues ?? false,
      oddsRange: profile?.oddsRange ?? prev.oddsRange ?? [1.5, 3.0],
      investmentLimit: profile?.investmentLimit ?? prev.investmentLimit ?? 'abaixo-100',
    }))
  }, [profile])

  const handleLeagueSelect = (l: any) => {
    if (!(form.favoriteLeagues || []).includes(l.name) && (form.favoriteLeagues || []).length < 5) {
      setForm({ ...form, favoriteLeagues: [...(form.favoriteLeagues || []), l.name] })
    }
    setLeagueSearchTerm('')
    setShowLeagueSuggestions(false)
  }

  const removeLeague = (name: string) =>
    setForm({ ...form, favoriteLeagues: (form.favoriteLeagues || []).filter((x: string) => x !== name) })

  const handleHouseSelect = (h: any) => {
    if (!(form.favoriteBettingHouses || []).includes(h.name) && (form.favoriteBettingHouses || []).length < 5) {
      setForm({ ...form, favoriteBettingHouses: [...(form.favoriteBettingHouses || []), h.name] })
    }
    setHouseSearchTerm('')
    setShowHouseSuggestions(false)
  }

  const removeHouse = (name: string) =>
    setForm({ ...form, favoriteBettingHouses: (form.favoriteBettingHouses || []).filter((x: string) => x !== name) })

  const removePlayer = (name: string) =>
    setForm({ ...form, favoritePlayers: (form.favoritePlayers || []).filter((x: string) => x !== name) })

  const handleSave = async () => {
    try {
      const api = (await import('@/services/api')).default

      // ✅ Compatível com seu updateProfile no backend:
      // favoriteTeam, favoriteLeagues, favoritePlayers, favoriteBettingHouses,
      // bettingControl, financialMonitoring, betOnlyFavoriteLeagues, oddsRange, investmentLimit
      await api.put('/user/profile', {
        favoriteTeam: form.favoriteTeam || null,
        favoriteLeagues: form.favoriteLeagues || [],
        favoritePlayers: form.favoritePlayers || [],
        favoriteBettingHouses: form.favoriteBettingHouses || [],
        bettingControl: !!form.bettingControl,
        financialMonitoring: !!form.financialMonitoring,
        betOnlyFavoriteLeagues: !!form.betOnlyFavoriteLeagues,
        oddsRange: form.oddsRange || [1.5, 3.0],
        investmentLimit: form.investmentLimit || null,
      })

      toast.toast({ title: 'Perfil atualizado', description: 'Preferências salvas.' })
      onSave({
        ...form,
        favoriteTeam: form.favoriteTeam || null,
        favoriteLeagues: form.favoriteLeagues || [],
        favoritePlayers: form.favoritePlayers || [],
        favoriteBettingHouses: form.favoriteBettingHouses || [],
        bettingControl: !!form.bettingControl,
        financialMonitoring: !!form.financialMonitoring,
        betOnlyFavoriteLeagues: !!form.betOnlyFavoriteLeagues,
        oddsRange: form.oddsRange || [1.5, 3.0],
        investmentLimit: form.investmentLimit || 'abaixo-100',
      })
    } catch (err) {
      console.error(err)
      toast.toast({ title: 'Erro', description: 'Não foi possível salvar.' })
    }
  }

  return (
    <div className="w-full">
      {/* Header no padrão das páginas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Editar Perfil
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Preferências do seu perfil e do robô
          </p>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="rounded-xl"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSave}
            className="rounded-xl bg-[#014a8f] hover:bg-[#003b70] text-white font-semibold"
          >
            Salvar
          </Button>
        </div>
      </div>

      {/* Corpo com “seções” no estilo panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna 1 */}
        <div className="space-y-4">
          {/* Clube Favorito */}
          <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
            <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
              <Heart className="w-4 h-4 text-red-500" />
              Clube Favorito
            </Label>

            <div ref={teamWrapperRef}>
            {/* INPUT AREA (o "relative" fica só aqui) */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />

              <Input
                className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                placeholder="Digite o nome do seu time"
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
                    setForm({ ...form, favoriteTeam: "" });
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
                      onClick={() => {
                        setForm({ ...form, favoriteTeam: t.name });
                        setTeamSearchTerm(t.name);
                        setShowTeamSuggestions(false);
                      }}
                    >
                      {t.logo && <img src={t.logo} className="h-5 w-5" alt={t.name} />}
                      <span className="text-sm text-gray-800 dark:text-gray-100">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CHIP (fora do relative do input) */}
            {form.favoriteTeam && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-green-200/70 dark:border-green-900/40 bg-green-50/70 dark:bg-green-950/20 px-3 py-2 text-sm text-green-800 dark:text-green-200">
                {(() => {
                  const club = (clubsMap as any)[form.favoriteTeam];
                  const logo = club?.logo ? getLocalLogo(club.logo) : null;
                  return logo ? <img src={logo} className="h-5 w-5" alt="logo" /> : null;
                })()}
                <span className="font-semibold">{form.favoriteTeam}</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, favoriteTeam: "" })}
                  className="ml-1 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/20"
                  aria-label="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          </div>
          {/* Ligas Favoritas */}
          <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
            <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Ligas Favoritas
            </Label>

            <div className="relative" ref={leagueWrapperRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                placeholder="Digite o nome de uma liga"
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
                  {leagueResults.map((l: any) => (
                    <button
                      type="button"
                      key={l.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                      onClick={() => handleLeagueSelect(l)}
                    >
                      {l.logo && (
                        <img src={l.logo} className="h-5 w-5" alt={l.name} />
                      )}
                      <span className="text-sm text-gray-800 dark:text-gray-100">
                        {l.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {(form.favoriteLeagues || []).map((l: string) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-200"
                >
                  {l}
                  <button
                    type="button"
                    onClick={() => removeLeague(l)}
                    className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20"
                    aria-label="Remover liga"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 2 */}
        <div className="space-y-4">
          {/* Jogadores */}
          <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
            <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
              <Users className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              Jogadores Favoritos
            </Label>

            <div className="relative" ref={playerWrapperRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                placeholder="Digite o nome de um jogador"
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
                  {playerResults.map((p: any) => (
                    <button
                      type="button"
                      key={p.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-900/60"
                      onClick={() => {
                        if (
                          !(form.favoritePlayers || []).includes(p.name) &&
                          (form.favoritePlayers || []).length < 5
                        ) {
                          setForm({
                            ...form,
                            favoritePlayers: [...(form.favoritePlayers || []), p.name],
                          });
                        }
                        setPlayerSearchTerm("");
                        setShowPlayerSuggestions(false);
                      }}
                    >
                      {p.logo && (
                        <img
                          src={p.logo}
                          className="h-5 w-5 rounded-sm object-cover"
                          alt={p.name}
                        />
                      )}
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

            <div className="flex flex-wrap gap-2 mt-3">
              {(form.favoritePlayers || []).map((pl: string) => (
                <span
                  key={pl}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-200"
                >
                  {pl}
                  <button
                    type="button"
                    onClick={() => removePlayer(pl)}
                    className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20"
                    aria-label="Remover jogador"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Casas de Apostas */}
          <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4">
            <Label className="flex items-center gap-2 mb-2 font-semibold text-gray-900 dark:text-gray-100">
              <Building className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              Casas de Apostas
            </Label>

            <div className="relative" ref={houseWrapperRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                placeholder="Digite o nome da casa de apostas"
                className="pl-10 pr-10 h-11 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                value={houseSearchTerm}
                onChange={(e) => {
                  setHouseSearchTerm(e.target.value);
                  setShowHouseSuggestions(true);
                }}
                onFocus={() => setShowHouseSuggestions(true)}
              />

              {houseSearchTerm && (
                <button
                  type="button"
                  onClick={() => setHouseSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="Limpar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {showHouseSuggestions && houseResults.length > 0 && (
                <div className="absolute z-10 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur shadow-lg">
                  {houseResults.map((h: any) => (
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

            <div className="flex flex-wrap gap-2 mt-3">
              {(form.favoriteBettingHouses || []).map((h: string) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-200"
                >
                  {h}
                  <button
                    type="button"
                    onClick={() => removeHouse(h)}
                    className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20"
                    aria-label="Remover casa"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferências / Controles */}
          <div className="rounded-2xl bg-white/70 dark:bg-neutral-950/40 border border-gray-200/70 dark:border-neutral-800 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bettingControl"
                checked={!!form.bettingControl}
                onCheckedChange={(checked) =>
                  setForm({ ...form, bettingControl: checked as boolean })
                }
              />
              <Label
                htmlFor="bettingControl"
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-800 dark:text-gray-100"
              >
                <ShieldCheck className="w-4 h-4 text-[#014a8f]" />
                Controle de Apostas (limite diário)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="financialMonitoring"
                checked={!!form.financialMonitoring}
                onCheckedChange={(checked) =>
                  setForm({ ...form, financialMonitoring: checked as boolean })
                }
              />
              <Label
                htmlFor="financialMonitoring"
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-800 dark:text-gray-100"
              >
                <Wallet className="w-4 h-4 text-green-700" />
                Monitoramento Financeiro
              </Label>
            </div>

            <div>
              <Label className="mb-2 block font-semibold text-gray-900 dark:text-gray-100">
                Intervalo de odds
              </Label>
              <Slider
                value={form.oddsRange}
                onValueChange={(v: any) => setForm({ ...form, oddsRange: v })}
                min={1.01}
                max={10}
                step={0.1}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {(form.oddsRange || [1, 2])[0].toFixed(2)} –{" "}
                {(form.oddsRange || [1, 2])[1].toFixed(2)}
              </p>
            </div>

            <div>
              <Label className="mb-2 block font-semibold text-gray-900 dark:text-gray-100">
                Limite de investimento mensal
              </Label>
              <RadioGroup
                value={form.investmentLimit}
                onValueChange={(v: any) => setForm({ ...form, investmentLimit: v })}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditProfileCard
