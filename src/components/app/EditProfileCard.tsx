import React, { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Search, X, Heart, Users, Trophy, Building } from 'lucide-react'
import clubsMap from '@/utils/clubs-map.json'
import { getLocalLogo } from '@/utils/getLocalLogo'
import { useToast } from '@/hooks/use-toast'
import { loadPlayersFromCSV, convertToPlayerOpt } from '@/utils/loadPlayers'

type Props = {
  profile: any
  onCancel: () => void
  onSave: (newProfile: any) => void
}

const KNOWN_LEAGUES = [
  { id: 'brasileirao-serie-a', name: 'Brasileirão Série A', logo: '/logos/Ligas/BrasileiraoSerieA.webp' },
  { id: 'champions-league', name: 'Champions League', logo: '/logos/Ligas/ChampionsLeague.png' },
  { id: 'premier-league', name: 'Premier League', logo: '/logos/Ligas/PremierLeague.png' },
]

const BETTING_HOUSES = [
  { id: 'betano', name: 'Betano' },
  { id: 'bet365', name: 'Bet365' },
  { id: 'pixbet', name: 'PixBet' },
]

export const EditProfileCard: React.FC<Props> = ({ profile, onCancel, onSave }) => {
  const [form, setForm] = useState<any>({
    favoriteTeam: profile?.favoriteTeam || '',
    favoriteLeagues: profile?.favoriteLeagues || [],
    favoritePlayers: profile?.favoritePlayers || [],
    favoriteBettingHouses: profile?.favoriteBettingHouses || [],
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

  useEffect(() => {
    if (!showTeamSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(teamSearchTerm || '').toLowerCase()
      const results: any[] = []
      for (const key in clubsMap) {
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

  useEffect(() => {
    if (!showPlayerSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(playerSearchTerm || '').toLowerCase()
      const filtered = allPlayers.filter((p:any)=> (p.name||'').toLowerCase().includes(q) || (p.club||'').toLowerCase().includes(q)).slice(0,40)
      setPlayerResults(filtered)
    }, 120)
    return () => window.clearTimeout(id)
  }, [playerSearchTerm, showPlayerSuggestions, allPlayers])

  useEffect(() => {
    if (!showLeagueSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(leagueSearchTerm || '').toLowerCase()
      const filtered = KNOWN_LEAGUES.filter(l => !q || l.name.toLowerCase().includes(q)).slice(0, 50)
      setLeagueResults(filtered)
    }, 100)
    return () => window.clearTimeout(id)
  }, [leagueSearchTerm, showLeagueSuggestions])

  useEffect(() => {
    if (!showHouseSuggestions) return
    const id = window.setTimeout(() => {
      const q = String(houseSearchTerm || '').toLowerCase()
      const filtered = BETTING_HOUSES.filter(h => !q || h.name.toLowerCase().includes(q))
      setHouseResults(filtered)
    }, 100)
    return () => window.clearTimeout(id)
  }, [houseSearchTerm, showHouseSuggestions])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (teamWrapperRef.current && !teamWrapperRef.current.contains(e.target as Node)) setShowTeamSuggestions(false)
      if (playerWrapperRef.current && !playerWrapperRef.current.contains(e.target as Node)) setShowPlayerSuggestions(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return ()=> document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    function handleOutside2(e: MouseEvent) {
      if (leagueWrapperRef.current && !leagueWrapperRef.current.contains(e.target as Node)) setShowLeagueSuggestions(false)
      if (houseWrapperRef.current && !houseWrapperRef.current.contains(e.target as Node)) setShowHouseSuggestions(false)
    }
    document.addEventListener('mousedown', handleOutside2)
    return ()=> document.removeEventListener('mousedown', handleOutside2)
  }, [])

  useEffect(()=>{
    setForm({
      favoriteTeam: profile?.favoriteTeam || '',
      favoriteLeagues: profile?.favoriteLeagues || [],
      favoritePlayers: profile?.favoritePlayers || [],
      favoriteBettingHouses: profile?.favoriteBettingHouses || [],
      oddsRange: profile?.oddsRange || [1.5,3.0],
      investmentLimit: profile?.investmentLimit || 'abaixo-100',
    })
  }, [profile])

  const handleLeagueSelect = (l: any) => {
    if (!(form.favoriteLeagues || []).includes(l.name) && (form.favoriteLeagues || []).length < 5) {
      setForm({...form, favoriteLeagues: [...(form.favoriteLeagues||[]), l.name]})
    }
    setLeagueSearchTerm('')
    setShowLeagueSuggestions(false)
  }

  const removeLeague = (name: string) => setForm({...form, favoriteLeagues: (form.favoriteLeagues||[]).filter((x:string)=>x!==name)})

  const handleHouseSelect = (h: any) => {
    if (!(form.favoriteBettingHouses || []).includes(h.name) && (form.favoriteBettingHouses || []).length < 5) {
      setForm({...form, favoriteBettingHouses: [...(form.favoriteBettingHouses||[]), h.name]})
    }
    setHouseSearchTerm('')
    setShowHouseSuggestions(false)
  }

  const removeHouse = (name: string) => setForm({...form, favoriteBettingHouses: (form.favoriteBettingHouses||[]).filter((x:string)=>x!==name)})

  const handleSave = async () => {
    try {
      const api = (await import('@/services/api')).default
      await api.put('/user/profile', form)
      toast.toast({ title: 'Perfil atualizado', description: 'Preferências salvas.' })
      onSave(form)
    } catch (err) {
      console.error(err)
      toast.toast({ title: 'Erro', description: 'Não foi possível salvar.' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Clube favorito */}
          <div>
            <Label className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4 text-red-500"/> Clube Favorito</Label>
            <div className="relative" ref={teamWrapperRef}>
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input className="pl-10 pr-10" placeholder="Digite o nome do seu time" value={teamSearchTerm} onChange={(e)=>{ setTeamSearchTerm(e.target.value); setShowTeamSuggestions(true) }} onFocus={()=>setShowTeamSuggestions(true)} />
              {teamSearchTerm && <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={()=>{ setTeamSearchTerm(''); setForm({...form, favoriteTeam: ''})}} />}
              {showTeamSuggestions && teamResults.length>0 && (
                <div className="absolute z-40 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                  {teamResults.map(t=> (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={()=>{ setForm({...form, favoriteTeam: t.name}); setTeamSearchTerm(t.name); setShowTeamSuggestions(false)}}>
                      {t.logo && <img src={t.logo} className="h-5 w-5" alt={t.name} />}
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {form.favoriteTeam && (
                <div className="mt-2 flex items-center bg-green-50 text-green-800 rounded-full px-3 py-1 text-sm gap-2">
                  {(() => { const club=(clubsMap as any)[form.favoriteTeam]; const logo = club?.logo ? getLocalLogo(club.logo) : null; return logo ? <img src={logo} className="h-5 w-5" alt="logo" /> : null })()}
                  <span>{form.favoriteTeam}</span>
                  <X className="ml-1 h-3 w-3 cursor-pointer" onClick={()=>setForm({...form, favoriteTeam: ''})} />
                </div>
              )}
            </div>
          </div>

          {/* Ligas favoritas */}
          <div>
            <Label className="flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-yellow-500"/> Ligas Favoritas</Label>
            <div className="relative" ref={leagueWrapperRef}>
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input className="pl-10 pr-10" placeholder="Digite o nome de uma liga" value={leagueSearchTerm} onChange={(e)=>{ setLeagueSearchTerm(e.target.value); setShowLeagueSuggestions(true)}} onFocus={()=>setShowLeagueSuggestions(true)} />
              {leagueSearchTerm && <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={()=>setLeagueSearchTerm('')} />}
              {showLeagueSuggestions && leagueResults.length>0 && (
                <div className="absolute z-30 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                  {leagueResults.map((l:any)=> (
                    <div key={l.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={()=>handleLeagueSelect(l)}>
                      {l.logo && <img src={l.logo} className="h-5 w-5" alt={l.name} />}
                      <span>{l.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.favoriteLeagues||[]).map((l:string)=> (
                <div key={l} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm gap-2">
                  <span>{l}</span>
                  <X className="ml-1 h-3 w-3 cursor-pointer" onClick={()=>removeLeague(l)} />
                </div>
              ))}
            </div>
          </div>

          {/* Jogadores */}
          <div>
            <Label className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-gray-700"/> Jogadores Favoritos</Label>
            <div className="relative" ref={playerWrapperRef}>
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input className="pl-10 pr-10" placeholder="Digite o nome de um jogador" value={playerSearchTerm} onChange={(e)=>{ setPlayerSearchTerm(e.target.value); setShowPlayerSuggestions(true)}} onFocus={()=>setShowPlayerSuggestions(true)} />
              {playerSearchTerm && <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={()=>setPlayerSearchTerm('')} />}
              {showPlayerSuggestions && playerResults.length>0 && (
                <div className="absolute z-20 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                  {playerResults.map((p:any)=> (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={()=>{ if(!(form.favoritePlayers||[]).includes(p.name) && (form.favoritePlayers||[]).length<5) setForm({...form, favoritePlayers: [...(form.favoritePlayers||[]), p.name]}); setPlayerSearchTerm(''); setShowPlayerSuggestions(false)}}>
                      {p.logo && <img src={p.logo} className="h-5 w-5 rounded-sm object-cover" alt={p.name} />}
                      <span>{p.name}</span>
                      {p.club && <span className="ml-auto text-xs text-gray-500">{p.club}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {(form.favoritePlayers||[]).map((pl:string)=> (
                <div key={pl} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm gap-2">
                  {pl}
                </div>
              ))}
            </div>
          </div>

          {/* Casas de apostas */}
          <div>
            <Label className="flex items-center gap-2 mb-2"><Building className="w-4 h-4 text-gray-700"/> Casas de Apostas</Label>
            <div className="relative" ref={houseWrapperRef}>
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input placeholder="Digite o nome da casa de apostas" className="pl-10 pr-10" value={houseSearchTerm} onChange={(e)=>{ setHouseSearchTerm(e.target.value); setShowHouseSuggestions(true)}} onFocus={()=>setShowHouseSuggestions(true)} />
              {houseSearchTerm && <X className="absolute right-3 top-3 h-4 w-4 text-gray-500 cursor-pointer" onClick={()=>setHouseSearchTerm('')} />}
              {showHouseSuggestions && houseResults.length>0 && (
                <div className="absolute z-10 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-auto">
                  {houseResults.map((h:any)=> (
                    <div key={h.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={()=>handleHouseSelect(h)}>{h.name}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.favoriteBettingHouses||[]).map((h:string)=> (
                <div key={h} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm gap-2">
                  <span>{h}</span>
                  <X className="ml-1 h-3 w-3 cursor-pointer" onClick={()=>removeHouse(h)} />
                </div>
              ))}
            </div>
          </div>

          {/* Slider odds */}
          <div>
            <Label className="mb-2 block">Intervalo de odds</Label>
            <Slider value={form.oddsRange} onValueChange={(v:any)=>setForm({...form, oddsRange: v})} min={1.01} max={10} step={0.1} />
            <p className="text-sm text-gray-600 mt-1">{(form.oddsRange||[1,2])[0].toFixed(2)} – {(form.oddsRange||[1,2])[1].toFixed(2)}</p>
          </div>

          {/* Limite mensal */}
          <div>
            <Label className="mb-2 block">Limite de investimento mensal</Label>
            <RadioGroup value={form.investmentLimit} onValueChange={(v:any)=>setForm({...form, investmentLimit: v})}>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center space-x-2"><RadioGroupItem value="abaixo-100" id="r1"/><Label htmlFor="r1">Abaixo de R$100</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="100-200" id="r2"/><Label htmlFor="r2">Entre R$100 e R$200</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="200-500" id="r3"/><Label htmlFor="r3">Entre R$200 e R$500</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="acima-500" id="r4"/><Label htmlFor="r4">Acima de R$500</Label></div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EditProfileCard
