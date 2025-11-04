// src/components/ui/expandable-match-card.tsx
import React, { useState } from "react";
import type { UIMatch } from "@/data/matchData";

type Props = {
  matches: UIMatch[];
  logos?: Record<string, string>;
};

const SafeOdd: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value == null || Number.isNaN(value)) return <span>-</span>;
  return <span>{Number(value).toFixed(2)}</span>;
};

export default function ExpandableMatchCard({ matches }: Props) {
  const [openId, setOpenId] = useState<string | number | null>(null);

  return (
    <div className="space-y-4">
      {matches.map((m) => {
        const isOpen = openId === m.id;
        const home = m.homeTeam;
        const away = m.awayTeam;

        return (
          <div
            key={String(m.id)}
            className="rounded-2xl border bg-white dark:bg-neutral-900 shadow-sm"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{m.competition}</span>
                <span>
                  {m.date} • {m.time}
                </span>
              </div>

              {/* Times + Odds 1/X/2 */}
              <div className="mt-3 grid grid-cols-3 items-end text-center gap-3">
                <div className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {home}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">x</div>
                <div className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {away}
                </div>

                <div className="rounded-xl border px-4 py-3 text-center mt-2">
                  <div className="text-xs uppercase text-gray-500 mb-1">1</div>
                  <SafeOdd value={m.odds?.home} />
                </div>
                <div className="rounded-xl border px-4 py-3 text-center mt-2">
                  <div className="text-xs uppercase text-gray-500 mb-1">X</div>
                  <SafeOdd value={m.odds?.draw} />
                </div>
                <div className="rounded-xl border px-4 py-3 text-center mt-2">
                  <div className="text-xs uppercase text-gray-500 mb-1">2</div>
                  <SafeOdd value={m.odds?.away} />
                </div>
              </div>

              {/* Botão de detalhes */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => setOpenId(isOpen ? null : m.id)}
                >
                  {isOpen ? "^ Ocultar" : "> Detalhes"}
                </button>
              </div>
            </div>

            {/* Mercados adicionais */}
            {isOpen && (
              <div className="p-4 border-t space-y-4">
                {m._extraMarkets && Object.keys(m._extraMarkets).length > 0 ? (
                  Object.entries(m._extraMarkets).map(([marketName, options]) => {
                    // oculta mercados completamente vazios
                    const validOptions = Object.entries(
                      options as Record<string, number | null>
                    ).filter(([_, v]) => v != null && !Number.isNaN(v));

                    if (validOptions.length === 0) return null;

                    return (
                      <div key={marketName}>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                          {marketName}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {validOptions.map(([label, odd]) => (
                            <div
                              key={label}
                              className="rounded-xl border px-4 py-3 text-center"
                            >
                              <div className="text-[10px] uppercase text-gray-500 mb-1">
                                {label}
                              </div>
                              <SafeOdd value={odd} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500">
                    Nenhum mercado extra disponível.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
