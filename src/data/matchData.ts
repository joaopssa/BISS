// src/data/matchData.ts
import * as React from "react";

export type UIMatch = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  date: string;
  competition: string;
  odds: { home: number | null; draw: number | null; away: number | null };
  isFavorite?: boolean;
  sport?: string;
  popularity?: number;
  live?: { status?: string; minute?: number; score?: { home?: number; away?: number } };
  logos?: { home?: string; away?: string };
  _dt?: string; // ISO
  _oddsDetail?: {
    ["1X2"]?: { "1"?: number | null; "X"?: number | null; "2"?: number | null };
    ["OverUnder"]?: Record<string, { Over?: number | null; Under?: number | null }>;
  };
  _extraMarkets?: Record<string, Record<string, number | null>>;
};

const BASE = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:3001";

export type UpcomingPayload = {
  matches: UIMatch[];
  lastUpdated: number | null; // epoch ms
};

export async function fetchUpcoming(): Promise<UpcomingPayload> {
  const res = await fetch(`${BASE}/api/football/upcoming`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const js = await res.json();

  const list: UIMatch[] = Array.isArray(js?.response) ? js.response : [];
  const lastUpdated: number | null = js?.meta?.csv?.lastUpdated ?? null;

  // 🧩 Montagem de _extraMarkets com base em _oddsDetail (somente mercados existentes)
  const withExtraMarkets = list.map((m) => {
    const extra: Record<string, Record<string, number | null>> = {};

    // Apenas inclui se tiver valores reais
    if (m._oddsDetail?.["OverUnder"]) {
      for (const [line, odds] of Object.entries(m._oddsDetail["OverUnder"])) {
        const hasValidOdd =
          typeof odds?.Over === "number" || typeof odds?.Under === "number";
        if (hasValidOdd) {
          extra[`Total de Gols (${line})`] = odds as Record<string, number | null>;
        }
      }
    }

    return { ...m, _extraMarkets: extra };
  });

  // 🧹 Filtro “sanidade”: mantém apenas partidas futuras ou sem status inválido
  const now = Date.now();
  const okStatus = new Set(["NS", "TBD", "PST", "", "LIVE"]);
  const clean = withExtraMarkets.filter((m) => {
    const st = String(m?.live?.status || "").toUpperCase();
    const t = m?._dt ? new Date(m._dt).getTime() : now + 1;
    return okStatus.has(st) || t > now;
  });

  return { matches: clean, lastUpdated };
}

export function useUpcomingData(refreshMs = 60000) {
  const [matches, setMatches] = React.useState<UIMatch[]>([]);
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { matches, lastUpdated } = await fetchUpcoming();
      setMatches(matches);
      setLastUpdated(lastUpdated ?? null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let stop = false;
    const run = async () => {
      if (!stop) await load();
    };
    run();
    const id = window.setInterval(run, refreshMs);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [load, refreshMs]);

  return { matches, lastUpdated, loading, error, reload: load };
}
