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
  isFavorite: boolean;
  sport?: string;
  popularity?: number;
  live?: { status?: string; minute?: number; score?: { home?: number; away?: number } };
  logos?: { home?: string; away?: string };
  _dt?: string; // ISO vindo do backend
};

const BASE = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:3001";

export async function fetchUpcoming(): Promise<UIMatch[]> {
  const res = await fetch(`${BASE}/api/football/upcoming`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const js = await res.json();
  const list: UIMatch[] = Array.isArray(js?.response) ? js.response : [];

  // 🔒 Filtro extra no cliente: hoje + não iniciados/ainda por começar
  const now = Date.now();
  const okStatus = new Set(["NS", "TBD", "PST"]);
  return list.filter((m) => {
    const st = String(m?.live?.status || "").toUpperCase();
    const t = m?._dt ? new Date(m._dt).getTime() : now + 1;
    return okStatus.has(st) || t > now;
  });
}

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