// src/components/ui/H2HModal.tsx
"use client";

import React, { useMemo, useState } from "react";
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getLogo(team: string) {
  const p = (clubsMap as any)?.[team]?.logo;
  return p ? getLocalLogo(p) : null;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
  logoHome?: string | null;
  logoAway?: string | null;
  stats?: any;
  matches?: any[];
  isLoading?: boolean;
  error?: string | null;
};

export default function H2HModal({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  logoHome,
  logoAway,
  stats,
  matches = [],
  isLoading = false,
  error,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const visibleMatches = useMemo(() => {
    const list = Array.isArray(matches) ? matches : [];
    return showAll ? list : list.slice(0, 6);
  }, [matches, showAll]);

  const hasHistory = !!stats && !isLoading && !error;
  const hasEmpty = !isLoading && !error && !stats;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-5xl w-[94vw] sm:w-full p-0 overflow-hidden">
        {/* Header (padrão do app) */}
        <div className="p-5 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-[#014a8f] text-xl font-extrabold">
              Histórico do Confronto
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-2xl border border-[#014a8f]/25 bg-[#014a8f]/10 px-4 py-1.5 text-sm font-bold text-[#014a8f]">
              {homeTeam} <span className="mx-2 text-[#014a8f]/60">x</span> {awayTeam}
            </span>

            {!isLoading && !error && stats && (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Jogos
                </span>
                <span className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">
                  {Number(stats.totalMatches || matches.length || 0)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[78vh] overflow-auto bg-gray-50/60 dark:bg-neutral-950">
          {/* Loading */}
          {isLoading && (
            <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center text-gray-500">
              Carregando...
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-neutral-900 p-8 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          )}

          {/* Empty */}
          {hasEmpty && (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center text-gray-500 text-sm">
              Esses clubes ainda não se enfrentaram nos dados disponíveis.
            </div>
          )}

          {/* Content */}
          {hasHistory && (
            <div className="space-y-5">
              {/* Placar resumido */}
              <div className="rounded-2xl border border-[#014a8f]/15 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-900 dark:to-emerald-950/20 p-5 shadow-sm">
                <div className="grid grid-cols-3 items-end gap-4 sm:gap-8">
                  {/* Home */}
                  <div className="text-center flex flex-col items-center justify-end">
                    <div className="h-16 flex items-end justify-center">
                      {(logoHome || getLogo(homeTeam)) && (
                        <img
                          src={logoHome || getLogo(homeTeam)!}
                          className="w-14 h-14 object-contain"
                          alt={homeTeam}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                      {homeTeam}
                    </p>
                    <p className="text-3xl sm:text-4xl font-extrabold leading-none mt-1 tabular-nums text-[#0a2a5e] dark:text-white">
                      {Number(stats.homeWins || 0)}
                    </p>
                  </div>

                  {/* Draw */}
                  <div className="text-center flex flex-col items-center justify-end">
                    <div className="h-16" />
                    <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Empates
                    </p>
                    <p className="text-3xl sm:text-4xl font-extrabold leading-none mt-1 tabular-nums text-[#0a2a5e] dark:text-white">
                      {Number(stats.draws || 0)}
                    </p>
                  </div>

                  {/* Away */}
                  <div className="text-center flex flex-col items-center justify-end">
                    <div className="h-16 flex items-end justify-center">
                      {(logoAway || getLogo(awayTeam)) && (
                        <img
                          src={logoAway || getLogo(awayTeam)!}
                          className="w-14 h-14 object-contain"
                          alt={awayTeam}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                      {awayTeam}
                    </p>
                    <p className="text-3xl sm:text-4xl font-extrabold leading-none mt-1 tabular-nums text-[#0a2a5e] dark:text-white">
                      {Number(stats.awayWins || 0)}
                    </p>
                  </div>
                </div>

                {/* Médias */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/70 p-4">
                    <p className="text-xs text-gray-500">Gols médios de {homeTeam}</p>
                    <p className="text-2xl font-extrabold mt-1 tabular-nums text-gray-900 dark:text-white">
                      {Number(stats.avgHomeGoals || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/70 p-4">
                    <p className="text-xs text-gray-500">Gols médios de {awayTeam}</p>
                    <p className="text-2xl font-extrabold mt-1 tabular-nums text-gray-900 dark:text-white">
                      {Number(stats.avgAwayGoals || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Últimos confrontos */}
              <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Últimos confrontos
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Array.isArray(matches) ? matches.length : 0} registro(s)
                    </p>
                  </div>

                  {Array.isArray(matches) && matches.length > 6 && (
                    <Button
                      variant="outline"
                      className="h-9 px-3 text-xs font-semibold"
                      onClick={() => setShowAll((v) => !v)}
                    >
                      {showAll ? "Mostrar menos" : "Ver todos"}
                    </Button>
                  )}
                </div>

                {visibleMatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-gray-50/60 dark:bg-neutral-950 px-4 py-8 text-center text-gray-500 text-sm">
                    Nenhum confronto disponível.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleMatches.map((m: any, i: number) => {
                      const lh = getLogo(m.home) || logoHome || null;
                      const la = getLogo(m.away) || logoAway || null;

                      return (
                        <div
                          key={i}
                          className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40 p-3 sm:p-4"
                        >
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {m.date} • {m.competition}
                          </div>

                          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            {/* ESQUERDA (Casa) */}
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={lh}
                                className="w-7 h-7 object-contain shrink-0"
                                alt={m.home}
                              />
                              <span className="min-w-0 truncate font-semibold text-sm text-gray-900 dark:text-white">
                                {m.home}
                              </span>
                            </div>

                            {/* PLACAR (Sempre no centro, largura fixa) */}
                            <span
                              className="
                                justify-self-center
                                inline-flex items-center justify-center
                                w-16 h-9
                                rounded-xl
                                border border-gray-200 dark:border-neutral-700
                                bg-white dark:bg-neutral-900
                                text-sm font-extrabold tabular-nums
                                text-[#0a2a5e] dark:text-white
                              "
                            >
                              {m.fullTime}
                            </span>

                            {/* DIREITA (Fora) */}
                            <div className="flex items-center justify-end gap-2 min-w-0">
                              <span className="min-w-0 truncate font-semibold text-sm text-gray-900 dark:text-white">
                                {m.away}
                              </span>
                              <img
                                src={la}
                                className="w-7 h-7 object-contain shrink-0"
                                alt={m.away}
                              />
                            </div>
                          </div>


                          {m.halfTime ? (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Intervalo: <span className="font-semibold">{m.halfTime}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer (padrão Histórico) */}
        <div className="p-4 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end bg-white dark:bg-neutral-900">
          <Button className="bg-[#014a8f] hover:bg-[#003b70] text-white h-9" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
