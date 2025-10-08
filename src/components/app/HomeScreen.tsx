// src/screens/HomeScreen.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import ExpandableMatchCard from "@/components/ui/expandable-match-card";
import LiveTab from "@/components/app/LiveTab";
import { useUpcomingData } from "@/data/matchData";
import { Button } from "@/components/ui/button";

type UIMatch = import("@/data/matchData").UIMatch;

type Ticket = {
  id: string;
  createdAt: string;
  stake: number;
  potentialReturn: number;
  selections: Array<{ match: string; market: string; pick: string; odd: number }>;
};

const Badge = ({ children }: React.PropsWithChildren) => (
  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold dark:bg-blue-800/30 dark:text-blue-200">
    {children}
  </span>
);

export const HomeScreen: React.FC = () => {
  const [tab, setTab] = useState<"favoritos" | "ao-vivo" | "em-alta" | "bilhetes">("em-alta");
  const [query, setQuery] = useState("");
  const [tickets] = useState<Ticket[]>([]);
  const { matches: upcoming, lastUpdated, loading, error } = useUpcomingData();
  const [logos] = useState<Record<string, string>>({}); // no logos loaded

  // text search filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (upcoming ?? []).filter((m) =>
      [m.homeTeam, m.awayTeam, m.competition].some((t) => t?.toLowerCase().includes(q))
    );
  }, [query, upcoming]);

  const updatedTime =
    lastUpdated != null
      ? new Date(lastUpdated).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "—";

  const viewMatches = useMemo(() => {
    switch (tab) {
      case "favoritos":
        const favs = filtered.filter((m) => m.isFavorite);
        return (
          <Section title="Jogos Favoritos" subtitle="Seus jogos marcados como favoritos">
            {loading ? (
              <EmptyState text="Carregando partidas…" />
            ) : error ? (
              <EmptyState text={`Erro: ${error}`} />
            ) : favs.length > 0 ? (
              <ExpandableMatchCard matches={favs} logos={logos} />
            ) : (
              <EmptyState text="Nenhum favorito ainda." />
            )}
          </Section>
        );

      case "ao-vivo":
        return (
          <Section title="Jogos Ao Vivo" subtitle="Acompanhe em tempo real">
            <LiveTab logos={logos} setLogos={() => {}} fetchTeamLogo={async () => null} />
          </Section>
        );

      case "em-alta":
        const trending = filtered.slice(0, 30);
        return (
          <Section title="Em Alta" subtitle="Partidas com maior interesse">
            {loading ? (
              <EmptyState text="Carregando partidas…" />
            ) : error ? (
              <EmptyState text={`Erro: ${error}`} />
            ) : trending.length > 0 ? (
              <ExpandableMatchCard matches={trending} logos={logos} />
            ) : (
              <EmptyState text="Sem partidas em alta no momento." />
            )}
          </Section>
        );

      case "bilhetes":
      default:
        return (
          <Section title="Bilhetes" subtitle="Gerencie seus slips de apostas">
            {tickets.length === 0 ? (
              <EmptyState text="Você ainda não possui bilhetes." />
            ) : (
              <ul className="space-y-4">
                {tickets.map((t) => (
                  <li key={t.id} className="rounded-xl border bg-white dark:bg-neutral-900 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Bilhete #{t.id}</span>
                      <span className="text-sm text-gray-500">{new Date(t.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 text-sm">
                      Aposta: <b>R${t.stake.toFixed(2)}</b> • Retorno potencial:{" "}
                      <b>R${t.potentialReturn.toFixed(2)}</b>
                    </div>
                    <div className="mt-3">
                      <ul className="list-disc pl-5 text-sm">
                        {t.selections.map((s, i) => (
                          <li key={i}>
                            {s.match} — {s.market}: <b>{s.pick}</b> @ {s.odd}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
    }
  }, [tab, filtered, loading, error, tickets, logos]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#014a8f] text-white shadow">
        <div className="flex flex-wrap gap-2">
          <TopTab label="Jogos Favoritos" active={tab === "favoritos"} onClick={() => setTab("favoritos")} />
          <TopTab label="Jogos Ao Vivo" active={tab === "ao-vivo"} onClick={() => setTab("ao-vivo")} />
          <TopTab label="Em Alta" active={tab === "em-alta"} onClick={() => setTab("em-alta")} />
          <TopTab label="Bilhetes" active={tab === "bilhetes"} onClick={() => setTab("bilhetes")} />
        </div>
        <div className="mt-2 sm:mt-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Encontre aqui seu jogo"
            className="w-64 h-10 px-3 py-2 text-sm font-medium text-white placeholder-white bg-[#014a8f] border border-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
      </div>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Partidas do Dia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe aqui os melhores jogos</p>
          <div className="mt-2">
            <Badge>Atualizado em {updatedTime}</Badge>
          </div>
        </div>
        {viewMatches}
      </div>
    </div>
  );
};

function TopTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`text-white ${active ? "bg-white/15 hover:bg-white/20" : "hover:bg-white/10"}`}
    >
      {label}
    </Button>
  );
}

function Section({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
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
