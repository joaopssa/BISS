import React, { useState } from "react";
import clubsMap from "@/utils/clubs-map.json";

function getLogo(team: string) {
  return (clubsMap as any)[team]?.logo || null;
}

export default function H2HModal({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  logoHome,
  logoAway,
  stats,
  matches,
  isLoading,
  error,
}: any) {
  const [showAll, setShowAll] = useState(false);

  if (!isOpen) return null;

  const visibleMatches = showAll ? matches : matches.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
      {/* Modal container (MAIOR) */}
      <div
        className="
          bg-white dark:bg-neutral-900
          rounded-2xl
          w-[min(96vw,980px)]
          max-h-[88vh]
          shadow-2xl
          overflow-hidden
          relative
        "
      >
        {/* Header fixo (limpo) */}
        <div className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
          <div className="flex justify-between items-center px-6 py-4">
            <h2 className="text-lg sm:text-xl font-bold">Histórico do Confronto</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-black">
              Fechar
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll interno */}
        <div className="p-6 pt-4 overflow-y-auto max-h-[calc(88vh-72px)]">
          {/* Loading */}
          {isLoading && (
            <p className="text-center py-6 text-gray-500">Carregando...</p>
          )}

          {/* Erro */}
          {!isLoading && error && (
            <p className="text-center py-4 text-red-500 font-medium">{error}</p>
          )}

          {/* Sem histórico */}
          {!isLoading && !error && !stats && (
            <p className="text-center py-4 text-gray-500">
              Esses clubes ainda não se enfrentaram.
            </p>
          )}

          {/* Com histórico */}
          {!isLoading && stats && (
            <>
              {/* Logos + estatísticas (ALINHADO) */}
              <div className="grid grid-cols-3 items-end gap-6 sm:gap-10 mb-6 mt-2">
                {/* Casa */}
                <div className="text-center flex flex-col items-center justify-end">
                  {/* slot fixo pra alinhar com o bloco do meio */}
                  <div className="h-16 flex items-end justify-center">
                    {logoHome && (
                      <img src={logoHome} className="w-14 h-14 object-contain" />
                    )}
                  </div>
                  <p className="font-semibold mt-2">{homeTeam}</p>
                  <p className="text-3xl sm:text-4xl font-extrabold leading-none mt-1">
                    {stats.homeWins}
                  </p>
                </div>

                {/* Empates */}
                <div className="text-center flex flex-col items-center justify-end">
                  {/* slot fixo pra ficar na mesma altura visual */}
                  <div className="h-16" />
                  <p className="text-sm font-semibold mt-2">Empates</p>
                  <p className="text-3xl sm:text-4xl font-extrabold leading-none mt-1">
                    {stats.draws}
                  </p>
                </div>

                {/* Fora */}
                <div className="text-center flex flex-col items-center justify-end">
                  <div className="h-16 flex items-end justify-center">
                    {logoAway && (
                      <img src={logoAway} className="w-14 h-14 object-contain" />
                    )}
                  </div>
                  <p className="font-semibold mt-2">{awayTeam}</p>
                  <p className="text-3xl sm:text-4xl font-extrabold leading-none mt-1">
                    {stats.awayWins}
                  </p>
                </div>
              </div>

              {/* Gols médios (melhor aproveitamento) */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                <div className="rounded-xl bg-gray-50 dark:bg-neutral-800 p-4">
                  <p className="text-xs text-gray-500">Gols médios de {homeTeam}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stats.avgHomeGoals.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 dark:bg-neutral-800 p-4">
                  <p className="text-xs text-gray-500">Gols médios de {awayTeam}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stats.avgAwayGoals.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Últimos confrontos */}
              <p className="font-semibold mb-2">Últimos confrontos</p>

              <div className="space-y-2">
                {visibleMatches.map((m: any, i: number) => {
                  // MANTIVE EXATAMENTE como era no seu primeiro código
                  const lh = getLogo(m.home);
                  const la = getLogo(m.away);

                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-gray-100 dark:bg-neutral-800"
                    >
                      <div className="text-xs text-gray-500">
                        {m.date} • {m.competition}
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <img
                          src={lh}
                          className="w-7 h-7 object-contain"
                          alt={m.home}
                        />

                        <span className="font-extrabold text-lg sm:text-xl">
                          {m.fullTime}
                        </span>

                        <img
                          src={la}
                          className="w-7 h-7 object-contain"
                          alt={m.away}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão Ver mais */}
              {matches.length > 6 && (
                <button
                  className="mt-4 w-full py-2 text-sm font-semibold text-blue-600 hover:underline"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Mostrar menos" : "Ver todos os confrontos"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
