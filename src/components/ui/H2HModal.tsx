import React, { useState } from "react";
import clubsMap from "@/utils/clubs-map.json";

function getLogo(team: string) {
  return clubsMap[team]?.logo || null;
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
}) {
  const [showAll, setShowAll] = useState(false);

  if (!isOpen) return null;

  const visibleMatches = showAll ? matches : matches.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      
      {/* Modal container com scroll interno */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl 
                      max-h-[85vh] overflow-y-auto relative">

        {/* 🔥 Camada superior sólida (tapa escudos atrás) */}
        <div className="sticky top-0 h-4 bg-white dark:bg-neutral-900 z-40"></div>

        {/* Header fixo */}
        <div className="sticky top-4 z-40 bg-white dark:bg-neutral-900 pb-3 px-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Histórico do Confronto</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-black">
              Fechar
            </button>
          </div>
        </div>

        {/* Conteúdo interno */}
        <div className="p-6 pt-2">

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
              {/* Logos + estatísticas */}
              <div className="flex items-center justify-center gap-12 mb-6 mt-4">
                <div className="text-center">
                  {logoHome && <img src={logoHome} className="w-14 mx-auto" />}
                  <p className="font-semibold">{homeTeam}</p>
                  <p className="text-xl font-bold">{stats.homeWins}</p>
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold">Empates</p>
                  <p className="text-xl font-bold">{stats.draws}</p>
                </div>

                <div className="text-center">
                  {logoAway && <img src={logoAway} className="w-14 mx-auto" />}
                  <p className="font-semibold">{awayTeam}</p>
                  <p className="text-xl font-bold">{stats.awayWins}</p>
                </div>
              </div>

              {/* Gols médios */}
              <div className="flex justify-around mb-6 text-center">
                <div>
                  <p className="text-xs text-gray-500">
                    Gols médios de {homeTeam}
                  </p>
                  <p className="text-lg font-bold">
                    {stats.avgHomeGoals.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Gols médios de {awayTeam}
                  </p>
                  <p className="text-lg font-bold">
                    {stats.avgAwayGoals.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Últimos confrontos */}
              <p className="font-semibold mb-2">Últimos confrontos</p>

              <div className="space-y-2">
                {visibleMatches.map((m, i) => {
                  const lh = getLogo(m.home);
                  const la = getLogo(m.away);

                  return (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-gray-100 dark:bg-neutral-800"
                    >
                      <div className="text-xs text-gray-500">
                        {m.date} • {m.competition}
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <img
                          src={lh}
                          className="w-6 h-6 object-contain"
                          alt={m.home}
                        />

                        <span className="font-bold text-lg">{m.fullTime}</span>

                        <img
                          src={la}
                          className="w-6 h-6 object-contain"
                          alt={m.away}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão Ver mais */}
              {matches.length > 5 && (
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
