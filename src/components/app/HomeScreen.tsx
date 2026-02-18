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

<<<<<<< Updated upstream
=======
// UI (novo)
import { SkeletonMatchCard } from "@/components/ui/skeletons";
import { getLocalLogo } from "@/utils/getLocalLogo";
import { useNavigate } from "react-router-dom";
import { leagueCountries } from "@/utils/league-countries";
import { getFlagByCountryCode } from "@/utils/getFlagByCountryCode";
import { getTierBadgeSource } from "@/utils/componentUtils";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";



>>>>>>> Stashed changes
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
      return data.logo ? data.logo : null;
    }
  }

  return null;
};

import { leagueCountries } from "@/utils/league-countries";
import { getFlagByCountryCode } from "@/utils/getFlagByCountryCode";

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

<<<<<<< Updated upstream
 
=======
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
>>>>>>> Stashed changes

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

  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold dark:bg-blue-800/30 dark:text-blue-200">

    {children}

  </span>

);

 

export const HomeScreen: React.FC = () => {

  const [tab, setTab] = useState<"favoritos" | "em-alta" | "bilhetes">("em-alta");

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

 

  const interval = setInterval(() => {

    fetchSaldo();

  }, 5000); // atualiza a cada 5s

 

  return () => clearInterval(interval);

}, []);

 

  // ========= Filtro de Partidas =========

 

  const filtered = useMemo(() => {

    const q = query.trim().toLowerCase();

 

    if (!q) return upcoming ?? [];

 

    // ---- 1. Detectar se o texto digitado é um clube do clubs-map.json ----

    const matchedClub = Object.keys(clubsMap).find(

      (club) => club.toLowerCase().includes(q)

    );

 

    // Se digitou um clube existente → filtra apenas jogos desse clube

    if (matchedClub) {

      return (upcoming ?? []).filter(

        (m) =>

          m.homeTeam?.toLowerCase().includes(matchedClub.toLowerCase()) ||

          m.awayTeam?.toLowerCase().includes(matchedClub.toLowerCase())

      );

    }

 

    // ---- 2. Caso NÃO seja um clube, funciona como busca normal (time/competição) ----

    return (upcoming ?? []).filter((m) =>

      [m.homeTeam, m.awayTeam, m.competition].some((t) =>

        t?.toLowerCase().includes(q)

      )

    );

  }, [query, upcoming]);

 

 const updatedTime =
  lastUpdated != null
    ? `${new Date(lastUpdated).toLocaleDateString("pt-BR")} - ${new Date(lastUpdated).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}`
    : "—";

 

  // ========= Lógica do Bilhete =========

 

  const canAddSelection = (

    current: BetSelection[],

    candidate: BetSelection

  ): string | null => {

    const sameMatch = current.filter(

      (s) =>

        s.matchId === candidate.matchId ||

        s.partida === candidate.partida

    );

 

    for (const s of sameMatch) {

      // Regra 1: não permitir 1X2 conflitante

      if (

        s.mercado === "1X2" &&

        candidate.mercado === "1X2" &&

        s.selecao !== candidate.selecao

      ) {

        return "Você já selecionou outro resultado 1X2 para este jogo.";

      }

 

      // Regra 2: Over x Under no mesmo jogo

      const isOver = /over/i.test(s.selecao) || /over/i.test(candidate.selecao);

      const isUnder =

        /under/i.test(s.selecao) || /under/i.test(candidate.selecao);

 

      if (isOver && isUnder) {

        return "Não é permitido combinar Over e Under do mesmo jogo no mesmo bilhete.";

      }

    }

 

    return null;

  };

 

  const handleAddSelection = (sel: BetSelection) => {

    setFeedback(null);

    setSelections((prev) => {

      const err = canAddSelection(prev, sel);

      if (err) {

        setFeedback(err);

        return prev;

      }

 

      // evita duplicata exata

      const exists = prev.some(

        (p) =>

          p.matchId === sel.matchId &&

          p.mercado === sel.mercado &&

          p.selecao === sel.selecao &&

          p.odd === sel.odd

      );

      if (exists) {

        setFeedback("Essa seleção já está no seu bilhete.");

        return prev;

      }

 

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

 

    if (!stake || stake <= 0.5) {

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




  // ========= View das Abas =========

 

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

            <EmptyState text="Carregando partidas…" />

          ) : error ? (

            <EmptyState text={`Erro: ${error}`} />

          ) : favMatches.length > 0 ? (

            <ExpandableMatchCard

              matches={favMatches}

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
                  linha, // ✅ NOVO
                  odd: params.odd,
                };

                handleAddSelection(sel); 
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

          <Section

            title="Em Alta"

            subtitle="Partidas com maior interesse"

          >

            {loading ? (

              <EmptyState text="Carregando partidas…" />

            ) : error ? (

              <EmptyState text={`Erro: ${error}`} />

            ) : trending.length > 0 ? (

              <ExpandableMatchCard
                matches={trending}
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
    default:
      return (
        <Section title="Bilhetes" subtitle="Histórico de apostas registradas">
          
          {/* Botões de filtro */}
          <Button
            className="bg-[#014a8f] text-white mb-4"
            onClick={async () => {
              await api.post("/apostas/verificar");
              fetchTickets();
              fetchSaldo();
            }}
          >
            Atualizar bilhetes
          </Button>

          <div className="flex gap-2 mb-6">
            {[
              { key: "todos", label: "Todos" },
              { key: "pendentes", label: "Pendentes" },
              { key: "liquidados", label: "Liquidados" },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setTicketFilter(btn.key as any)}
                className={`
                  px-4 py-2 text-sm rounded-full border transition
                  ${
                    ticketFilter === btn.key
                      ? "bg-[#014a8f] text-white border-[#014a8f]"
                      : "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                  }
                `}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <EmptyState text="Nenhum bilhete encontrado." />
          ) : (
            <ul className="space-y-6">
              {filteredTickets.map((t) => {
                const statusNorm = (t.status || "").toUpperCase();
                const isPending = !t.status || t.status === "PENDENTE";

                return (
                  <li
                    key={t.id}
                    className={`
                      rounded-xl bg-white dark:bg-neutral-900 p-5 shadow-sm
                      ${isPending ? "border border-gray-300 dark:border-neutral-700" : ""}
                    `}
                  >

                    {/* Topo com data + badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500">
                        {new Date(t.createdAt).toLocaleString("pt-BR")}
                      </span>

                    

                    <span
                      className={`
                        text-[10px] font-semibold uppercase px-2 py-1 rounded-full
                        ${
                          statusNorm === "PENDENTE"
                            ? "bg-yellow-100 text-yellow-700"
                            : statusNorm === "PERDIDO"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }
                      `}
                    >
                      {statusNorm || "PENDENTE"}
                    </span>


                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-2 mb-5 text-sm">
                      <div>
                        <span className="text-gray-500">Aposta</span>
                        <p className="font-semibold text-grey-600">
                          R$ {t.stake.toFixed(2)}
                        </p>


                      </div>

                      <div>
                        <span className="text-gray-500">Retorno potencial</span>
                          <p
                            className={`font-semibold ${
                              statusNorm === "PERDIDO"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            R$ {t.potentialReturn.toFixed(2)}
                          </p>
                      </div>
                    </div>

                    {/* Seleções — ESTILO LUXO (logo + bandeira + mercado) */}
                    <div className="space-y-4">
                      {t.selections?.map((s, i) => {
                        const logoHome = findClubLogo(s.time_casa || s.match?.split(" x ")[0]);
                        const logoAway = findClubLogo(s.time_fora || s.match?.split(" x ")[1]);

                        const leagueCode = leagueCountries[s.campeonato];
                        const leagueFlag = leagueCode ? getFlagByCountryCode(leagueCode) : null;

                        return (
                          <div
                            key={i}
                            className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg shadow-sm"
                          >
                            {/* Linha dos times (AGORA COM A BANDEIRA À ESQUERDA) */}
                            <div className="flex items-center gap-3 mb-2">

                              {/* BANDEIRA DA LIGA */}
                              {leagueFlag && (
                                <img src={leagueFlag} className="w-5 h-5 object-contain" />
                              )}

                              {/* TIME CASA */}
                              <div className="flex items-center gap-2">
                                {logoHome && (
                                  <img src={logoHome} className="w-5 h-5 object-contain" />
                                )}
                                <span className="font-semibold">{s.time_casa}</span>
                              </div>

                              <span className="text-gray-500">x</span>

                              {/* TIME FORA */}
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{s.time_fora}</span>
                                {logoAway && (
                                  <img src={logoAway} className="w-5 h-5 object-contain" />
                                )}
                              </div>
                            </div>

                            {/* Mercado / Pick */}
                            <div className="flex justify-between text-sm">
                              <div>
                                <p className="text-gray-600">{s.mercado}</p>
                                <p className="font-semibold">{getPickLabel(s)}</p>
                              </div>

                              <p className="font-semibold">Odd {s.odd.toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      );
    }

  }, [tab, filtered, loading, error, tickets, logos, handleAddSelection]);

 

  // ========= Render =========

 

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">

      {/* Top bar */}

      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#014a8f] text-white shadow">

        <div className="flex flex-wrap gap-2">

          <TopTab

            label="Jogos Favoritos"

            active={tab === "favoritos"}

            onClick={() => setTab("favoritos")}

          />

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

        </div>

        <div className="mt-2 sm:mt-0 flex items-center gap-3">

          <span className="text-xs sm:text-sm">

            Saldo:{" "}

            <b>R$ {saldo.toFixed(2)}</b>

          </span>

          <div className="relative">

            <input

              type="text"

              value={query}

              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setSelectedMatchId(null);
              }}

              placeholder="Encontre aqui seu jogo"

              className="w-52 sm:w-64 h-9 px-3 py-2 text-xs sm:text-sm font-medium text-white placeholder-white bg-[#014a8f] border border-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white"

            />

            {suggestions.length > 0 && (

              <div className="absolute left-0 mt-1 w-52 sm:w-64 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-md shadow-lg z-50 overflow-hidden">

                <ul className="max-h-56 overflow-auto">

                  {suggestions.map((m) => (

                    <li

                      key={`${m.id}-${m.homeTeam}-${m.awayTeam}`}

                      onMouseDown={() => {

                        setQuery(`${m.homeTeam} x ${m.awayTeam}`);

                        setSelectedMatchId(m.id);

                      }}

                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm"

                    >

                      <div className="font-medium text-gray-800 dark:text-gray-200">

                        {m.homeTeam} x {m.awayTeam}

                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400">

                        {m.competition} • {m.time}

                      </div>

                    </li>

                  ))}

                </ul>

              </div>

            )}

          </div>

        </div>

      </div>

 

      {/* Conteúdo */}

      <div className="p-4 space-y-6">

        <div>

          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">

            Partidas do Dia

          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400">

            Acompanhe aqui os melhores jogos

          </p>

          <div className="mt-2">

            <Badge>Atualizado em {updatedTime}</Badge>

          </div>

        </div>

<<<<<<< Updated upstream
 
=======
        {/* BUSCA — AÇÃO PRINCIPAL (fase 2) */}
        <div ref={searchWrapRef} className="relative flex-1 min-w-[220px]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setIsSuggestOpen(true)}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setSelectedMatchId(null);
              setIsSuggestOpen(true);
            }}
            placeholder="Encontre aqui seu jogo"
            className="
              w-full h-9
              pl-3 pr-10
              text-xs sm:text-sm font-medium
              text-white placeholder-white/70
              bg-white/20 backdrop-blur
              border border-white/30
              rounded-xl
              shadow-sm
              focus:outline-none
              focus:ring-2 focus:ring-white/60
            "
          />

          {/* Botão limpar */}
          {(query.trim().length > 0 || selectedMatchId != null) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedMatchId(null);
                setIsSuggestOpen(false);
                inputRef.current?.focus();
              }}
              className="
                absolute right-2 top-1/2 -translate-y-1/2
                w-6 h-6 rounded-lg
                text-white/80 hover:text-white
                hover:bg-white/10
                flex items-center justify-center
                focus:outline-none focus:ring-2 focus:ring-white/40
              "
              aria-label="Limpar busca"
              title="Limpar"
            >
              ×
            </button>
          )}


          {/* Sugestões */}
          {isSuggestOpen && suggestions.length > 0 && (
            <div
              className="
                absolute left-0 mt-1 w-full sm:w-[26rem]
                bg-white dark:bg-neutral-900
                border border-gray-200 dark:border-neutral-800
                rounded-md shadow-lg z-[9999] overflow-hidden
              "
            >
              <ul className="max-h-56 overflow-auto">
                {suggestions.map((m) => {
                  const logoHome = findClubLogo(m.homeTeam);
                  const logoAway = findClubLogo(m.awayTeam);

                  return (
                    <li
                      key={`${m.id}-${m.homeTeam}-${m.awayTeam}`}
                      // onMouseDown evita perder o foco antes do click (melhor em dropdown)
                      onMouseDown={(e) => {
                        e.preventDefault();

                        // (A) limpa input
                        setQuery("");
                        setIsSuggestOpen(false);

                        // (B) não filtra a lista — só faz scroll até o card
                        setSelectedMatchId(null);
                        setTab("em-alta");
                        setScrollToMatchId(m.id);

                        // opcional: se quiser "fixar" como seleção, troque pra:
                        // setSelectedMatchId(m.id);
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {logoHome ? (
                          <img src={logoHome} className="w-5 h-5 object-contain shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 shrink-0" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-gray-800 dark:text-gray-200 truncate">
                            {m.homeTeam} <span className="text-gray-400">x</span> {m.awayTeam}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {m.competition} • {m.time}
                          </div>
                        </div>

                        {logoAway ? (
                          <img src={logoAway} className="w-5 h-5 object-contain shrink-0" />
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

                {/* CONTEXTO — TIER + SALDO (com Hover) */}
        <div
          className="flex items-center gap-2 shrink-0
                     rounded-xl border border-white/20
                     bg-white/10 px-2.5 py-1.5"
        >
          {/* ===== HOVER: TIER ===== */}
          <HoverCard openDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                title="Ver progresso do Tier"
              >
                <img
                  src={getTierBadgeSource(tierKey)}
                  alt={tierName}
                  className="w-5 h-5 object-contain"
                  loading="lazy"
                />
                <span className="hidden sm:inline text-xs font-medium whitespace-nowrap text-white/80">
                  {tierName}
                </span>
              </button>
            </HoverCardTrigger>

            <HoverCardContent
              align="end"
              side="bottom"
              className="w-[360px] p-4 dark:bg-neutral-950 dark:border-neutral-800"
            >
              {(() => {
                const next = getNextTier(tierKey);
                const xp = tierStats.xp || 0;
                const bets = tierStats.bets || 0;
                const wins = tierStats.wins || 0;
                const acc = tierStats.winRate || 0;

                if (!next) {
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Você está no topo 🎉
                        </p>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200">
                          {tierName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Agora é manter consistência pra defender o nível.
                      </p>
                    </div>
                  );
                }

                const needXP = Math.max(0, next.xp - xp);
                const needBets = Math.max(0, next.bets - bets);
                const needWins = Math.max(0, next.wins - wins);
                const needAcc = Math.max(0, next.acc - acc);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Próximo Tier
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                          {next.name}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <img
                          src={getTierBadgeSource(next.key)}
                          alt={next.name}
                          className="w-8 h-8 object-contain"
                          loading="lazy"
                        />
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-neutral-900 dark:text-gray-200">
                          {next.xp.toLocaleString()} XP
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40 p-3">
                      <div className="text-[11px] font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        Falta para subir
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-600 dark:text-gray-300">XP</span>
                          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                            {needXP.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-600 dark:text-gray-300">Apostas</span>
                          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                            {needBets}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-600 dark:text-gray-300">Vitórias</span>
                          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                            {needWins}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-600 dark:text-gray-300">% Acerto</span>
                          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                            {needAcc > 0 ? fmtPct1(needAcc) : "OK"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Atual: <b>{xp.toLocaleString()} XP</b> • {bets} apostas • {wins} vitórias • {fmtPct1(acc)} acerto
                    </div>
                  </div>
                );
              })()}
            </HoverCardContent>
          </HoverCard>

          <span className="hidden sm:block h-4 w-px bg-white/20" />

          {/* ===== HOVER: SALDO ===== */}
          <HoverCard openDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="text-xs font-medium whitespace-nowrap text-white/75 tabular-nums rounded-lg px-1.5 py-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                title="Ver saldo em apostas"
              >
                R$ {saldo.toFixed(2)}
              </button>
            </HoverCardTrigger>

            <HoverCardContent
              align="end"
              side="bottom"
              className="w-[320px] p-4 dark:bg-neutral-950 dark:border-neutral-800"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Detalhes do saldo
                </p>

                <div className="rounded-xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Disponível</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                      R$ {fmtMoney(saldo)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Em apostas</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                      R$ {fmtMoney(saldoEmAposta)}
                    </span>
                  </div>

                  <div className="h-px bg-gray-200/70 dark:bg-neutral-800 my-1" />

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Total estimado</span>
                    <span className="font-extrabold tabular-nums text-[#0a2a5e] dark:text-white">
                      R$ {fmtMoney(saldo + saldoEmAposta)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  “Em apostas” soma o stake dos bilhetes pendentes.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
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

>>>>>>> Stashed changes

        {/* Feedback de regras / erros */}

        {feedback && (

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs sm:text-sm text-blue-800">

            {feedback}

          </div>

        )}

 

        {viewMatches}

      </div>

 

      {/* Botão flutuante "Ver Bilhete" */}

      {selections.length > 0 && (

        <div className="fixed bottom-4 right-4 z-40">

          <Button

            className="bg-[#014a8f] hover:bg-[#003b70] text-white shadow-xl rounded-full px-5 py-2 text-sm"

            onClick={() => setIsSlipOpen(true)}

          >

            Ver Bilhete ({selections.length}) • Odd {oddTotal.toFixed(2)}

          </Button>

        </div>

      )}

 

      {/* Modal simples do Bilhete */}

      {isSlipOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="
            w-full
            sm:max-w-lg
            md:max-w-xl
            lg:max-w-2xl
            bg-white dark:bg-neutral-900
            rounded-t-2xl sm:rounded-2xl
            p-6
            space-y-6
            shadow-2xl
          ">


            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold">Seu Bilhete</h2>
              <button
                className="text-sm text-gray-500 hover:text-gray-800"
                onClick={() => setIsSlipOpen(false)}
              >
                Fechar
              </button>
            </div>

            {/* Se não tiver nada */}
            {selections.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma seleção no bilhete.</p>
            ) : (
              <>
                {/* LISTA DE SELEÇÕES */}
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">

                  {selections.map((s, i) => {
                    const logoHome = findClubLogo(s.time_casa);
                    const logoAway = findClubLogo(s.time_fora);

                    const leagueCode = leagueCountries[s.campeonato];
                    const leagueFlag = leagueCode
                      ? getFlagByCountryCode(leagueCode)
                      : null;

                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 p-3"
                      >
                        {/* Linha superior com times */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {logoHome && (
                              <img
                                src={logoHome}
                                className="w-5 h-5 object-contain"
                              />
                            )}
                            <span className="font-semibold text-sm">
                              {s.time_casa}
                            </span>
                            <span className="text-gray-400 font-medium">x</span>
                            <span className="font-semibold text-sm">
                              {s.time_fora}
                            </span>
                            {logoAway && (
                              <img
                                src={logoAway}
                                className="w-5 h-5 object-contain"
                              />
                            )}
                          </div>

                          {/* Botão remover (ícone lixeira) */}
                          <button
                            onClick={() => handleRemoveSelection(i)}
                            className="text-gray-500 hover:text-red-500 transition"
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

                        {/* Informações da liga + horário */}
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          {leagueFlag && (
                            <img src={leagueFlag} className="w-4 h-4" />
                          )}
                          <span>{s.campeonato}</span>
                        </div>

                        {/* Mercado / Seleção / Odd */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs">
                            <div className="text-gray-500">{s.mercado}</div>
                            <div className="font-semibold text-gray-800 dark:text-gray-100">
                              {getPickLabel(s)}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-gray-500">Odd</span>
                            <div className="text-sm font-bold">
                              {s.odd.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totais */}
                <div className="pt-2 space-y-3 text-sm border-t border-gray-200 dark:border-neutral-700">

                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                          <span>Saldo disponível:</span>
                          <span>R$ {saldo.toFixed(2)}</span>
                        </div>
                      </div>
                    {recommendedStake > 0 && (
                      <div className="flex items-center justify-between text-xs bg-blue-50 border border-blue-200 rounded-md px-2 py-1">
                        <span>Valor recomendado</span>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-800">
                            R$ {recommendedStake.toFixed(2)}
                          </span>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-0 h-6"
                            onClick={() => {
                              if (!stake || stake <= 0) {
                                setStake(recommendedStake);
                              }
                            }}
                          >
                            Usar
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Valor da aposta (R$)</span>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={stake || ""}
                        onChange={(e) => setStake(Number(e.target.value) || 0)}
                        className="w-28 border rounded-md px-2 py-1 text-sm"
                      />
                    </div>

                  </div>


                  <div className="flex justify-between">
                    <span>Retorno potencial</span>
                    <span className="font-semibold">
                      R$ {possibleReturn.toFixed(2)}
                    </span>
                  </div>



                {/* Botões */}
                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    className="w-1/3 text-xs"
                    onClick={resetSlip}
                    disabled={placingBet}
                  >
                    Limpar
                  </Button>

                  <Button
                    className="w-2/3 bg-[#014a8f] hover:bg-[#003b70] text-xs"
                    onClick={handleConfirmBet}
                    disabled={placingBet}
                  >
                    {placingBet ? "Registrando..." : "Apostar agora"}
                  </Button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
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

      className={`text-white ${

        active

          ? "bg.white/15 bg-white/15 hover:bg-white/20"

          : "hover:bg-white/10"

      }`}

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

        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">

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