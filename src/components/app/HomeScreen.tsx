// src/components/app/HomeScreen.tsx

"use client";

 

import React, { useEffect, useMemo, useState } from "react";

import ExpandableMatchCard from "@/components/ui/expandable-match-card";

import H2HModal from "@/components/ui/H2HModal";

import { useUpcomingData } from "@/data/matchData";

import { Button } from "@/components/ui/button";

import api from "@/services/api";

import { resolveLeagueName } from "@/utils/resolveLeagueName";

import clubsMap from "@/utils/clubs-map.json";

// UI (novo)
import { SkeletonMatchCard } from "@/components/ui/skeletons";
import { getLocalLogo } from "@/utils/getLocalLogo";
import { useNavigate } from "react-router-dom";
import { leagueCountries } from "@/utils/league-countries";
import { getFlagByCountryCode } from "@/utils/getFlagByCountryCode";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


 // ========= Helpers (copiados do MatchCard) =========

const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const extractLineFromText = (text?: string) => {
  if (!text) return undefined;
  const m = String(text).match(/(\d+(?:[.,]\d+)?)/);
  return m ? m[1].replace(",", ".") : undefined;
};

const findClubLogo = (teamName: string): string | null => {
  const target = normalize(teamName);

  for (const [key, data] of Object.entries(clubsMap)) {
    const normKey = normalize(key);
    if (target.includes(normKey) || normKey.includes(target)) {
      return data.logo ? getLocalLogo(data.logo) : null;
    }
  }
  return null;
};




// ========= KELLY 1-WAY (FRONTEND) =========
type KellyPerfil = "Agressivo" | "Normal" | "Conservador";

function calcularStakeKelly1Way(
  odd: number,
  saldo: number,
  tipoKelly: "Meio" | "Completo" | "Quarto" = "Meio",
  stakeMinPercent = 0.005, // 0,5% da banca
  stakeMinAbs = 0.5       // R$ 0,50 (mínimo absoluto)
): number {
  if (!odd || odd <= 1 || saldo <= 0) return stakeMinAbs;

  const pBase = 1 / odd;
  const b = odd - 1;

  const edges: Record<KellyPerfil, number> = {
    Agressivo: 0.04,
    Normal: 0.025,
    Conservador: 0.012,
  };

  let perfil: KellyPerfil;
  if (odd <= 1.5) perfil = "Agressivo";
  else if (odd <= 2.5) perfil = "Normal";
  else perfil = "Conservador";

  const fatorKelly =
    tipoKelly === "Completo"
      ? 1
      : tipoKelly === "Quarto"
      ? 0.25
      : 0.5; // Meio

  const pEst = Math.min(
    Math.max(pBase + edges[perfil], 1e-6),
    1 - 1e-6
  );

  const q = 1 - pEst;
  const f = ((b * pEst) - q) / b;

  const stakePerc = f <= 0 ? stakeMinPercent : f * fatorKelly;
  const stakeCalc = stakePerc * saldo;

  return Math.max(stakeCalc, stakeMinAbs);
}

function getPickLabel(s: {
  mercado?: string;
  selecao?: string;
  linha?: string;
  time_casa?: string;
  time_fora?: string;
}) {
  const market = (s.mercado || "").toLowerCase();
  const pickText = (s.selecao || "").toLowerCase().trim();
  const homeText = (s.time_casa || "").toLowerCase();
  const awayText = (s.time_fora || "").toLowerCase();

  // 1X2
  if (s.mercado === "1X2") {
    if (pickText === "1" || (homeText && pickText.includes(homeText))) return `Vitória de ${s.time_casa}`;
    if (pickText === "2" || (awayText && pickText.includes(awayText))) return `Vitória de ${s.time_fora}`;
    if (pickText === "x" || pickText === "empate") return "Empate";
  }

  // Total de gols / Over-Under
  const isTotalsMarket = /total|gols|over|under|mais\/menos|mais menos/i.test(market);
  if (isTotalsMarket) {
    let ln = (s.linha || "").trim();

    // fallback: tenta extrair linha do texto "Under 2.5"
    if (!ln) {
      const match = pickText.match(/(\d+(?:[.,]\d+)?)/);
      if (match) ln = match[1];
    }

    ln = ln ? ln.replace(",", ".") : "";

    if (/under|menos/i.test(pickText)) return ln ? `Menos de ${ln} gols` : "Menos gols";
    if (/over|mais/i.test(pickText)) return ln ? `Mais de ${ln} gols` : "Mais gols";
  }

  return s.selecao || "Palpite";
}



type UIMatch = import("@/data/matchData").UIMatch;

 

type TicketSelection = {
  // formato do backend
  mercado?: string;     
  selecao?: string;
  linha?: string;      
  partida?: string;      
  time_casa?: string;
  time_fora?: string;
  campeonato?: string;
  odd: number;
  market?: string;
  pick?: string;
  match?: string;
};


 

type Ticket = {

  id: string;

  createdAt: string;

  stake: number;

  potentialReturn: number;

  status?: string;

  selections: TicketSelection[];

};

// ===== BISS Tiers (reuso do ProfileRankingScreen) =====
type BISSTier = {
  key: string;
  name: string;
  xp: number;
  bets: number;
  wins: number;
  acc: number;
};

const BISS_TIERS: BISSTier[] = [
  { key: "INI", name: "Iniciante", xp: 0, bets: 0, wins: 0, acc: 0 },

  { key: "AM1", name: "Amador I", xp: 2500, bets: 12, wins: 4, acc: 25 },
  { key: "AM2", name: "Amador II", xp: 5000, bets: 25, wins: 10, acc: 25 },
  { key: "AM3", name: "Amador III", xp: 8000, bets: 40, wins: 18, acc: 25 },

  { key: "SP1", name: "Semi-Profissional I", xp: 12000, bets: 70, wins: 35, acc: 30 },
  { key: "SP2", name: "Semi-Profissional II", xp: 18000, bets: 110, wins: 60, acc: 35 },
  { key: "SP3", name: "Semi-Profissional III", xp: 25000, bets: 160, wins: 90, acc: 40 },

  { key: "PR1", name: "Profissional I", xp: 35000, bets: 230, wins: 130, acc: 45 },
  { key: "PR2", name: "Profissional II", xp: 50000, bets: 320, wins: 190, acc: 50 },
  { key: "PR3", name: "Profissional III", xp: 70000, bets: 450, wins: 280, acc: 55 },

  { key: "MW1", name: "Nível Mundial I", xp: 95000, bets: 650, wins: 420, acc: 60 },
  { key: "MW2", name: "Nível Mundial II", xp: 125000, bets: 900, wins: 600, acc: 65 },
  { key: "MW3", name: "Nível Mundial III", xp: 160000, bets: 1200, wins: 800, acc: 70 },

  { key: "LE1", name: "Lendário I", xp: 210000, bets: 1500, wins: 1000, acc: 75 },
  { key: "LE2", name: "Lendário II", xp: 270000, bets: 1700, wins: 1150, acc: 80 },
  { key: "LE3", name: "Lendário III", xp: 340000, bets: 1900, wins: 1300, acc: 85 },

  { key: "GM1", name: "Grão Mestre I", xp: 420000, bets: 2150, wins: 1600, acc: 90 },
  { key: "GM2", name: "Grão Mestre II", xp: 520000, bets: 2250, wins: 1750, acc: 92 },
  { key: "GM3", name: "Grão Mestre III", xp: 650000, bets: 2350, wins: 1900, acc: 95 },
];

const getXPForStreak = (streak: number) => {
  if (streak <= 1) return 260;
  if (streak === 2) return 285;
  if (streak === 3) return 310;
  if (streak === 4) return 335;
  if (streak <= 9) return 360;
  if (streak <= 14) return 410;
  if (streak <= 19) return 460;
  return 460 + Math.floor((streak - 15) / 5) * 50;
};

const XP_PER_BILHETE_CRIADO = 50;
const XP_BONUS_BILHETE_GANHO = 100;
const XP_PENALIDADE_ERRO = 100;

const getUserTier = (xp: number, bets: number, wins: number, winRatePct: number) => {
  return (
    [...BISS_TIERS]
      .reverse()
      .find(
        (t) =>
          xp >= t.xp &&
          bets >= t.bets &&
          wins >= t.wins &&
          winRatePct >= t.acc
      ) || BISS_TIERS[0]
  );
};

const getTierBadgeSrc = (tierKey?: string | null) => {
  const key = String(tierKey || "INI").toLowerCase();
  return `${import.meta.env.BASE_URL}classes/${key}.png`;
};


type BetSelection = {

  matchId: string | number;

  partida: string;

  campeonato: string;

  time_casa: string;

  time_fora: string;

  mercado: string;

  selecao: string;

  linha?: string;

  odd: number;

};

 
// ===== Tipos H2H =====
type H2HStats = {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  homeGoals: number;
  awayGoals: number;
  avgHomeGoals: number;
  avgAwayGoals: number;
};

type H2HMatch = {
  id: string | number;
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  fullTime: string;
  halfTime?: string | null;
  venueType?: "current" | "reverse";
  competitionType?: "current" | "other";
};

type H2HMeta = {
  homeTeam: string;
  awayTeam: string;
  logoHome: string | null;
  logoAway: string | null;
};

type H2HRequest = {
  homeTeam: string;
  awayTeam: string;
  competition: string;
};

const Badge = ({ children }: React.PropsWithChildren) => (
  <span className="inline-flex items-center rounded-xl border border-[#014a8f]/20 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#014a8f] dark:bg-neutral-900/60 dark:text-white">
    {children}
  </span>
);


 

export const HomeScreen: React.FC = () => {
  
  const navigate = useNavigate();
  const [tab, setTab] = useState<"favoritos" | "em-alta" | "bilhetes">("em-alta");
  const [tierKey, setTierKey] = useState<string>("INI");
  const [tierName, setTierName] = useState<string>("Iniciante");

  // Quick-Action Chips (novo)
  const [quickFilter, setQuickFilter] = useState<"today" | "live" | "top" | null>(null);

  const [query, setQuery] = useState("");

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const { matches: upcoming, lastUpdated, loading, error } = useUpcomingData();

  const [logos] = useState<Record<string, string>>({});

  const [selections, setSelections] = useState<BetSelection[]>([]);

  const [isSlipOpen, setIsSlipOpen] = useState(false);

  const [stake, setStake] = useState<number>(0);

  const [saldo, setSaldo] = useState<number>(0);

  const [placingBet, setPlacingBet] = useState(false);

  // selecionada via autocomplete (filtra por id quando setada)
  const [selectedMatchId, setSelectedMatchId] = useState<string | number | null>(null);

  // Autocomplete suggestions com base nas partidas carregadas
  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const nq = normalize(q);
    return (upcoming || [])
      .filter((m) => {
        return (
          normalize(m.homeTeam).includes(nq) ||
          normalize(m.awayTeam).includes(nq) ||
          (m.competition && normalize(m.competition).includes(nq))
        );
      })
      .slice(0, 8);
  }, [query, upcoming]);

  const [feedback, setFeedback] = useState<string | null>(null);

  const [userLeagues, setUserLeagues] = useState<string[]>([]);

  const [ticketFilter, setTicketFilter] = useState<"todos" | "pendentes" | "liquidados">("todos");

  // ===== Estado H2H =====
  const [h2hOpen, setH2hOpen] = useState(false);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [h2hError, setH2hError] = useState<string | null>(null);
  const [h2hStats, setH2hStats] = useState<H2HStats | null>(null);
  const [h2hMatches, setH2hMatches] = useState<H2HMatch[]>([]);
  const [h2hMeta, setH2hMeta] = useState<H2HMeta | null>(null);

  
  // Scroll para o topo quando a aba mudar
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  // ========= Helpers =========
    // ===== Scroll-to-match (para botão "Ver odds" do Featured) =====
  const [scrollToMatchId, setScrollToMatchId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!scrollToMatchId) return;
    if (tab !== "em-alta") return;

    // tenta algumas vezes (caso o card ainda não tenha sido montado)
    let tries = 0;
    const maxTries = 12;

    const tick = () => {
      tries += 1;

      const el =
        document.getElementById(`match-${scrollToMatchId}`) ||
        document.querySelector(`[data-match-id="${scrollToMatchId}"]`) as HTMLElement | null;

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setScrollToMatchId(null);
        return;
      }

      if (tries < maxTries) {
        window.setTimeout(tick, 120);
      } else {
        setScrollToMatchId(null);
      }
    };

    window.setTimeout(tick, 80);
  }, [scrollToMatchId, tab]);

 

  const fetchSaldo = async () => {

  try {

    const res = await api.get("/financeiro/saldo", {

      headers: { "Cache-Control": "no-cache" }

    });

    const s = Number(res.data?.saldo || 0);

    setSaldo(s);

  } catch {}

};

 

  const fetchTickets = async () => {

    try {

      const res = await api.get("/apostas/bilhetes");

      const data = Array.isArray(res.data) ? res.data : [];

 

      const mapped: Ticket[] = data.map((raw: any, idx: number) => {

        const id =

          String(raw.id_bilhete ??

          raw.id ??

          raw.bilheteId ??

          `B${idx + 1}`);

 

        const createdAt =

          raw.data_criacao ??

          raw.createdAt ??

          raw.data_registro ??

          new Date().toISOString();

 

        const stake =

          Number(

            raw.stake_total ??

            raw.stake ??

            raw.valor_apostado ??

            0

          ) || 0;

 

        const potentialReturn =

          Number(

            raw.possivel_retorno ??

            raw.potentialReturn ??

            0

          ) || 0;

 

        const status =

          raw.status ??

          raw.status_bilhete ??

          undefined;

 

        const selecoesRaw: any[] =

          Array.isArray(raw.selecoes) ? raw.selecoes : [];

 

        const selections: TicketSelection[] = selecoesRaw.map((s) => ({
          partida: s.partida,
          time_casa: s.time_casa,
          time_fora: s.time_fora,
          campeonato: s.campeonato,

          mercado: s.mercado,
          selecao: s.selecao,
          linha: s.linha,

          match: s.partida,
          market: s.mercado,
          pick: s.selecao,

          odd: Number(s.odd) || 0,
        }));


 

        return {

          id,

          createdAt,

          stake,

          potentialReturn,

          status,

          selections,

        };

      });

 

      setTickets(mapped);

    } catch {

      // se der erro, mantemos lista vazia silenciosamente

    }

  };

 

  const fetchUserLeagues = async () => {

    try {

      const res = await api.get("/user/preferences");

      if (Array.isArray(res.data?.ligasFavoritas)) {

        setUserLeagues(res.data.ligasFavoritas);

      }

    } catch (err) {

      console.log("Erro ao carregar ligas favoritas:", err);

    }

  };

 


  // ========= H2H: abrir modal com dados do backend =========
  const handleOpenH2H = async (params: H2HRequest) => {
    setH2hError(null);
    setH2hLoading(true);

    try {
      setH2hMeta({
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        logoHome: findClubLogo(params.homeTeam),
        logoAway: findClubLogo(params.awayTeam),
      });

      const res = await api.get("/matches/h2h", {
        params: {
          homeTeam: params.homeTeam,
          awayTeam: params.awayTeam,
          competition: params.competition,
        },
      });

      const data = res.data || {};

      if (!data.hasHistory) {
        setH2hStats(null);
        setH2hMatches([]);
        setH2hError(
          "Esses clubes ainda não se enfrentaram nos dados disponíveis."
        );
        setH2hOpen(true);
        return;
      }

      setH2hStats(data.stats || null);
      setH2hMatches(data.matches || data.lastMatches || []);
      setH2hOpen(true);
    } catch (err) {
      setH2hError("Não foi possível carregar o histórico deste confronto.");
      setH2hStats(null);
      setH2hMatches([]);
      setH2hOpen(true);
    } finally {
      setH2hLoading(false);
    }
  };


  useEffect(() => {

  fetchTickets();

  fetchSaldo();

  fetchUserLeagues();

  fetchTierHome();

const interval = setInterval(() => {
  fetchSaldo();
  fetchTierHome(); // opcional: se quiser atualizar junto do saldo
}, 5000);


 

  return () => clearInterval(interval);

}, []);

 const fetchTierHome = async () => {
  try {
    const [histRes, bilhetesRes] = await Promise.allSettled([
      api.get("/apostas/historico"),
      api.get("/apostas/bilhetes"),
    ]);

    const apostas: any[] =
      histRes.status === "fulfilled" && Array.isArray(histRes.value.data)
        ? histRes.value.data
        : [];

    const bilhetes: any[] =
      bilhetesRes.status === "fulfilled" && Array.isArray(bilhetesRes.value.data)
        ? bilhetesRes.value.data
        : [];

    // map mínimo (igual seu Profile)
    const mappedApostas = apostas.map((a: any) => ({
      status_aposta: a.status_aposta || a.status || "pendente",
      data_registro: a.data_registro || a.createdAt || new Date().toISOString(),
    }));

    const totalBets = mappedApostas.length;
    const settled = mappedApostas.filter((x: any) => x.status_aposta !== "pendente");
    const wins = settled.filter((x: any) => x.status_aposta === "ganha").length;
    const winRate = settled.length > 0 ? (wins / settled.length) * 100 : 0;

    // XP por streak (cronológico)
    const settledChrono = [...mappedApostas]
      .filter((a: any) => a.status_aposta !== "pendente")
      .sort((a, b) => new Date(a.data_registro).getTime() - new Date(b.data_registro).getTime());

    let bissXP = 0;
    let streak = 0;

    for (const a of settledChrono) {
      if (a.status_aposta === "ganha") {
        streak += 1;
        bissXP += getXPForStreak(streak);
      } else if (a.status_aposta === "perdida") {
        streak = 0;
        bissXP -= XP_PENALIDADE_ERRO;
      }
      bissXP = Math.max(0, bissXP);
    }

    // XP por bilhetes
    const bilhetesXP = bilhetes.reduce((acc: number, b: any) => {
      acc += XP_PER_BILHETE_CRIADO;
      const st = (b.status || "").toString().toLowerCase();
      if (st === "ganho" || st === "ganha") acc += XP_BONUS_BILHETE_GANHO;
      return acc;
    }, 0);

    bissXP = Math.max(0, bissXP + bilhetesXP);

    const tier = getUserTier(bissXP, totalBets, wins, Math.round(winRate * 10) / 10);

    setTierKey(tier.key);
    setTierName(tier.name);
  } catch {
    // silencioso
  }
};


  // ========= Filtro de Partidas =========

  

  const filtered = useMemo(() => {
    let list = (upcoming ?? []).slice();

    // (1) Autocomplete selecionado: filtra por id
    if (selectedMatchId != null) {
      list = list.filter((m: any) => String(m.id) === String(selectedMatchId));
    }

    // (2) Quick chips
    if (quickFilter === "live") {
      list = list.filter((m: any) => {
        const flag = (m?.isLive ?? m?.live ?? false) as boolean;
        const status = String(m?.status ?? "").toLowerCase();
        const time = String(m?.time ?? "").toLowerCase();
        return flag || status.includes("live") || status.includes("ao vivo") || time.includes("ao vivo") || time.includes("live");
      });
    }
    if (quickFilter === "top") {
      const isTopLeague = (comp?: string) =>
        /brasileir|premier|la liga|bundesliga|serie a\b|ligue 1|champions|libertadores|copa do mundo|euro/i.test(comp || "");
      list = list.filter((m) => isTopLeague((m as any).competition));
    }

    // (3) Busca por texto/clube
    const q = query.trim().toLowerCase();
    if (!q || selectedMatchId != null) return list;


    // detecta se o texto digitado é um clube do clubs-map.json
    const matchedClub = Object.keys(clubsMap).find((club) => club.toLowerCase().includes(q));
    if (matchedClub) {
      return list.filter(
        (m) =>
          m.homeTeam?.toLowerCase().includes(matchedClub.toLowerCase()) ||
          m.awayTeam?.toLowerCase().includes(matchedClub.toLowerCase())
      );
    }

    // fallback: time/competição
    return list.filter((m) =>
      [m.homeTeam, m.awayTeam, m.competition].some((t) => t?.toLowerCase().includes(q))
    );
  }, [query, upcoming, selectedMatchId, quickFilter]);

 

 const updatedTime =
  lastUpdated != null
    ? `${new Date(lastUpdated).toLocaleDateString("pt-BR")} - ${new Date(lastUpdated).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}`
    : "—";

  // ========= Featured Match (Hero) =========
  const parseMatchDate = (raw?: string): { y: number; m: number; d: number } | null => {
    if (!raw) return null;
    const s = String(raw).trim();

    // ISO: 2026-01-18 ou 2026/01/18
    let m1 = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (m1) return { y: Number(m1[1]), m: Number(m1[2]), d: Number(m1[3]) };

    // BR: 18/01/2026 ou 18-01-2026
    let m2 = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (m2) return { y: Number(m2[3]), m: Number(m2[2]), d: Number(m2[1]) };

    // fallback Date nativo
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
    }

    return null;
  };

  const getKickoffDate = (m: any): Date | null => {
    // 1) tenta campos comuns (datetime completo)
    const raw =
      m?.kickoff || m?.dateTime || m?.datetime || m?.startTime || m?.start_time || m?.start;

    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }

    // precisa de HH:mm
    const t = String(m?.time ?? "").match(/(\d{1,2}):(\d{2})/);
    if (!t) return null;

    const hh = Number(t[1]);
    const mm = Number(t[2]);

    // 2) se vier m.date, combina date + time (corrige "dia seguinte")
    const parts = parseMatchDate(m?.date);
    if (parts) {
      const d = new Date(parts.y, parts.m - 1, parts.d, hh, mm, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // 3) fallback inteligente: hoje às HH:mm; se já passou, assume amanhã
    const now = new Date();
    let d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

    if (d.getTime() < now.getTime() - 30_000) {
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    }

    return d;
  };


  const featuredMatch = useMemo(() => {
    const list = (filtered ?? []).slice();
    // prioriza o jogo mais próximo no tempo
    list.sort((a: any, b: any) => {
      const da = getKickoffDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
      const db = getKickoffDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return list[0] ?? null;
  }, [filtered]);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const featuredCountdown = useMemo(() => {
    if (!featuredMatch) return null;
    const kickoff = getKickoffDate(featuredMatch);
    if (!kickoff) return null;
    const diff = kickoff.getTime() - nowTick;
    if (diff <= 0) return "Ao vivo / Em breve";
    const total = Math.floor(diff / 1000);
    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [featuredMatch, nowTick]);

 

  // ========= Lógica do Bilhete =========

 const canAddSelection = (_current: BetSelection[], _candidate: BetSelection): string | null => {
    // por enquanto, sem bloqueios (vamos fazer troca automática)
    return null;
  };

const isTotalsMarket = (market?: string) =>
    /total|gols|over|under|mais\/menos|mais menos/i.test(market || "");

  const sameMatchFn = (a: BetSelection, b: BetSelection) =>
    String(a.matchId) === String(b.matchId) || a.partida === b.partida;

  const handleAddSelection = (sel: BetSelection) => {
    setFeedback(null);

    setSelections((prev) => {
      const err = canAddSelection(prev, sel);
      if (err) {
        setFeedback(err);
        return prev;
      }

      // 1) Se clicou exatamente a MESMA seleção (mesmo mercado/linha/selecao/odd), não faz nada
      const existsExact = prev.some((p) => {
        const lnP = (p.linha || "").trim();
        const lnS = (sel.linha || "").trim();
        return (
          sameMatchFn(p, sel) &&
          p.mercado === sel.mercado &&
          p.selecao === sel.selecao &&
          Number(p.odd) === Number(sel.odd) &&
          lnP === lnS
        );
      });

      if (existsExact) {
        setFeedback("Essa seleção já está no seu bilhete.");
        return prev;
      }

      // 2) ✅ 1X2: se já existe 1X2 no mesmo jogo, TROCA
      if (sel.mercado === "1X2") {
        const idx = prev.findIndex(
          (p) => sameMatchFn(p, sel) && p.mercado === "1X2"
        );
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = sel;
          return next;
        }
        return [...prev, sel];
      }

      // 3) ✅ Totals (Over/Under): se já existe totals no jogo, TROCA
      if (isTotalsMarket(sel.mercado)) {
        const idx = prev.findIndex(
          (p) => sameMatchFn(p, sel) && isTotalsMarket(p.mercado)
        );
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = sel;
          return next;
        }
        return [...prev, sel];
      }

      // 4) ✅ Outros mercados: se já existe o MESMO mercado + MESMA linha no jogo, TROCA
      const idxSameMarketLine = prev.findIndex((p) => {
        if (!sameMatchFn(p, sel)) return false;
        if (p.mercado !== sel.mercado) return false;
        const lnP = (p.linha || "").trim();
        const lnS = (sel.linha || "").trim();
        return lnP === lnS;
      });

      if (idxSameMarketLine >= 0) {
        const next = prev.slice();
        next[idxSameMarketLine] = sel;
        return next;
      }

      // 5) Caso contrário: adiciona normalmente
      return [...prev, sel];
    });
  };



 

  

 

  const handleRemoveSelection = (index: number) => {

    setSelections((prev) => prev.filter((_, i) => i !== index));

    setFeedback(null);

  };

 

  const oddTotal =

    selections.length > 0

      ? selections.reduce((acc, s) => acc * (s.odd || 1), 1)

      : 0;

  const recommendedStake = useMemo(() => {
    if (oddTotal <= 1 || saldo <= 0) return 0;

    return Number(
      calcularStakeKelly1Way(oddTotal, saldo, "Meio").toFixed(2)
    );
  }, [oddTotal, saldo]);


  const possibleReturn =

    selections.length > 0 && stake > 0

      ? Number((oddTotal * stake).toFixed(2))

      : 0;

 

  const resetSlip = () => {

    setSelections([]);

    setStake(0);

    setFeedback(null);

    setIsSlipOpen(false);

  };

 

  const handleConfirmBet = async () => {

    setFeedback(null);

 

    if (selections.length === 0) {

      setFeedback("Adicione pelo menos uma seleção ao bilhete.");

      return;

    }

 

    if (!stake || stake <= 0.49) {

      setFeedback("Informe um valor de aposta maior que R$ 0,50.");

      return;

    }

 

    if (saldo < stake) {

      setFeedback(

        `Saldo insuficiente. Seu saldo é de R$ ${saldo.toFixed(

          2

        )}. Ajuste o valor da aposta.`

      );

      return;

    }

    // ✅ NOVO — Controle de limite diário (3 apostas)
    try {
      const controlRes = await api.get("/user/betting-control-status");
      const { canPlaceBet, message } = controlRes.data || {};

      if (canPlaceBet === false) {
        setFeedback(message || "Você atingiu o limite de apostas para hoje.");
        return;
      }
    } catch (err) {
      console.warn(
        "Controle de apostas indisponível — seguindo sem bloqueio."
      );
      // compatibilidade com versões antigas
    }

    setPlacingBet(true);

    try {

      const payload = {

        stake,

        apostas: selections.map((s) => ({

          campeonato: s.campeonato,

          partida: s.partida,

          time_casa: s.time_casa,

          time_fora: s.time_fora,

          data_hora_partida: new Date().toISOString(), // ajuste se tiver o horário real no UIMatch

          mercado: s.mercado,

          selecao: s.selecao,

          linha: s.linha ?? null,

          odd: s.odd,

        })),

      };

 

      const res = await api.post("/apostas/bilhetes", payload);

 

      if (res.data?.error) {

        setFeedback(res.data.error);

      } else {

        setFeedback("Bilhete registrado com sucesso! ✅");

        await fetchTickets();

        await fetchSaldo();

        resetSlip();

      }

    } catch (err: any) {

      const msg =

        err?.response?.data?.error ||

        "Erro ao registrar o bilhete. Tente novamente.";

      setFeedback(msg);

    } finally {

      setPlacingBet(false);

    }

  };

 
  const filteredTickets = useMemo(() => {
    const normalize = (s?: string) =>
      (s || "").toUpperCase().trim();

    if (ticketFilter === "pendentes") {
      return tickets.filter((t) => {
        const st = normalize(t.status);
        return st === "" || st === "PENDENTE" || st === "EM ABERTO" || st === null;
      });
    }

    if (ticketFilter === "liquidados") {
      return tickets.filter((t) => {
        const st = normalize(t.status);
        return st !== "" && st !== "PENDENTE" && st !== "EM ABERTO";
      });
    }

    return tickets;
  }, [tickets, ticketFilter]);

  const LoadingSkeletonList = () => (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonMatchCard key={i} />
      ))}
    </div>
  );

  const pendingTickets = useMemo(() => {
        const norm = (s?: string) => (s || "").toUpperCase().trim();
        return tickets.filter((t) => {
          const st = norm(t.status);
          return st === "" || st === "PENDENTE" || st === "EM ABERTO" || t.status == null;
        });
      }, [tickets]);

      const resolvedTickets = useMemo(() => {
        const norm = (s?: string) => (s || "").toUpperCase().trim();
        return tickets
          .filter((t) => {
            const st = norm(t.status);
            return st !== "" && st !== "PENDENTE" && st !== "EM ABERTO";
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }, [tickets]);

      const last5Resolved = useMemo(() => resolvedTickets.slice(0, 5), [resolvedTickets]);


  // ========= View das Abas =========
  const normalizeStatus = (s?: string) => (s || "").toUpperCase().trim();
  const isWonTicket = (t: Ticket) => ["GANHO", "GANHA", "WIN"].includes(normalizeStatus(t.status));
  const isLostTicket = (t: Ticket) => ["PERDIDO", "PERDIDA", "LOSS"].includes(normalizeStatus(t.status));

  const last5Stats = useMemo(() => {
    const slice = resolvedTickets.slice(0, 5);
    const wins = slice.filter(isWonTicket).length;
    const losses = slice.filter(isLostTicket).length;

    let msg = " Sem dados suficientes ainda.";
    if (slice.length > 0) {
      if (wins === 0) msg = " Reveja suas apostas e reduza odds altas.";
      else if (wins === 1) msg = " Que azar! Ajuste stake e foque em ligas que você domina.";
      else if (wins === 2) msg = " Não desanime — você está pegando o ritmo.";
      else if (wins === 3) msg = " Indo bem, mas dá para melhorar na consistência.";
      else if (wins === 4) msg = " Excelente! Mantenha a disciplina e não aumente o risco demais.";
      else if (wins === 5) msg = " Rei das apostas! Só cuidado com excesso de confiança.";
    }

    return { total: slice.length, wins, losses, msg };
  }, [resolvedTickets]);

 
  const getSelectionsPreview = (t: Ticket, limit = 2) => {
  const sels = t.selections || [];
  const shown = sels.slice(0, limit);
  const rest = Math.max(0, sels.length - shown.length);
  return { shown, rest, total: sels.length };
};

const calcOddTotal = (t: Ticket) =>
  (t.selections?.length ? t.selections.reduce((acc, s) => acc * (Number(s.odd) || 1), 1) : 0);

  const viewMatches = useMemo(() => {

    switch (tab) {

      case "favoritos": {

      // Exibe apenas jogos das ligas favoritas do usuário

      // Converter ligas favoritas em nomes oficiais da Betano

      const mappedLeagues = userLeagues

        .map(resolveLeagueName)

        .filter(Boolean) as string[];

 

      // Mostrar apenas partidas da liga oficial mapeada

      const favMatches = filtered.filter(m =>

        mappedLeagues.includes(m.competition)

      );

 

      return (

        <Section

          title="Ligas Favoritas"

          subtitle="Partidas das suas ligas escolhidas"

        >

          {loading ? (

            <LoadingSkeletonList />

          ) : error ? (

            <EmptyState text={`Erro: ${error}`} />

          ) : favMatches.length > 0 ? (

            <ExpandableMatchCard

              matches={favMatches}
              selections={selections}
              onSelectOdd={(params) => {

                const anyParams: any = params;
                
                const matchIdSafe =
                  anyParams.matchId ?? anyParams.id ?? anyParams.match?.id ?? "unknown";

                const oddNum = Number(anyParams.odd);
                if (!oddNum || Number.isNaN(oddNum)) {
                  setFeedback("Odd indisponível para este mercado.");
                  return;
                }
                const linha =
                  anyParams.linha ??
                  anyParams.line ??
                  anyParams.total ??
                  anyParams.threshold ??
                  extractLineFromText(anyParams.selection) ??
                  extractLineFromText(anyParams.marketLabel) ??
                  extractLineFromText(anyParams.market);

                const sel: BetSelection = {
                  matchId: params.matchId,
                  partida: `${params.homeTeam} x ${params.awayTeam}`,
                  campeonato: params.competition,
                  time_casa: params.homeTeam,
                  time_fora: params.awayTeam,
                  mercado: params.market,
                  selecao: params.selection,
                  linha, // ✅ NOVO
                  odd: params.odd,
                };

                handleAddSelection(sel);
                setIsSlipOpen(true);
              }}


              onSelectHistory={(params) => handleOpenH2H(params)}
            />

          ) : (

            <EmptyState text="Nenhuma partida das suas ligas favoritas no momento." />

          )}

        </Section>

      );

    }

      case "em-alta": {

        const trending = filtered.slice(0, 30); 

        return (

          <Section title="Em Alta" subtitle="Partidas com maior interesse">
            <div className="-mt-2" />


            {loading ? (

              <LoadingSkeletonList />

            ) : error ? (

              <EmptyState text={`Erro: ${error}`} />

            ) : trending.length > 0 ? (

              <ExpandableMatchCard
                matches={trending}
                selections={selections}
                onSelectOdd={(params) => {
                  const anyParams: any = params;

                  const linha =
                    anyParams.linha ??
                    anyParams.line ??
                    anyParams.total ??
                    anyParams.threshold ??
                    extractLineFromText(anyParams.selection) ??
                    extractLineFromText(anyParams.marketLabel) ??
                    extractLineFromText(anyParams.market);

                  const sel: BetSelection = {
                    matchId: params.matchId,
                    partida: `${params.homeTeam} x ${params.awayTeam}`,
                    campeonato: params.competition,
                    time_casa: params.homeTeam,
                    time_fora: params.awayTeam,
                    mercado: params.market,
                    selecao: params.selection,
                    linha, // ✅ AQUI
                    odd: params.odd,
                  };

                  handleAddSelection(sel);
                }}


                onSelectHistory={(params) => handleOpenH2H(params)}   // <-- ADICIONAR ISSO
              />


 

            ) : (

              <EmptyState text="Sem partidas em alta no momento." />

            )}

          </Section>

        );

      }

 

     case "bilhetes":
      default: {
        const openCount = pendingTickets.length;

        const openLabel =
          openCount === 0
            ? "Nenhum bilhete em aberto no momento."
            : openCount === 1
            ? "Você tem 1 bilhete em aberto."
            : `Você tem ${openCount} bilhetes em aberto.`;

        return (
          <Section title="Bilhetes" subtitle="Central de apostas ativas">
            {/* Header/Resumo + Ações */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">{openLabel}</p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-gray-200 dark:border-neutral-700"
                  onClick={() => {
                    navigate("/", { state: { screen: "history" } });
                  }}
                >
                  Ver histórico
                </Button>
              </div>
            </div>

            {/* ====== EM ABERTO ====== */}
            <div className="mt-4 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Em aberto
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Bilhetes aguardando resultado
                  </p>
                </div>

                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-[#014a8f]/20 bg-[#014a8f]/10 text-[#014a8f]">
                  {openCount}
                </span>
              </div>

              {openCount === 0 ? (
                <EmptyState text="Nada pendente por aqui. Que tal montar um novo bilhete?" />
              ) : (
                <ul className="space-y-3">
                  {pendingTickets.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40 p-3 sm:p-4"
                    >
                      {/* topo */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-xs text-gray-500">
                          {new Date(t.createdAt).toLocaleString("pt-BR")}
                        </div>

                        <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                          PENDENTE
                        </span>
                      </div>

                      {/* valores */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Aposta</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            R$ {t.stake.toFixed(2)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-gray-500">Retorno potencial</div>
                          <div className="text-sm font-semibold text-[#014a8f] dark:text-white tabular-nums">
                            R$ {t.potentialReturn.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* preview das seleções + odd total */}
                      {t.selections?.length ? (
                        <div className="mt-2 border-t border-gray-200 dark:border-neutral-700 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">Seleções</div>
                            <div className="text-xs text-gray-500">
                              Odd total{" "}
                              <span className="font-semibold tabular-nums">
                                {calcOddTotal(t).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-1 space-y-1.5">
                            {getSelectionsPreview(t, 2).shown.map((s, idx) => {
                              const logoHome = findClubLogo(s.time_casa || "");
                              const logoAway = findClubLogo(s.time_fora || "");

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    {/* Linha principal: logos + times (compacto) */}
                                    <div className="flex items-center gap-2 min-w-0">
                                      {logoHome && (
                                        <img
                                          src={logoHome}
                                          alt={s.time_casa}
                                          className="w-4 h-4 object-contain shrink-0"
                                          loading="lazy"
                                        />
                                      )}

                                      <div className="min-w-0 truncate font-semibold text-sm text-gray-900 dark:text-white">
                                        {s.time_casa}{" "}
                                        <span className="mx-1 text-gray-400">x</span>{" "}
                                        {s.time_fora}
                                      </div>

                                      {logoAway && (
                                        <img
                                          src={logoAway}
                                          alt={s.time_fora}
                                          className="w-4 h-4 object-contain shrink-0"
                                          loading="lazy"
                                        />
                                      )}
                                    </div>

                                    <div className="text-xs text-gray-500 truncate">
                                      {s.campeonato} • {s.mercado} • {getPickLabel(s)}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="text-[11px] text-gray-500">Odd</div>
                                    <div className="text-sm font-extrabold text-[#0a2a5e] dark:text-white tabular-nums">
                                      {(Number(s.odd) || 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {getSelectionsPreview(t, 2).rest > 0 && (
                              <div className="text-xs text-gray-500">
                                +{getSelectionsPreview(t, 2).rest} seleção(ões)…
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ====== ÚLTIMOS RESULTADOS ====== */}
            <div className="mt-6 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Últimos resultados
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Últimos 5 bilhetes liquidados
                  </p>
                </div>
              </div>

              {last5Stats.total > 0 && (
                <div className="mb-4 rounded-xl border border-[#014a8f]/15 bg-[#014a8f]/5 px-4 py-3">
                  <div className="text-xs text-gray-700 dark:text-gray-200">
                    <span className="font-semibold">
                      Resumo:
                    </span>{" "}
                    {last5Stats.wins} vitórias
                    <span className="font-semibold">{last5Stats.msg}</span>
                  </div>
                </div>
              )}

              {last5Resolved.length === 0 ? (
                <EmptyState text="Ainda não há bilhetes liquidados." />
              ) : (
                <ul className="space-y-3">
                  {last5Resolved.map((t) => {
                    const st = (t.status || "").toUpperCase().trim();
                    const isLost = st === "PERDIDO" || st === "PERDIDA";
                    const isWon = st === "GANHO" || st === "GANHA";

                    return (
                      <li
                        key={t.id}
                        className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40 p-3 sm:p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-xs text-gray-500">
                            {new Date(t.createdAt).toLocaleString("pt-BR")}
                          </div>

                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${
                              isWon
                                ? "bg-green-100 text-green-700"
                                : isLost
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {st || "LIQUIDADO"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500">Aposta</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                              R$ {t.stake.toFixed(2)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-gray-500">Retorno</div>
                            <div
                              className={`text-sm font-semibold tabular-nums ${
                                isLost ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              R$ {t.potentialReturn.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* preview das seleções + odd total */}
                        {t.selections?.length ? (
                          <div className="mt-2 border-t border-gray-200 dark:border-neutral-700 pt-2">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500">Seleções</div>
                              <div className="text-xs text-gray-500">
                                Odd total{" "}
                                <span className="font-semibold tabular-nums">
                                  {calcOddTotal(t).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-1 space-y-1.5">
                              {getSelectionsPreview(t, 2).shown.map((s, idx) => {
                                const logoHome = findClubLogo(s.time_casa || "");
                                const logoAway = findClubLogo(s.time_fora || "");

                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {logoHome && (
                                          <img
                                            src={logoHome}
                                            alt={s.time_casa}
                                            className="w-4 h-4 object-contain shrink-0"
                                            loading="lazy"
                                          />
                                        )}

                                        <div className="min-w-0 truncate font-semibold text-sm text-gray-900 dark:text-white">
                                          {s.time_casa}{" "}
                                          <span className="mx-1 text-gray-400">x</span>{" "}
                                          {s.time_fora}
                                        </div>

                                        {logoAway && (
                                          <img
                                            src={logoAway}
                                            alt={s.time_fora}
                                            className="w-4 h-4 object-contain shrink-0"
                                            loading="lazy"
                                          />
                                        )}
                                      </div>

                                      <div className="text-xs text-gray-500 truncate">
                                        {s.campeonato} • {s.mercado} • {getPickLabel(s)}
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="text-[11px] text-gray-500">Odd</div>
                                      <div className="text-sm font-extrabold text-[#0a2a5e] dark:text-white tabular-nums">
                                        {(Number(s.odd) || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {getSelectionsPreview(t, 2).rest > 0 && (
                                <div className="text-xs text-gray-500">
                                  +{getSelectionsPreview(t, 2).rest} seleção(ões)…
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Section>
        );
      }

    }

  }, [tab, filtered, loading, error, tickets, userLeagues, selections, saldo, stake, last5Resolved, pendingTickets]);


 

  // ========= Render =========

 

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">

      {/* Conteúdo */}

      <div className="p-4 space-y-6">

        <div className="relative overflow-hidden rounded-2xl border border-[#014a8f]/15 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20 p-5 shadow-xl shadow-blue-500/10">

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Partidas do Dia
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Acompanhe aqui os melhores jogos
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-[#014a8f]/20 bg-white/70 dark:bg-neutral-900/60 px-3 py-2">
            <span className="text-[11px] font-semibold text-[#014a8f]">Atualizado</span>
            <span className="text-xs text-gray-600 dark:text-gray-300">{updatedTime}</span>
          </div>
        </div>
      </div>


      {/* Top bar */}

      <div className="relative flex flex-wrap items-center justify-between px-5 py-3 rounded-2xl border border-[#014a8f]/15 bg-gradient-to-r from-[#014a8f] via-[#014a8f]/95 to-[#003b70] text-white shadow-xl shadow-blue-500/15 overflow-visible">


        <div className="flex flex-wrap gap-2">

          <TopTab

            label="Em Alta"

            active={tab === "em-alta"}

            onClick={() => setTab("em-alta")}

          />

          <TopTab

            label="Bilhetes"

            active={tab === "bilhetes"}

            onClick={() => setTab("bilhetes")}

          />

          <TopTab

            label="Jogos Favoritos"

            active={tab === "favoritos"}

            onClick={() => setTab("favoritos")}

          />

        </div>

        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          {/* Badge de classe (discreto, premium) */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5">
            <img
              src={getTierBadgeSrc(tierKey)}
              alt={tierName}
              className="w-6 h-6 object-contain"
              loading="lazy"
            />
            <span className="text-xs font-semibold whitespace-nowrap">{tierName}</span>
          </div>

          <span className="text-xs font-medium whitespace-nowrap">
            Saldo: <b>R$ {saldo.toFixed(2)}</b>
          </span>

          <div className="hidden sm:block h-6 w-px bg-white/20" />

          <div className="relative">

            <input

              type="text"

              value={query}

              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setSelectedMatchId(null);
              }}

              placeholder="Encontre aqui seu jogo"

              className="
                w-52 sm:w-60 h-9
                px-3
                text-xs sm:text-sm font-medium
                text-white placeholder-white/70
                bg-white/15 backdrop-blur
                border border-white/30
                rounded-xl
                shadow-sm
                focus:outline-none
                focus:ring-2 focus:ring-white/60
              "
            />

            {suggestions.length > 0 && (

              <div className="absolute left-0 mt-1 w-52 sm:w-64 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-md shadow-lg z-50 overflow-hidden">

                <ul className="max-h-56 overflow-auto">

                  {suggestions.map((m) => {
                    const logoHome = findClubLogo(m.homeTeam);
                    const logoAway = findClubLogo(m.awayTeam);

                    return (
                      <li
                        key={`${m.id}-${m.homeTeam}-${m.awayTeam}`}
                        onMouseDown={() => {
                          setQuery("");               // 🔥 limpa o filtro textual
                          setSelectedMatchId(m.id);   // filtra só por ID
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm"
                      >
                        {/* Linha principal: logos + times */}
                        <div className="flex items-center gap-2">
                          {/* Logo casa */}
                          {logoHome ? (
                            <img
                              src={logoHome}
                              alt={m.homeTeam}
                              className="w-5 h-5 object-contain shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 shrink-0" />
                          )}

                          {/* Times */}
                          <div className="min-w-0 flex-1">
                            <div className="font-xs text-gray-800 dark:text-gray-200 truncate">
                              {m.homeTeam} <span className="text-gray-400">x</span> {m.awayTeam}
                            </div>

                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {m.competition} • {m.time}
                            </div>
                          </div>

                          {/* Logo fora */}
                          {logoAway ? (
                            <img
                              src={logoAway}
                              alt={m.awayTeam}
                              className="w-5 h-5 object-contain shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 shrink-0" />
                          )}
                        </div>
                      </li>
                    );
                  })}


                </ul>

              </div>

            )}

          </div>

        </div>

      </div>

 

      

        {/* Hero: Featured Match (apenas na aba Em Alta) */}
        {tab === "em-alta" && !loading && featuredMatch && (
          <div className="rounded-2xl border border-[#014a8f]/15 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:via-neutral-950 dark:to-emerald-950/20 p-5 shadow-xl shadow-blue-500/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#014a8f] bg-white/70 border border-[#014a8f]/20 px-3 py-1 rounded-full">
                    Destaque
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Partida mais próxima
                  </span>
                </div>


                {/* Linha com escudos + times */}
                <div className="mt-1 flex items-center gap-3">
                  {findClubLogo((featuredMatch as any).homeTeam) && (
                    <img
                      src={findClubLogo((featuredMatch as any).homeTeam)!}
                      alt={(featuredMatch as any).homeTeam}
                      className="w-9 h-9 object-contain drop-shadow-sm"
                    />
                  )}

                  <div className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
                    {(featuredMatch as any).homeTeam}{" "}
                    <span className="text-gray-400">x</span>{" "}
                    {(featuredMatch as any).awayTeam}
                  </div>

                  {findClubLogo((featuredMatch as any).awayTeam) && (
                    <img
                      src={findClubLogo((featuredMatch as any).awayTeam)!}
                      alt={(featuredMatch as any).awayTeam}
                      className="w-9 h-9 object-contain drop-shadow-sm"
                    />
                  )}
                </div>

                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {(featuredMatch as any).competition} • {(featuredMatch as any).time}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[#014a8f]/20 bg-white/70 dark:bg-neutral-900/60 px-4 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Começa em</div>

                  {/* Fonte igual às odds */}
                <div className="tabular-nums text-lg font-bold text-[#0a2a5e] dark:text-white">
                  {featuredCountdown ?? "—"}
                </div>
                </div>

                <Button
                  className="
                    bg-[#014a8f] hover:bg-[#003b70] text-white rounded-xl
                    shadow-sm hover:shadow-md transition
                  "
                  onClick={() => {
                    const id = (featuredMatch as any).id;

                    // garante que estamos na aba correta
                    setTab("em-alta");

                    setQuery("");              // 🔥 NÃO filtra lista
                    setSelectedMatchId(null);
                     // garante lista completa
                    setScrollToMatchId(id);    // scroll funciona
                    // se você ainda quiser filtrar quando clicar, descomente:
                    // setSelectedMatchId(id);
                  }}
                >
                  Ver odds
                </Button>
              </div>
            </div>
          </div>
        )}


        {/* Feedback de regras / erros */}

        {feedback && (

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs sm:text-sm text-blue-800">

            {feedback}

          </div>

        )}

 

        {viewMatches}

      </div>

 

      {/* Botão flutuante "Ver Bilhete" */}
      {selections.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[9999]">
            <Button
              className="
                bg-[#014a8f] hover:bg-[#003b70] text-white
                shadow-2xl rounded-full px-5 py-2 text-sm
                transition-all hover:-translate-y-0.5
              "
              onClick={() => setIsSlipOpen(true)}
            >
              Ver Bilhete ({selections.length}) • Odd {oddTotal.toFixed(2)}
            </Button>
          </div>,
          document.body
        )
      }



      {/* Modal premium do Bilhete — padrão Histórico */}
      <Dialog open={isSlipOpen} onOpenChange={setIsSlipOpen}>
        <DialogContent className="max-w-5xl w-[94vw] sm:w-full p-0 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-neutral-800">
            <DialogHeader>
              <DialogTitle className="text-[#014a8f] text-xl font-extrabold">
                Seu Bilhete
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="
                  inline-flex items-center
                  rounded-2xl border border-[#014a8f]/25 bg-[#014a8f]/10
                  px-4 py-1.5 text-sm font-bold text-[#014a8f]
                "
              >
                {selections.length} seleção{selections.length > 1 ? "s" : ""}
              </span>

              <span
                className="
                  inline-flex items-center gap-2
                  rounded-2xl border border-gray-200 dark:border-neutral-700
                  bg-white dark:bg-neutral-900
                  px-4 py-1.5
                "
              >
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Odd total
                </span>
                <span className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">
                  {oddTotal.toFixed(2)}
                </span>
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 max-h-[78vh] overflow-auto bg-gray-50/60 dark:bg-neutral-950">
            {selections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-10 text-center text-gray-500 text-sm">
                Nenhuma seleção no bilhete.
              </div>
            ) : (
              <>
                {/* LISTA */}
                <div className="space-y-4">
                  {selections.map((s, i) => {
                    const logoHome = findClubLogo(s.time_casa);
                    const logoAway = findClubLogo(s.time_fora);

                    const leagueCode = leagueCountries[s.campeonato];
                    const leagueFlag = leagueCode ? getFlagByCountryCode(leagueCode) : null;

                    return (
                      <div
                        key={i}
                        className="
                          rounded-2xl border border-gray-200 dark:border-neutral-800
                          bg-white dark:bg-neutral-900 p-4 shadow-sm
                        "
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {logoHome && (
                                <img
                                  src={logoHome}
                                  alt={s.time_casa}
                                  className="w-5 h-5 object-contain shrink-0"
                                  loading="lazy"
                                />
                              )}

                              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {s.time_casa}
                              </span>

                              <span className="text-gray-400 font-medium">x</span>

                              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {s.time_fora}
                              </span>

                              {logoAway && (
                                <img
                                  src={logoAway}
                                  alt={s.time_fora}
                                  className="w-5 h-5 object-contain shrink-0"
                                  loading="lazy"
                                />
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              {leagueFlag && (
                                <img
                                  src={leagueFlag}
                                  alt="Liga"
                                  className="w-4 h-4 object-contain"
                                  loading="lazy"
                                />
                              )}
                              <span className="truncate">{s.campeonato}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveSelection(i)}
                            className="
                              shrink-0 rounded-xl
                              border border-gray-200 dark:border-neutral-700
                              p-2 text-gray-500 hover:text-red-600
                              hover:bg-gray-50 dark:hover:bg-neutral-800
                              transition
                            "
                            aria-label="Remover seleção"
                            title="Remover"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M5 6l1 14h12l1-14" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500">{s.mercado}</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {getPickLabel(s)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[11px] text-gray-500">Odd</div>
                            <div className="text-base font-extrabold text-[#0a2a5e] dark:text-white tabular-nums">
                              {s.odd.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* FINANCEIRO */}
                <div className="mt-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Saldo disponível</div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white tabular-nums">
                        R$ {saldo.toFixed(2)}
                      </div>
                    </div>

                    {recommendedStake > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Valor recomendado</div>
                          <div className="text-sm font-bold text-[#014a8f] tabular-nums">
                            R$ {recommendedStake.toFixed(2)}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 text-xs font-semibold"
                          onClick={() => {
                            if (!stake || stake <= 0) setStake(recommendedStake);
                          }}
                        >
                          Usar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Retorno potencial
                      </div>
                      <div className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                        R$ {possibleReturn.toFixed(2)}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        Valor da aposta
                      </div>

                      <div className="mt-2 inline-flex items-center gap-2 sm:justify-end">
                        <span className="text-sm text-gray-500">R$</span>

                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={stake || ""}
                          onChange={(e) => setStake(Number(e.target.value) || 0)}
                          className="
                            w-44 h-11 rounded-xl
                            border border-gray-300 dark:border-neutral-700
                            px-4 text-lg font-extrabold
                            text-right tabular-nums
                            bg-white dark:bg-neutral-900
                            focus:outline-none focus:ring-2 focus:ring-[#014a8f]/40
                          "
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end bg-white dark:bg-neutral-900">
            {selections.length === 0 ? (
              <Button
                variant="outline"
                className="h-9"
                onClick={() => setIsSlipOpen(false)}
              >
                Fechar
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  className="w-1/3 h-10 rounded-xl"
                  onClick={resetSlip}
                  disabled={placingBet}
                >
                  Limpar
                </Button>

                <Button
                  className="w-2/3 h-10 bg-[#014a8f] hover:bg-[#003b70] text-white rounded-xl"
                  onClick={handleConfirmBet}
                  disabled={placingBet}
                >
                  {placingBet ? "Registrando..." : "Apostar agora"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal H2H */}
      {h2hMeta && (
        <H2HModal
          isOpen={h2hOpen}
          onClose={() => setH2hOpen(false)}
          homeTeam={h2hMeta.homeTeam}
          awayTeam={h2hMeta.awayTeam}
          logoHome={h2hMeta.logoHome}
          logoAway={h2hMeta.logoAway}
          stats={h2hStats}
          matches={h2hMatches}
          isLoading={h2hLoading}
          error={h2hError}
        />
      )}




    </div>

  );

};

 

function TopTab({

  label,

  active,

  onClick,

}: {

  label: string;

  active: boolean;

  onClick: () => void;

}) {

  return (

    <Button

      variant="ghost"

      onClick={onClick}

      className={`
        text-white rounded-xl
        px-4 py-2 h-9
        text-sm font-semibold
        ${active ? "bg-white/15 hover:bg-white/20" : "hover:bg-white/10"}
      `}

    >

      {label}

    </Button>

  );

}

 

function Section({

  title,

  subtitle,

  children,

}: React.PropsWithChildren<{

  title: string;

  subtitle?: string;

}>) {

  return (

    <section className="space-y-4">

      <div>

        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">

          {title}

        </h2>

        {subtitle && (

          <p className="text-sm text-gray-500 dark:text-gray-400">

            {subtitle}

          </p>

        )}

      </div>

      {children}

    </section>

  );

}

 

function EmptyState({ text }: { text: string }) {

  return (

    <div className="rounded-xl border border-dashed p-8 text-center text-gray-600 dark:text-gray-300">

      {text}

    </div>

  );

}

 

export default HomeScreen;