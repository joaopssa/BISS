// src/data/matchData.ts
import * as React from "react";

export type UIMatch = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  date: string;
  competition: string;
  odds: { home: number; draw: number; away: number };
  aiRecommendation: { type: string; confidence: number; suggestion: string; reasoning: string };
  isFavorite: boolean;
  sport?: string;
  popularity?: number;
  live?: { status?: string; minute?: number; score?: { home?: number; away?: number } };
  logos?: { home?: string; away?: string };
  _dt?: Date;
};

// lê a URL do backend a partir do .env do FRONT (Opção A)
const { VITE_BACKEND_URL } = (import.meta.env as { VITE_BACKEND_URL?: string });

// normaliza a base
function normalizeBase(url?: string) {
  if (!url || !url.trim()) return "http://localhost:3001";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
const BASE = normalizeBase(VITE_BACKEND_URL);

/** Busca os jogos de HOJE que ainda não começaram */
export async function fetchUpcoming(): Promise<UIMatch[]> {
  const url = `${BASE}/api/football/upcoming`;
  const res = await fetch(url, {
    cache: "no-store",
    // mode: "cors", // (opcional) útil quando o backend está em outro domínio
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /api/football/upcoming → HTTP ${res.status}: ${txt.slice(0, 180)}`);
  }
  const js = await res.json();
  return Array.isArray(js?.response) ? js.response : [];
}

/** Hook com auto-refresh (default 2min) */
export function useUpcomingData(refreshMs = 120000) {
  const [matches, setMatches] = React.useState<UIMatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUpcoming();
      setMatches(data);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
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
