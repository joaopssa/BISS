// src/components/app/BettingHistoryScreen.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";

// Ícone de Filtro
const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

type Aposta = {
  id_aposta: number;
  campeonato: string;
  partida: string;
  mercado: string; // Tipo de aposta
  selecao: string;
  odd: number;
  valor_apostado: number;
  possivel_retorno: number;
  status_aposta: "pendente" | "ganha" | "perdida" | "cancelada";
  data_registro: string;
};

export default function BettingHistoryScreen() {
  // Scroll para o topo ao montar o componente
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados dos Filtros
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterLeague, setFilterLeague] = useState<string | null>(null);
  const [filterMarket, setFilterMarket] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Ref para detectar clique fora do painel de filtros
  const filtersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showFilters) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      // fecha se o clique não for dentro do painel e não for no botão que abre o filtro
      if (filtersRef.current && !filtersRef.current.contains(target) && !(target.closest && target.closest('#filters-toggle'))) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showFilters]);

  const fetchHistorico = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get("/apostas/historico");
      const data = Array.isArray(res.data) ? res.data : [];

      const mapped: Aposta[] = data.map((a: any) => ({
        id_aposta: a.id_aposta ?? a.id ?? 0,
        campeonato: a.campeonato || "—",
        partida: a.partida || "—",
        mercado: a.mercado || "—",
        selecao: a.selecao || "—",
        odd: Number(a.odd) || 0,
        valor_apostado: Number(a.valor_apostado) || 0,
        possivel_retorno: Number(a.possivel_retorno) || 0,
        status_aposta: a.status_aposta || "pendente",
        data_registro: a.data_registro || new Date().toISOString(),
      }));

      setApostas(mapped);
    } catch (err: any) {
      console.error(err);
      setErro("Erro ao carregar histórico de apostas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, []);

  // Extrair opções únicas para os selects (usando useMemo para performance)
  const uniqueLeagues = useMemo(() => Array.from(new Set(apostas.map(a => a.campeonato))).sort(), [apostas]);
  const uniqueMarkets = useMemo(() => Array.from(new Set(apostas.map(a => a.mercado))).sort(), [apostas]);
  const uniqueStatus = useMemo(() => Array.from(new Set(apostas.map(a => a.status_aposta))).sort(), [apostas]);

  // Lógica de Filtragem Principal
  const filteredApostas = apostas.filter(a => {
    if (filterLeague && a.campeonato !== filterLeague) return false;
    if (filterMarket && a.mercado !== filterMarket) return false;
    if (filterStatus && a.status_aposta !== filterStatus) return false;
    return true;
  });

  const getStatusStyle = (status: Aposta["status_aposta"]) => {
    switch (status) {
      case "ganha": return "text-green-600 bg-green-50 border-green-200";
      case "perdida": return "text-red-600 bg-red-50 border-red-200";
      case "cancelada": return "text-gray-600 bg-gray-50 border-gray-200";
      default: return "text-yellow-700 bg-yellow-50 border-yellow-200";
    }
  };

  const handleClearFilters = () => {
    setFilterLeague(null);
    setFilterMarket(null);
    setFilterStatus(null);
  };

  // --- MÉTRICAS DO HISTÓRICO ---

  // Normaliza nomes (remove acentos e mantém padrão)
  // --- MÉTRICAS BASEADAS NO FILTRO ---
  const base = filteredApostas; // <<--- AGORA O CARD USA SOMENTE APOSTAS FILTRADAS

  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();

  const parseTeams = (partida: string) => {
    if (!partida) return [];
    const sep = /\s+vs\.?\s+|\s+x\s+|\s+X\s+|\s+-\s+|\s+vs\s+/i;
    const parts = partida.split(sep).map(s => s.trim());
    return parts.length >= 2 ? parts.slice(0, 2) : [];
  };

  // Total de jogos (não duplica)
  const uniqueGames = new Set(base.map(a => normalize(a.partida)));
  const totalGames = uniqueGames.size;

  // Times distintos
  const allTeams = base.flatMap(a => parseTeams(a.partida));
  const distinctTeams = new Set(allTeams.map(t => normalize(t))).size;

  // Estatísticas por clube
  const clubStats: Record<string, { apostas: number; ganha: number; perdida: number }> = {};

  base.forEach(a => {
    const teams = parseTeams(a.partida);
    teams.forEach(team => {
      if (!team) return;
      const key = normalize(team);
      if (!clubStats[key]) clubStats[key] = { apostas: 0, ganha: 0, perdida: 0 };
      clubStats[key].apostas++;
      if (a.status_aposta === "ganha") clubStats[key].ganha++;
      if (a.status_aposta === "perdida") clubStats[key].perdida++;
    });
  });

  // Ordena clubes por quantidade de apostas
  const sortedClubs = Object.entries(clubStats)
    .sort((a, b) => b[1].apostas - a[1].apostas)
    .map(([name, stats]) => ({ name, ...stats }));

  const top4 = sortedClubs.slice(0, 4);



  const [showAllClubs, setShowAllClubs] = useState(false);

  // Busca logo do clube
  const findLogo = (teamName: string) => {
    for (const key in clubsMap) {
      const normalized = normalize(key);
      if (normalized === teamName) return getLocalLogo(clubsMap[key].logo);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <header className="bg-[#014a8f] text-white p-4 shadow sticky top-0 z-40">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <h1 className="text-xl font-bold">Histórico de Apostas</h1>
          
          <div className="flex items-center gap-3 relative">
            <Button
              id="filters-toggle"
              onClick={() => setShowFilters(!showFilters)}
              className={`text-sm flex items-center gap-2 ${
                showFilters || filterLeague || filterMarket || filterStatus
                  ? "bg-white text-[#014a8f] hover:bg-gray-100" 
                  : "bg-[#013a70] text-white hover:bg-[#012a50]"
              }`}
            >
              <FilterIcon />
              Filtros
              {(filterLeague || filterMarket || filterStatus) && (
                <span className="ml-1 w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </Button>

            {showFilters && (
              <div ref={filtersRef} className="absolute right-0 mt-2 w-72 p-4 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-gray-200 dark:border-neutral-800 z-50 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm">Filtrar por:</h3>
                
                {/* Filtro de Liga */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Liga / Campeonato</label>
                  <select
                    value={filterLeague ?? ""}
                    onChange={(e) => setFilterLeague(e.target.value || null)}
                    className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-2 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                  >
                    <option value="" className="text-gray-500">Todas</option>
                    {uniqueLeagues.map((c) => (
                      <option key={c} value={c} className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Mercado (Tipo de Aposta) */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de Aposta (Mercado)</label>
                  <select
                    value={filterMarket ?? ""}
                    onChange={(e) => setFilterMarket(e.target.value || null)}
                    className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-2 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                  >
                    <option value="" className="text-gray-500">Todos</option>
                    {uniqueMarkets.map((m) => (
                      <option key={m} value={m} className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Status */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                  <select
                    value={filterStatus ?? ""}
                    onChange={(e) => setFilterStatus(e.target.value || null)}
                    className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-2 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                  >
                    <option value="" className="text-gray-500">Todos</option>
                    {uniqueStatus.map((s) => (
                      <option key={s} value={s} className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t dark:border-neutral-800">
                  <Button size="sm" variant="ghost" className="text-xs h-8 text-gray-600 dark:text-gray-300" onClick={handleClearFilters}>
                    Limpar
                  </Button>
                  <Button size="sm" className="bg-[#014a8f] hover:bg-[#003b70] text-white h-8" onClick={() => setShowFilters(false)}>
                    Concluir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        
        {/* Chips de filtros ativos (opcional, para UX melhor) */}
        {(filterLeague || filterMarket || filterStatus) && (
            <div className="flex flex-wrap gap-2 text-xs">
                {filterLeague && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200">Liga: {filterLeague}</span>}
                {filterMarket && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">Tipo: {filterMarket}</span>}
                {filterStatus && <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full border border-gray-300">Status: {filterStatus}</span>}
            </div>
        )}

        {/* DASHBOARD SUPERIOR */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">

          {/* Cabeçalho */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#014a8f]">Apostas</h2>
              <p className="text-gray-500 text-sm">Seu desempenho</p>
            </div>

            <button
              onClick={() => setShowAllClubs(!showAllClubs)}
              className="text-[#014a8f] text-sm font-medium hover:underline"
            >
              {showAllClubs ? "Ver menos" : "Ver todos"}
            </button>
          </div>

          {/* MÉTRICAS */}
          <div className="flex items-center gap-8">

            {/* Total de apostas */}
            <div className="text-center">
              <div className="text-6xl font-extrabold text-[#014a8f] leading-none">
                {totalGames}
              </div>
              <div className="text-gray-500 text-sm mt-1">Apostas</div>
            </div>

            {/* Times */}
            <div className="flex-1">
              <p className="text-gray-600 font-semibold text-sm">
                Times ({distinctTeams})
              </p>

              {/* Top 4 clubes */}
              <div className="grid grid-cols-4 gap-3 mt-3">
                {top4.map(club => {
                  const logo = findLogo(club.name);

                  return (
                    <div
                      key={club.name}
                      className="bg-[#f3f6f9] border border-[#dce3ea] rounded-xl py-4 flex flex-col items-center"
                    >
                      <div className="w-12 h-12 mb-2 flex items-center justify-center">
                        {logo ? (
                          <img src={logo} className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-gray-400 text-xs">?</div>
                        )}
                      </div>

                      <span className="font-bold text-gray-800">{club.apostas}x</span>
                      <span className="text-xs text-gray-500">
                        {club.ganha}-{club.perdida}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* EXPANDIDO (Todos os clubes) */}
              {showAllClubs && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {sortedClubs.slice(4).map(club => {
                    const logo = findLogo(club.name);
                    return (
                      <div
                        key={club.name}
                        className="bg-[#f3f6f9] border border-[#dce3ea] rounded-xl p-4 flex flex-col items-center"
                      >
                        <div className="w-12 h-12 mb-2 flex items-center justify-center">
                          {logo ? (
                            <img src={logo} className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-gray-400">?</div>
                          )}
                        </div>

                        <p className="font-bold text-gray-800">{club.apostas}x</p>
                        <p className="text-xs text-gray-500">
                          {club.ganha}-{club.perdida}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>


        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-300 animate-pulse">
            Carregando histórico...
          </div>
        ) : erro ? (
          <div className="text-center py-12 text-red-600 bg-red-50 rounded-lg border border-red-100">{erro}</div>
        ) : filteredApostas.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700">
            <p className="text-gray-500 mb-2">Nenhuma aposta encontrada.</p>
            {(filterLeague || filterMarket || filterStatus) && (
                <Button variant="link" onClick={handleClearFilters} className="text-[#014a8f]">Limpar filtros</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApostas.map((a) => {
              // --- Lógica de Times e Logos ---
              const parseTeams = (partida: string) => {
                if (!partida) return [null, null];
                const sepRegex = /\s+vs\.?\s+|\s+x\s+|\s+X\s+|\s+-\s+|\s+vs\s+/i;
                const parts = partida.split(sepRegex).map((s) => s.trim()).filter(Boolean);
                if (parts.length >= 2) return [parts[0], parts[1]];
                const px = partida.split(' x ');
                if (px.length >= 2) return [px[0].trim(), px[1].trim()];
                return [partida, null];
              };

              const [teamA, teamB] = parseTeams(a.partida);

              const findLogo = (name?: string | null) => {
                if (!name) return null;
                if ((clubsMap as any)[name]?.logo) return getLocalLogo((clubsMap as any)[name].logo);
                const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9 ]/g, '').trim();
                const nk = normalize(name);
                for (const cname in clubsMap as any) {
                  const nn = normalize(cname);
                  if (nn === nk || nn.includes(nk) || nk.includes(nn)) return getLocalLogo((clubsMap as any)[cname].logo);
                }
                return null;
              };

              const logoA = findLogo(teamA);
              const logoB = findLogo(teamB);
              // ------------------------------------------

              return (
                <div
                  key={a.id_aposta}
                  className="border border-gray-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3 w-full overflow-hidden">
                       {/* Times e Logos */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-gray-50 dark:bg-neutral-800 p-1 border dark:border-neutral-700">
                           {logoA ? <img src={logoA} alt="Team A" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">?</div>}
                        </div>
                        <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{teamA}</span>
                        
                        <span className="text-xs text-gray-400 px-1">vs</span>
                        
                        <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{teamB}</span>
                        <div className="w-8 h-8 shrink-0 rounded-full bg-gray-50 dark:bg-neutral-800 p-1 border dark:border-neutral-700">
                           {logoB ? <img src={logoB} alt="Team B" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">?</div>}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 shrink-0 ml-2 whitespace-nowrap">
                        {new Date(a.data_registro).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Informações da Aposta */}
                  <div className="flex flex-col gap-1 mb-3">
                     <span className="text-xs text-[#014a8f] dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/20 w-fit px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{a.campeonato}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm sm:grid-cols-4 bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Mercado</span>
                      <div className="truncate font-medium text-gray-700 dark:text-gray-300" title={a.mercado}>{a.mercado}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Seleção</span>
                      <div className="font-medium truncate text-[#014a8f] dark:text-blue-400" title={a.selecao}>{a.selecao}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Odd</span>
                      <div className="font-mono text-gray-700 dark:text-gray-300">{a.odd.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Aposta</span>
                      <div className="font-medium text-gray-700 dark:text-gray-300">R$ {a.valor_apostado.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-gray-400 text-xs mr-2">Retorno:</span>
                      <span className={`font-bold ${a.status_aposta === 'ganha' ? 'text-green-600' : 'text-gray-800 dark:text-white'}`}>
                        R$ {a.possivel_retorno.toFixed(2)}
                      </span>
                    </div>

                    <div className={`text-[10px] font-bold uppercase border px-3 py-1 rounded-full ${getStatusStyle(a.status_aposta)}`}>
                      {a.status_aposta}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}