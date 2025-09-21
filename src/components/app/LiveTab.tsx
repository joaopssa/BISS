"use client";

import * as React from "react";
import { useLiveData } from "@/data/liveData";
import LiveMatchCard from "@/components/ui/live-match-card";

type Props = {
  logos: Record<string, string>;
  setLogos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fetchTeamLogo: (team: string) => Promise<string>;
};

export default function LiveTab({ logos, setLogos, fetchTeamLogo }: Props) {
  const { matches: live, loading, error } = useLiveData(30000);

  // Completa logos com as que vierem do feed e busca as ausentes
  React.useEffect(() => {
    (async () => {
      const add: [string, string][] = [];
      for (const m of live) {
        if (m.logos?.home && !logos[m.homeTeam]) add.push([m.homeTeam, m.logos.home]);
        if (m.logos?.away && !logos[m.awayTeam]) add.push([m.awayTeam, m.logos.away]);
      }
      if (add.length) setLogos((prev) => ({ ...prev, ...Object.fromEntries(add) }));

      const missing = new Set<string>();
      live.forEach((m) => {
        if (!logos[m.homeTeam]) missing.add(m.homeTeam);
        if (!logos[m.awayTeam]) missing.add(m.awayTeam);
      });
      if (missing.size === 0) return;

      const fetched = await Promise.all(
        Array.from(missing).map(async (t) => [t, await fetchTeamLogo(t)] as const)
      );
      if (fetched.length) setLogos((prev) => ({ ...prev, ...Object.fromEntries(fetched) }));
    })();
  }, [live, logos, setLogos, fetchTeamLogo]);

  if (loading) return <div className="text-sm text-gray-500">Carregando…</div>;
  if (error)   return <div className="text-sm text-red-600">Erro: {error}</div>;

  return live.length > 0 ? (
    <LiveMatchCard matches={live as any} logos={logos} />
  ) : (
    <div className="rounded-xl border border-dashed p-8 text-center text-gray-600 dark:text-gray-300">
      Nenhuma partida ao vivo no momento.
    </div>
  );
}
