"use client";

import React, { useEffect, useMemo, useState } from "react";
import ExpandableMatchCard from "@/components/ui/expandable-match-card";
import LiveTab from "@/components/app/LiveTab";
import { SportSelector } from "@/components/app/SportSelector";
import { useUpcomingData } from "@/data/matchData";
import { fetchTeamLogo } from "@/components/app/services/teamLogoService";
import { Button } from "@/components/ui/button";

type UIMatch = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  date: string;
  competition: string;
  odds: { home: number; draw: number; away: number };
  isFavorite?: boolean;
  sport?: string;
  popularity?: number;
  live?: { status?: string; minute?: number; score?: { home?: number; away?: number } };
  logos?: { home?: string; away?: string };
  _dt?: string | Date;
};

type Ticket = {
  id: string;
  createdAt: string;
  stake: number;
  potentialReturn: number;
  selections: Array<{ match: string; market: string; pick: string; odd: number }>;
};

export const HomeScreen: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState("futebol");
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"favoritos" | "ao-vivo" | "em-alta" | "bilhetes">("favoritos");
  const [query, setQuery] = useState("");
  const [tickets] = useState<Ticket[]>([]);

  // 🔸 Busca jogos do dia (sem filtro adicional de “não iniciados”)
  const { matches: upcoming, loading: loadingUpcoming, error: errorUpcoming } = useUpcomingData();

  // Carrega logos para times listados
  useEffect(() => {
    (async () => {
      if (!upcoming?.length) return;
      const unique = new Set<string>();
      upcoming.forEach((m) => {
        if (m.homeTeam) unique.add(m.homeTeam.trim());
        if (m.awayTeam) unique.add(m.awayTeam.trim());
      });
      const entries = await Promise.all(
        [...unique].map(async (team) => [team, await fetchTeamLogo(team)] as const)
      );
      setLogos((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [upcoming]);

  // filtro por esporte + busca (NÃO exclui partidas já iniciadas/finalizadas)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (upcoming ?? []).slice(); // cópia

    return list.filter((m) => {
      const sportOk = !selectedSport || (m.sport ?? "futebol") === selectedSport;
      const textOk =
        !q ||
        [m.homeTeam, m.awayTeam]
          .filter(Boolean)
          .some((t) => String(t).toLowerCase().includes(q));
      return sportOk && textOk;
    });
  }, [query, selectedSport, upcoming]);

  const viewMatches = useMemo(() => {
    switch (tab) {
      case "favoritos": {
        const favorites = filtered.filter((m) => m.isFavorite);
        return (
          <Section title="Jogos Favoritos" subtitle="Seus jogos marcados como favoritos">
            {loadingUpcoming ? (
              <EmptyState text="Carregando partidas…" />
            ) : errorUpcoming ? (
              <EmptyState text={`Erro: ${errorUpcoming}`} />
            ) : favorites.length > 0 ? (
              <ExpandableMatchCard matches={favorites as any} logos={logos} />
            ) : (
              <EmptyState text="Nenhum favorito ainda. Marque partidas como favoritas para vê-las aqui." />
            )}
          </Section>
        );
      }

      case "ao-vivo": {
        return (
          <Section title="Jogos Ao Vivo" subtitle="Acompanhe em tempo real">
            <LiveTab logos={logos} setLogos={setLogos} fetchTeamLogo={fetchTeamLogo} />
          </Section>
        );
      }

      case "em-alta": {
        const trending = [...filtered]
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
          .slice(0, 10);
        return (
          <Section title="Em Alta" subtitle="Partidas com maior interesse">
            {loadingUpcoming ? (
              <EmptyState text="Carregando partidas…" />
            ) : errorUpcoming ? (
              <EmptyState text={`Erro: ${errorUpcoming}`} />
            ) : trending.length > 0 ? (
              <ExpandableMatchCard matches={trending as any} logos={logos} />
            ) : (
              <EmptyState text="Sem partidas em alta no momento." />
            )}
          </Section>
        );
      }

      case "bilhetes": {
        return (
          <Section title="Bilhetes" subtitle="Gerencie seus slips de apostas">
            {tickets.length === 0 ? (
              <EmptyState
                text="Você ainda não possui bilhetes."
                ctaLabel="Explorar partidas"
                onCta={() => setTab("favoritos")}
              />
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

      default:
        return null;
    }
  }, [tab, filtered, logos, tickets, loadingUpcoming, errorUpcoming]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#014a8f] text-white shadow">
        <div className="flex flex-wrap items-center gap-2">
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
          <p className="text-sm text-gray-500 dark:text-gray-400">IA analisou 47 partidas hoje</p>
        </div>

        <SportSelector selectedSport={selectedSport} onSportChange={setSelectedSport} />

        {viewMatches}
      </div>
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

function EmptyState({
  text,
  ctaLabel,
  onCta,
}: {
  text: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-gray-600 dark:text-gray-300">
      {text}
      {ctaLabel && onCta && (
        <div className="mt-4">
          <Button onClick={onCta}>{ctaLabel}</Button>
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
