"use client";

import React, { useEffect, useMemo, useState } from "react";
import ExpandableMatchCard from "../ui/expandable-match-card";
import { SportSelector } from "./SportSelector";
import LiveTab from "./LiveTab";
import { useUpcomingData } from "../../data/matchData";
import type { UIMatch } from "../../data/matchData";
import { fetchTeamLogo } from "./services/teamLogoService";
import { Button } from "../ui/button";

type UIMatchWithMeta = UIMatch & {
  sport?: string;
  popularity?: number;
};

type Ticket = {
  id: string;
  createdAt: string;
  stake: number;
  potentialReturn: number;
  selections: Array<{ match: string; market: string; pick: string; odd: number }>;
};

type TabKey = "favoritos" | "ao-vivo" | "em-alta" | "bilhetes";

const PER_PAGE = 10;

export const HomeScreen: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState("futebol");
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<TabKey>("favoritos");
  const [query, setQuery] = useState("");
  const [tickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);

  // resetar página ao trocar aba ou filtros
  useEffect(() => {
    setPage(1);
  }, [tab, query, selectedSport]);

  const {
    matches: upcoming,
    loading: loadingUpcoming,
    error: errorUpcoming,
  } = useUpcomingData();

  // buscar logos
  useEffect(() => {
    const run = async () => {
      if (!upcoming?.length) return;
      const unique = new Set<string>();
      (upcoming as UIMatch[]).forEach((m) => {
        if (m.homeTeam) unique.add(m.homeTeam.trim());
        if (m.awayTeam) unique.add(m.awayTeam.trim());
      });
      const entries = await Promise.all(
        [...unique].map(async (team) => [team, await fetchTeamLogo(team)] as const)
      );
      setLogos((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    };
    run();
  }, [upcoming]);

  // filtro por esporte e busca
  const filtered: UIMatchWithMeta[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (upcoming as UIMatchWithMeta[]).filter((m) => {
      const sportOf = (m.sport ?? "futebol").toLowerCase();
      const sportOk = !selectedSport || sportOf === selectedSport.toLowerCase();
      const textOk =
        !q ||
        [m.homeTeam, m.awayTeam]
          .filter(Boolean)
          .some((t) => String(t).toLowerCase().includes(q));
      return sportOk && textOk;
    });
  }, [query, selectedSport, upcoming]);

  // paginação
  function paginate<T>(arr: T[], pageNum: number, perPage: number) {
    const start = (pageNum - 1) * perPage;
    return arr.slice(start, start + perPage);
  }

  // views por aba
  const viewMatches = useMemo(() => {
    switch (tab) {
      case "favoritos": {
        // até implementar favoritos de verdade, mostramos os próximos jogos filtrados
        const upcomingList = filtered as UIMatchWithMeta[];
        const totalPages = Math.max(1, Math.ceil(upcomingList.length / PER_PAGE));
        const pageItems = paginate(upcomingList, page, PER_PAGE);

        return (
          <Section title="Próximos Jogos" subtitle="Partidas que ainda não começaram">
            {loadingUpcoming ? (
              <EmptyState text="Carregando partidas…" />
            ) : errorUpcoming ? (
              <EmptyState text={`Erro: ${errorUpcoming}`} />
            ) : upcomingList.length > 0 ? (
              <>
                <ExpandableMatchCard matches={pageItems} logos={logos} />
                <Paginator
                  page={page}
                  totalPages={totalPages}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </>
            ) : (
              <EmptyState text="Não há próximos jogos no momento." />
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
        const sorted: UIMatchWithMeta[] = [...filtered].sort(
          (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
        );
        const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
        const pageItems = paginate(sorted, page, PER_PAGE);
        return (
          <Section title="Em Alta" subtitle="Partidas com maior interesse">
            {loadingUpcoming ? (
              <EmptyState text="Carregando partidas…" />
            ) : errorUpcoming ? (
              <EmptyState text={`Erro: ${errorUpcoming}`} />
            ) : sorted.length > 0 ? (
              <>
                <ExpandableMatchCard matches={pageItems} logos={logos} />
                <Paginator
                  page={page}
                  totalPages={totalPages}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </>
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
                  <li
                    key={t.id}
                    className="rounded-xl border bg-white dark:bg-neutral-900 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Bilhete #{t.id}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
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
  }, [tab, filtered, logos, tickets, loadingUpcoming, errorUpcoming, page]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* topo */}
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

      {/* conteúdo */}
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Partidas do Dia
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            IA analisou 47 partidas hoje
          </p>
        </div>

        <SportSelector selectedSport={selectedSport} onSportChange={setSelectedSport} />

        {viewMatches}
      </div>
    </div>
  );
};

/* -------------------- Auxiliares -------------------- */

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
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
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

function Paginator({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button variant="outline" disabled={page <= 1} onClick={onPrev}>
        Anterior
      </Button>
      <span className="text-sm text-gray-600 dark:text-gray-300">
        Página {page} de {totalPages}
      </span>
      <Button variant="outline" disabled={page >= totalPages} onClick={onNext}>
        Próxima
      </Button>
    </div>
  );
}
