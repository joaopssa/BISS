// src/data/liveData.ts
// Lista de JOGOS AO VIVO (auto-refresh) vinda do backend Express em /api/football/live

import * as React from "react";
import api from "@/services/api"; // <- usa o mesmo axios do restante do app

export type UIMatch = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  time: string;       // "HH:MM"
  date: string;       // locale date
  competition: string;
  // removemos odds/AI da UI ao vivo
  isFavorite?: boolean;
  live?: {
    status?: string;        // "1H", "HT", "2H", "ET", "P", etc.
    minute?: number;        // elapsed (min)
    score?: { home?: number; away?: number };
  };
  logos?: { home?: string; away?: string };
  _dt?: Date; // auxiliar para ordenar
};

const USE_SAMPLE_WHEN_EMPTY = false; // coloque true só para testar o card ao vivo

const SAMPLE: UIMatch[] = [
  {
    id: "SAMPLE-1",
    homeTeam: "Time A",
    awayTeam: "Time B",
    competition: "Amistoso",
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    live: { status: "1H", minute: 23, score: { home: 1, away: 0 } },
    logos: {},
    _dt: new Date(),
  },
];

export async function fetchLiveMatches(): Promise<UIMatch[]> {
  // usando mesma base do axios (`/api`), evita CORS/baseURL divergente
  const res = await api.get("/api/football/live", { timeout: 20000 });


  if (res.status !== 200) {
    const detail = typeof res.data === "string" ? res.data.slice(0, 200) : JSON.stringify(res.data || {});
    throw new Error(`Falha em /football/live (HTTP ${res.status}): ${detail}`);
  }

  const list: any[] = Array.isArray(res.data?.response) ? res.data.response : [];

  if (list.length === 0 && USE_SAMPLE_WHEN_EMPTY) {
    return SAMPLE;
  }

  // o backend já mapeia ao formato, mas manteremos uma sanitização mínima
  const mapped: UIMatch[] = list.map((fx: any, idx: number) => {
    const dtIso: string | undefined = fx._dt || fx.fixture?.date;
    const dt = dtIso ? new Date(dtIso) : new Date();
    return {
      id: fx.id ?? idx,
      homeTeam: fx.homeTeam ?? fx.teams?.home?.name ?? "Time da Casa",
      awayTeam: fx.awayTeam ?? fx.teams?.away?.name ?? "Time Visitante",
      competition: fx.competition ?? fx.league?.name ?? "Competição",
      date: fx.date ?? dt.toLocaleDateString(),
      time: fx.time ?? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isFavorite: !!fx.isFavorite,
      live: fx.live ?? {
        status: String(fx?.fixture?.status?.short || "").toUpperCase(),
        minute: typeof fx?.fixture?.status?.elapsed === "number" ? fx.fixture.status.elapsed : undefined,
        score: { home: fx?.goals?.home, away: fx?.goals?.away },
      },
      logos: fx.logos ?? { home: fx?.teams?.home?.logo, away: fx?.teams?.away?.logo },
      _dt: dt,
    };
  });

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
      // Erro fica visível na UI (LiveTab) — facilita diagnosticar quota/timeout/CORS
      setError(e?.message || "Erro ao buscar jogos ao vivo");
      setMatches([]); // zera para evitar estados antigos
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
