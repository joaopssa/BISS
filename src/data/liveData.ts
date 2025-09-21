// src/data/liveData.ts
// Lista de JOGOS AO VIVO (auto-refresh) vinda do backend Express:
// GET {VITE_BACKEND_URL}/api/football/live

import * as React from "react";

export type UIMatch = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  time: string;  // "HH:MM"
  date: string;  // locale date
  competition: string;
  odds: { home: number; draw: number; away: number };
  aiRecommendation: { type: string; confidence: number; suggestion: string; reasoning: string };
  isFavorite: boolean;
  live?: {
    status?: string;        // "1H", "HT", "2H", "ET", "P", etc.
    minute?: number;        // elapsed (min)
    score?: { home?: number; away?: number };
  };
  logos?: { home?: string; away?: string };
  _dt?: Date;
};

const { VITE_BACKEND_URL } = (import.meta.env as { VITE_BACKEND_URL?: string });

function normalizeBase(url?: string) {
  if (!url || !url.trim()) return "http://localhost:3001";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
const API_BASE = normalizeBase(VITE_BACKEND_URL);

/** Faz o fetch dos jogos ao vivo e mapeia para UIMatch[] */
export async function fetchLiveMatches(): Promise<UIMatch[]> {
  const res = await fetch(`${API_BASE}/api/football/live`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /api/football/live → HTTP ${res.status}: ${txt.slice(0, 180)}`);
  }
  const json = await res.json();
  const list: any[] = Array.isArray(json?.response) ? json.response : [];

  const mapped: UIMatch[] = list.map((fx: any, idx: number) => {
    const fixture   = fx.fixture || {};
    const league    = fx.league  || {};
    const teams     = fx.teams   || {};
    const goals     = fx.goals   || {};
    const statusObj = fixture.status || {};

    const dtIso: string | undefined = fixture.date;
    const dt = dtIso ? new Date(dtIso) : new Date();

    return {
      id: fixture.id ?? `${teams.home?.name || "home"}-${teams.away?.name || "away"}-${idx}`,
      homeTeam: teams.home?.name || "Time da Casa",
      awayTeam: teams.away?.name || "Time Visitante",
      competition: league.name || "Competição",
      date: dt.toLocaleDateString(),
      time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      odds: { home: 0, draw: 0, away: 0 }, // feed live não traz 1X2
      aiRecommendation: {
        type: "safe_bet",
        confidence: 70,
        suggestion: "Acompanhe o ao vivo",
        reasoning: "Odds 1X2 não inclusas no feed live.",
      },
      isFavorite: false,
      live: {
        status: String(statusObj.short || "").toUpperCase(),
        minute: typeof statusObj.elapsed === "number" ? statusObj.elapsed : undefined,
        score: { home: goals?.home, away: goals?.away },
      },
      logos: { home: teams.home?.logo, away: teams.away?.logo },
      _dt: dt,
    };
  });

  // ordenar do mais cedo ao mais tarde
  mapped.sort((a, b) => (a._dt?.getTime() || 0) - (b._dt?.getTime() || 0));
  return mapped;
}

/** Hook com auto-refresh (default 30s) para a aba “Ao vivo” */
export function useLiveData(refreshMs = 30000) {
  const [matches, setMatches] = React.useState<UIMatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLiveMatches();
      setMatches(data);
    } catch (e: any) {
      setError(e?.message || "Erro ao buscar jogos ao vivo");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let stop = false;
    const run = async () => { if (!stop) await load(); };
    run();
    const id = window.setInterval(run, refreshMs);
    return () => { stop = true; window.clearInterval(id); };
  }, [load, refreshMs]);

  return { matches, loading, error, reload: load };
}
