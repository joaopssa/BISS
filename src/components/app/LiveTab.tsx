// src/components/app/LiveTab.tsx
"use client";
import * as React from "react";
import { useLiveData } from "@/data/liveData";
import LiveMatchCard from "./LiveMatchCard";

type Props = {
  logos: Record<string, string>;
  setLogos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fetchTeamLogo: (team: string) => Promise<string>;
};

export default function LiveTab({ logos, setLogos, fetchTeamLogo }: Props) {
  const { matches: live, loading, error } = useLiveData(30000);

  // Completa logos que faltam (best-effort)
  React.useEffect(() => {
    (async () => {
      const missing = new Set<string>();
      for (const m of live) {
        if (m.homeTeam && !logos[m.homeTeam] && m.logos?.home) {
          setLogos((prev) => ({ ...prev, [m.homeTeam]: m.logos!.home! }));
        } else if (m.homeTeam && !logos[m.homeTeam]) {
          missing.add(m.homeTeam);
        }
        if (m.awayTeam && !logos[m.awayTeam] && m.logos?.away) {
          setLogos((prev) => ({ ...prev, [m.awayTeam]: m.logos!.away! }));
        } else if (m.awayTeam && !logos[m.awayTeam]) {
          missing.add(m.awayTeam);
        }
      }
      if (missing.size) {
        const entries = await Promise.all(
          Array.from(missing).map(async (t) => [t, await fetchTeamLogo(t)] as const)
        );
        setLogos((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
  }, [live, logos, setLogos, fetchTeamLogo]);

  if (loading) return <div className="text-sm text-gray-500">Carregando…</div>;
  if (error)   return <div className="text-sm text-red-600">Erro: {error}</div>;

  if (!live.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-gray-600 dark:text-gray-300">
        Nenhuma partida ao vivo no momento.
      </div>
    );
  }

  return (
    <div>
      {live.map((m) => (
        <LiveMatchCard key={m.id} match={m} logos={logos} />
      ))}
    </div>
  );
}
