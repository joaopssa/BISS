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
  live?: { status?: string; minute?: number; score?: { home?: number; away?: number } };
  logos?: { home?: string; away?: string };
  _dt?: string;
};

const API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:3001";
const LIVE_SHORT = new Set(["1H", "HT", "2H", "ET", "BT", "P"]);

export async function fetchLiveMatches(): Promise<UIMatch[]> {
  const res = await fetch(`${API_BASE}/api/football/live`, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha em /api/football/live (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const list: UIMatch[] = Array.isArray(json?.response) ? json.response : [];
  return list.filter((m) => LIVE_SHORT.has(String(m?.live?.status || "").toUpperCase()));
}

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