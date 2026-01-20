// src/components/app/BettingHistoryScreen.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ===== Ícones (mesmo estilo do Finance) =====
const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="text-[#014a8f]">
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </svg>
);

type Aposta = {
  id_aposta: number;
  campeonato: string;
  partida: string;
  mercado: string;
  selecao: string;
  linha?: string | null;
  odd: number;
  valor_apostado: number;
  possivel_retorno: number;
  status_aposta: "pendente" | "ganha" | "perdida" | "cancelada";
  data_registro: string;
};

export default function BettingHistoryScreen() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filtros
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterLeague, setFilterLeague] = useState<string | null>(null);
  const [filterMarket, setFilterMarket] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filtersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showFilters) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (
        filtersRef.current &&
        !filtersRef.current.contains(target) &&
        !(target.closest && target.closest("#filters-toggle"))
      ) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
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
        linha: a.linha ?? null,
        odd: Number(a.odd) || 0,
        valor_apostado: Number(a.valor_apostado) || 0,
        possivel_retorno: Number(a.possivel_retorno) || 0,
        status_aposta: a.status_aposta || "pendente",
        data_registro: a.data_registro || new Date().toISOString(),
      }));

      setApostas(mapped);
      setLastUpdated(new Date());
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

  const uniqueLeagues = useMemo(
    () => Array.from(new Set(apostas.map((a) => a.campeonato))).sort(),
    [apostas]
  );
  const uniqueMarkets = useMemo(
    () => Array.from(new Set(apostas.map((a) => a.mercado))).sort(),
    [apostas]
  );
  const uniqueStatus = useMemo(
    () => Array.from(new Set(apostas.map((a) => a.status_aposta))).sort(),
    [apostas]
  );

  const filteredApostas = apostas.filter((a) => {
    if (filterLeague && a.campeonato !== filterLeague) return false;
    if (filterMarket && a.mercado !== filterMarket) return false;
    if (filterStatus && a.status_aposta !== filterStatus) return false;
    return true;
  });

  const handleClearFilters = () => {
    setFilterLeague(null);
    setFilterMarket(null);
    setFilterStatus(null);
  };

  const getStatusStyle = (status: Aposta["status_aposta"]) => {
    switch (status) {
      case "ganha":
        return "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/40";
      case "perdida":
        return "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/40";
      case "cancelada":
        return "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-neutral-900/60 dark:border-neutral-800";
      default:
        return "text-yellow-800 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-950/20 dark:border-yellow-900/40";
    }
  };

  const capitalize = (txt: string) =>
    (txt || "").charAt(0).toUpperCase() + (txt || "").slice(1);

  const statusLabel = (s: string) => capitalize(String(s).toLowerCase());

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();

  const toTitleCase = (input: string) => {
    const s = (input || "").replace(/\s+/g, " ").trim();
    if (!s) return "—";
    return s
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(" ");
  };

  const clubDisplayByNorm = useMemo(() => {
    const map: Record<string, string> = {};
    for (const k of Object.keys(clubsMap as any)) {
      const nk = normalize(k);
      if (!map[nk]) map[nk] = k;
    }
    return map;
  }, []);

  const displayClubName = (normName: string) => {
    return clubDisplayByNorm[normName] || toTitleCase(normName);
  };

  const parseTeams = (partida: string) => {
    if (!partida) return [];
    const sep = /\s+vs\.?\s+|\s+x\s+|\s+X\s+|\s+-\s+|\s+vs\s+/i;
    const parts = partida.split(sep).map((s) => s.trim());
    return parts.length >= 2 ? parts.slice(0, 2) : [];
  };

  const base = filteredApostas;
  const totalApostas = base.length;
  const totalGanhas = base.filter((a) => a.status_aposta === "ganha").length;
  const totalPerdidas = base.filter((a) => a.status_aposta === "perdida").length;
  const totalCanceladas = base.filter((a) => a.status_aposta === "cancelada").length;
  const totalPendentes = base.filter((a) => a.status_aposta === "pendente").length;

  const decididas = totalGanhas + totalPerdidas;
  const taxaAcerto = decididas > 0 ? (totalGanhas / decididas) * 100 : 0;

  const uniqueGames = new Set(base.map((a) => normalize(a.partida)));
  const totalGames = uniqueGames.size;

  const allTeams = base.flatMap((a) => parseTeams(a.partida));
  const distinctTeams = new Set(allTeams.map((t) => normalize(t))).size;

  const clubStats: Record<string, { apostas: number; ganha: number; perdida: number }> = {};
  const clubAccStats: Record<
    string,
    { apostas: number; ganha: number; perdida: number; cancelada: number; pendente: number }
  > = {};

  base.forEach((a) => {
    const teams = parseTeams(a.partida);
    teams.forEach((team) => {
      if (!team) return;
      const key = normalize(team);

      if (!clubStats[key]) clubStats[key] = { apostas: 0, ganha: 0, perdida: 0 };
      clubStats[key].apostas++;
      if (a.status_aposta === "ganha") clubStats[key].ganha++;
      if (a.status_aposta === "perdida") clubStats[key].perdida++;

      if (!clubAccStats[key]) {
        clubAccStats[key] = { apostas: 0, ganha: 0, perdida: 0, cancelada: 0, pendente: 0 };
      }
      clubAccStats[key].apostas++;
      if (a.status_aposta === "ganha") clubAccStats[key].ganha++;
      else if (a.status_aposta === "perdida") clubAccStats[key].perdida++;
      else if (a.status_aposta === "cancelada") clubAccStats[key].cancelada++;
      else clubAccStats[key].pendente++;
    });
  });

  const sortedClubs = Object.entries(clubStats)
    .sort((a, b) => b[1].apostas - a[1].apostas)
    .map(([name, stats]) => ({ name, ...stats }));

  const top4 = sortedClubs.slice(0, 4);

  const clubAccuracyList = Object.entries(clubAccStats)
    .map(([name, st]) => {
      const decided = st.ganha + st.perdida;
      const acc = decided > 0 ? (st.ganha / decided) * 100 : 0;
      const displayName = displayClubName(name);
      return { name, displayName, ...st, decided, acc };
    })
    .filter((c) => c.decided > 0)
    .sort((a, b) => b.acc - a.acc)
    .slice(0, 5);

  const maxAcc = clubAccuracyList.length
    ? Math.max(...clubAccuracyList.map((c) => c.acc))
    : 100;

  const findLogo = (teamNameNorm: string) => {
    for (const key in clubsMap as any) {
      const normalized = normalize(key);
      if (normalized === teamNameNorm) return getLocalLogo((clubsMap as any)[key].logo);
    }
    return null;
  };

  const updatedTime =
    lastUpdated != null
      ? `${new Date(lastUpdated).toLocaleDateString("pt-BR")} - ${new Date(lastUpdated).toLocaleTimeString(
          "pt-BR",
          { hour: "2-digit", minute: "2-digit", second: "2-digit" }
        )}`
      : "—";

  const recent3 = useMemo(() => {
    const arr = [...filteredApostas];
    arr.sort((a, b) => new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime());
    return arr.slice(0, 3);
  }, [filteredApostas]);

  // Modals
  const [allClubsOpen, setAllClubsOpen] = useState(false);
  const [allHistoryOpen, setAllHistoryOpen] = useState(false);

  // ===== Helpers de mercado/linha =====
  const formatTotalGoalsPick = (mercado?: string, selecao?: string, linha?: string | null) => {
    const m = (mercado || "").toLowerCase();
    const s = (selecao || "").toLowerCase().trim();

    const isTotalsMarket = /total|gols|over|under|mais\/menos|mais menos/i.test(m);
    if (!isTotalsMarket) return null;

    let ln = (linha || "").toString().trim();
    if (!ln) {
      const match = s.match(/(\d+(?:[.,]\d+)?)/);
      if (match) ln = match[1];
    }
    if (ln) ln = ln.replace(",", ".");

    if (/under|menos/i.test(s)) return ln ? `Menos de ${ln} gols` : "Menos gols";
    if (/over|mais/i.test(s)) return ln ? `Mais de ${ln} gols` : "Mais gols";
    return null;
  };

  // ===== Card reutilizável (mantive sua lógica, só ajustei dark + espaçamentos) =====
  const BetCard = ({ a }: { a: Aposta }) => {
    const parseTeamsLocal = (partida: string) => {
      if (!partida) return [null, null] as const;
      const sepRegex = /\s+vs\.?\s+|\s+x\s+|\s+X\s+|\s+-\s+|\s+vs\s+/i;
      const parts = partida.split(sepRegex).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) return [parts[0], parts[1]] as const;
      const px = partida.split(" x ");
      if (px.length >= 2) return [px[0].trim(), px[1].trim()] as const;
      return [partida, null] as const;
    };

    const [teamA, teamB] = parseTeamsLocal(a.partida);

    const findLogoLocal = (name?: string | null) => {
      if (!name) return null;
      if ((clubsMap as any)[name]?.logo) return getLocalLogo((clubsMap as any)[name].logo);

      const norm = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[^a-z0-9 ]/g, "")
          .trim();

      const nk = norm(name);
      for (const cname in clubsMap as any) {
        const nn = norm(cname);
        if (nn === nk || nn.includes(nk) || nk.includes(nn)) {
          return getLocalLogo((clubsMap as any)[cname].logo);
        }
      }
      return null;
    };

    const logoA = findLogoLocal(teamA);
    const logoB = findLogoLocal(teamB);

    const pick = (a.selecao || "").toLowerCase();
    const teamALow = (teamA || "").toLowerCase();
    const teamBLow = (teamB || "").toLowerCase();

    const isTeamAPick =
      (teamA && pick.includes(teamALow)) ||
      (a.mercado === "1X2" && /^(1)$/.test((a.selecao || "").trim()));

    const isTeamBPick =
      (teamB && pick.includes(teamBLow)) ||
      (a.mercado === "1X2" && /^(2)$/.test((a.selecao || "").trim()));

    const totalLabel = formatTotalGoalsPick(a.mercado, a.selecao, a.linha);

    const pickLabel = totalLabel
      ? totalLabel
      : isTeamAPick
      ? `Vitória de ${teamA || a.selecao}`
      : isTeamBPick
      ? `Vitória de ${teamB || a.selecao}`
      : a.selecao || "Palpite";

    return (
      <div className="border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gray-50 dark:bg-neutral-800 p-1 border border-gray-200 dark:border-neutral-700">
                {logoA ? (
                  <img src={logoA} alt="Team A" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">?</div>
                )}
              </div>

              <span
                className={`text-sm font-semibold truncate ${
                  isTeamAPick ? "text-[#014a8f] dark:text-blue-300" : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {teamA}
              </span>

              <span className="text-xs text-gray-400 px-1">vs</span>

              <span
                className={`text-sm font-semibold truncate ${
                  isTeamBPick ? "text-[#014a8f] dark:text-blue-300" : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {teamB}
              </span>

              <div className="w-8 h-8 shrink-0 rounded-full bg-gray-50 dark:bg-neutral-800 p-1 border border-gray-200 dark:border-neutral-700">
                {logoB ? (
                  <img src={logoB} alt="Team B" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">?</div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 shrink-0 ml-2 whitespace-nowrap">
            {new Date(a.data_registro).toLocaleDateString("pt-BR")}
          </div>
        </div>

        {/* Campeonato */}
        <div className="flex flex-col gap-1 mb-3">
          <span className="text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-[#014a8f] dark:text-blue-300 w-fit px-2 py-0.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
            {a.campeonato}
          </span>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm sm:grid-cols-4 bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-gray-200/60 dark:border-neutral-800">
          <div>
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Mercado</span>
            <div className="truncate font-medium text-gray-700 dark:text-gray-300" title={a.mercado}>
              {a.mercado}
            </div>
          </div>

          <div>
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Seleção</span>
            <div className="text-[11px] text-gray-500">{pickLabel}</div>
            <div className="font-medium truncate text-[#014a8f] dark:text-blue-300" title={a.selecao}>
              {a.selecao}
            </div>
          </div>

          <div>
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Odd</span>
            <div className="font-mono text-gray-700 dark:text-gray-200">{a.odd.toFixed(2)}</div>
          </div>

          <div>
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Aposta</span>
            <div className="font-medium text-gray-700 dark:text-gray-200">
              R$ {a.valor_apostado.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-xs mr-2">Retorno:</span>
            <span className={`font-extrabold tabular-nums ${a.status_aposta === "ganha" ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
              R$ {a.possivel_retorno.toFixed(2)}
            </span>
          </div>

          <div className={`text-[10px] font-bold uppercase border px-3 py-1 rounded-full ${getStatusStyle(a.status_aposta)}`}>
            {statusLabel(a.status_aposta)}
          </div>
        </div>
      </div>
    );
  };

  // ===== Layout base do Finance =====
  const panelClass =
    "relative overflow-hidden rounded-2xl border border-[#014a8f]/15 " +
    "bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 " +
    "dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20 " +
    "p-6 shadow-xl shadow-blue-500/10";

  const Panel = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`${panelClass} ${className}`}>
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />
      <div className="relative">{children}</div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Header igual Finance */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-[#014a8f]/15 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20 p-5 shadow-xl shadow-blue-500/10">
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Histórico de Apostas
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Central de desempenho e análise
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#014a8f]/20 bg-white/70 dark:bg-neutral-900/60 px-3 py-2">
                <span className="text-[11px] font-semibold text-[#014a8f]">
                  Atualizado
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {updatedTime}
                </span>
              </div>

              <div className="flex items-center gap-2 relative">
                <Button
                  className="bg-[#014a8f] hover:bg-[#003b70] text-white"
                  onClick={async () => {
                    await api.post("/apostas/verificar");
                    fetchHistorico();
                  }}
                >
                  Atualizar resultados
                </Button>

                <Button
                  id="filters-toggle"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`text-sm flex items-center gap-2 ${
                    showFilters || filterLeague || filterMarket || filterStatus
                      ? "bg-white text-[#014a8f] hover:bg-gray-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                      : "bg-[#014a8f] text-white hover:bg-[#003b70]"
                  }`}
                >
                  <FilterIcon />
                  Filtros
                  {(filterLeague || filterMarket || filterStatus) && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </Button>

                {/* Painel de filtros */}
                {showFilters && (
                  <div
                    ref={filtersRef}
                    className="absolute right-0 top-full mt-2 w-80 p-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur rounded-2xl shadow-2xl border border-gray-200/70 dark:border-neutral-800 z-50 animate-in fade-in zoom-in-95 duration-200"
                  >
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-sm">
                      Filtrar por:
                    </h3>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">
                        Liga / Campeonato
                      </label>
                      <select
                        value={filterLeague ?? ""}
                        onChange={(e) => setFilterLeague(e.target.value || null)}
                        className="w-full border border-gray-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                      >
                        <option value="" className="text-gray-500">
                          Todas
                        </option>
                        {uniqueLeagues.map((c) => (
                          <option
                            key={c}
                            value={c}
                            className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
                          >
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">
                        Tipo de Aposta (Mercado)
                      </label>
                      <select
                        value={filterMarket ?? ""}
                        onChange={(e) => setFilterMarket(e.target.value || null)}
                        className="w-full border border-gray-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                      >
                        <option value="" className="text-gray-500">
                          Todos
                        </option>
                        {uniqueMarkets.map((m) => (
                          <option
                            key={m}
                            value={m}
                            className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
                          >
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">
                        Status
                      </label>
                      <select
                        value={filterStatus ?? ""}
                        onChange={(e) => setFilterStatus(e.target.value || null)}
                        className="w-full border border-gray-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#014a8f] outline-none"
                      >
                        <option value="" className="text-gray-500">
                          Todos
                        </option>
                        {uniqueStatus.map((s) => (
                          <option
                            key={s}
                            value={s}
                            className="text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
                          >
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t dark:border-neutral-800">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-gray-600 dark:text-gray-300"
                        onClick={handleClearFilters}
                      >
                        Limpar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#014a8f] hover:bg-[#003b70] text-white h-8"
                        onClick={() => setShowFilters(false)}
                      >
                        Concluir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="pb-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Chips */}
        {(filterLeague || filterMarket || filterStatus) && (
          <div className="flex flex-wrap gap-2 text-xs mb-4">
            {filterLeague && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                Liga: {filterLeague}
              </span>
            )}
            {filterMarket && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
                Tipo: {filterMarket}
              </span>
            )}
            {filterStatus && (
              <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full border border-gray-300">
                Status: {filterStatus}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-5 space-y-6">
            {/* Painel de desempenho (KPIs no estilo Finance) */}
            <div className={panelClass}>
              <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#014a8f]/10 border border-[#014a8f]/15">
                      <ChartIcon />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                        Desempenho
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        KPIs baseados no filtro atual
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setAllClubsOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#014a8f]/20 bg-white/70 dark:bg-neutral-900/60 px-3 py-2 text-sm font-semibold text-[#014a8f] hover:bg-white dark:hover:bg-neutral-900 transition"
                  >
                    Ver todos
                    <span className="text-gray-400">→</span>
                  </button>
                </div>

                {/* KPIs (padrão Finance) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 px-4 py-3 min-h-[110px] flex flex-col justify-between">
                    <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">Apostas</div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">
                      {totalApostas}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 px-4 py-3 min-h-[110px] flex flex-col justify-between">
                    <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">Partidas</div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">
                      {totalGames}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 px-4 py-3 min-h-[110px] flex flex-col justify-between">
                    <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">Decididas</div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">
                      {decididas}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-green-700 dark:text-green-400">{totalGanhas}G</span>{" "}
                      <span className="text-gray-400">•</span>{" "}
                      <span className="font-semibold text-red-700 dark:text-red-400">{totalPerdidas}P</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 px-4 py-3 min-h-[110px] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">Acerto</div>
                    </div>

                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">
                      {taxaAcerto.toFixed(0)}%
                    </div>

                    <div className="h-2 rounded-full bg-white/70 dark:bg-neutral-900/50 border border-gray-200/70 dark:border-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#014a8f]"
                        style={{ width: `${Math.max(0, Math.min(100, taxaAcerto))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Top times */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Times <span className="text-gray-500">({distinctTeams})</span>
                    </p>
                    <p className="text-xs text-gray-500">Clubes com mais apostas</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {top4.map((club) => {
                      const logo = findLogo(club.name);
                      return (
                        <button
                          key={club.name}
                          type="button"
                          onClick={() => setAllClubsOpen(true)}
                          className="rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition p-4 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#014a8f]/30"
                          title="Ver todos os times"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/5 shadow-sm flex items-center justify-center p-2">
                            {logo ? <img src={logo} className="w-full h-full object-contain" /> : <div className="text-gray-400 text-xs">?</div>}
                          </div>

                          <div className="mt-3 text-center">
                            <div className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">
                              {club.apostas}x
                            </div>
                            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                              <span className="font-semibold text-green-700 dark:text-green-400">{club.ganha}</span>
                              <span className="text-gray-400">-</span>
                              <span className="font-semibold text-red-700 dark:text-red-400">{club.perdida}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-gray-500 leading-snug line-clamp-2 min-h-[32px]">
                              {displayClubName(club.name)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Acerto por clube */}
            <Panel>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Acerto por clube</h3>
                  <p className="text-gray-500 text-sm">Clubes com melhor percentual</p>
                </div>
                <div className="text-xs text-gray-500">
                  Top <span className="font-semibold text-gray-700 dark:text-gray-200">{clubAccuracyList.length}</span>
                </div>
              </div>

              {clubAccuracyList.length === 0 ? (
                <div className="text-sm text-gray-500 py-6">
                  Ainda não há apostas decididas (ganha/perdida) para calcular acerto.
                </div>
              ) : (
                <div className="space-y-2">
                  {clubAccuracyList.map((c) => {
                    const logo = findLogo(c.name);
                    const width = maxAcc > 0 ? Math.max(6, (c.acc / maxAcc) * 100) : 0;

                    return (
                      <div
                        key={c.name}
                        className="group rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/5 shadow-sm flex items-center justify-center p-2">
                            {logo ? (
                              <img src={logo} className="w-full h-full object-contain" />
                            ) : (
                              <div className="text-gray-400 text-[10px]">?</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {c.displayName}
                                </div>
                                <div className="text-[11px] text-gray-500 tabular-nums">
                                  {c.ganha} ganhas • {c.perdida} perdidas
                                </div>
                              </div>

                              <div className="shrink-0 text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">
                                {c.acc.toFixed(0)}%
                              </div>
                            </div>

                            <div className="mt-2 h-2 rounded-full bg-white dark:bg-neutral-900 border border-gray-200/70 dark:border-neutral-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#014a8f]"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute z-10 mt-2 w-max max-w-[280px] rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-200">
                            <div className="font-semibold text-gray-900 dark:text-white mb-1">Detalhes</div>
                            <div>Apostas: <span className="font-bold">{c.apostas}</span></div>
                            <div>Decididas: <span className="font-bold">{c.decided}</span></div>
                            <div>Ganhas: <span className="font-bold">{c.ganha}</span></div>
                            <div>Perdidas: <span className="font-bold">{c.perdida}</span></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7 space-y-6">
            <Panel>
              <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Bilhetes mais recentes</h2>
                  <p className="text-sm text-gray-500">Últimas 3 apostas registradas</p>
                </div>

                <Button
                  className="bg-[#014a8f] hover:bg-[#003b70] text-white h-9"
                  onClick={() => setAllHistoryOpen(true)}
                >
                  Ver histórico completo
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-14 text-gray-500 animate-pulse">
                  Carregando histórico…
                </div>
              ) : erro ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-red-600 text-sm">
                  {erro}
                </div>
              ) : recent3.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-gray-500 text-sm">
                  Nenhuma aposta encontrada.
                </div>
              ) : (
                <div className="space-y-4">
                  {recent3.map((a) => (
                    <BetCard key={a.id_aposta} a={a} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </main>

      {/* Modal do Histórico Completo */}
      <Dialog open={allHistoryOpen} onOpenChange={setAllHistoryOpen}>
        <DialogContent className="max-w-5xl w-[94vw] sm:w-full p-0 overflow-hidden bg-white dark:bg-neutral-900">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-neutral-800">
            <DialogHeader>
              <DialogTitle className="text-[#014a8f] text-xl font-extrabold">
                Histórico completo
              </DialogTitle>
            </DialogHeader>

            <p className="text-xs text-gray-500 mt-1">
              Mostrando{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {filteredApostas.length}
              </span>{" "}
              apostas (respeitando os filtros atuais).
            </p>
          </div>

          {/* Body */}
          <div className="p-5 max-h-[78vh] overflow-auto bg-gray-50/60 dark:bg-neutral-950">
            {filteredApostas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-10 text-center text-gray-500 text-sm">
                Nenhuma aposta encontrada.
              </div>
            ) : (
              <div className="space-y-4">
                {[...filteredApostas]
                  .sort(
                    (a, b) =>
                      new Date(b.data_registro).getTime() -
                      new Date(a.data_registro).getTime()
                  )
                  .map((a) => (
                    <BetCard key={a.id_aposta} a={a} />
                  ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end gap-2 bg-white dark:bg-neutral-900">
            <Button
              className="bg-[#014a8f] hover:bg-[#003b70] text-white h-9"
              onClick={() => setAllHistoryOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal dos Times (Ver todos) */}
      <Dialog open={allClubsOpen} onOpenChange={setAllClubsOpen}>
        <DialogContent className="max-w-4xl w-[94vw] sm:w-full p-0 overflow-hidden bg-white dark:bg-neutral-900">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-neutral-800">
            <DialogHeader>
              <DialogTitle className="text-[#014a8f] text-xl font-extrabold">
                Times ({distinctTeams})
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-gray-500 mt-1">
              Resumo por clube com quantidade de apostas e desempenho.
            </p>
          </div>

          {/* Body */}
          <div className="p-5 max-h-[72vh] overflow-auto bg-gray-50/60 dark:bg-neutral-950">
            {sortedClubs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-10 text-center text-gray-500 text-sm">
                Nenhum clube encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sortedClubs.map((club) => {
                  const logo = findLogo(club.name);
                  return (
                    <div
                      key={club.name}
                      className="
                        group rounded-2xl bg-white dark:bg-neutral-900
                        ring-1 ring-black/5 dark:ring-white/5
                        hover:bg-gray-50 dark:hover:bg-neutral-800
                        transition p-4
                        flex flex-col items-center text-center
                      "
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-neutral-800 ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-center p-2 shadow-sm">
                        {logo ? (
                          <img src={logo} className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-gray-400 text-xs">?</div>
                        )}
                      </div>

                      <div className="mt-3 text-sm font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
                        {club.apostas}x
                      </div>

                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                        <span className="font-semibold text-green-700 dark:text-green-500">
                          {club.ganha}
                        </span>
                        <span className="text-gray-400 mx-1">–</span>
                        <span className="font-semibold text-red-700 dark:text-red-500">
                          {club.perdida}
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                        {displayClubName(club.name)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-neutral-800 flex justify-end bg-white dark:bg-neutral-900">
            <Button
              className="bg-[#014a8f] hover:bg-[#003b70] text-white h-9"
              onClick={() => setAllClubsOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
