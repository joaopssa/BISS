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
        const dc = m._oddsDetail?.DuplaChance || {};
        const hasDC = ["1X", "12", "X2"].some((k) => typeof (dc as any)[k] === "number");

        // nomes (sem mexer nos dados), apenas apresentação com "x"
        const home = m.homeTeam;
        const away = m.awayTeam;

        return (
          <div key={String(m.id)} className="rounded-2xl border bg-white dark:bg-neutral-900 shadow-sm">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{m.competition}</span>
                <span>{m.date} • {m.time}</span>
              </div>

              {/* Nomes alinhados sobre 1 / X / 2 */}
              <div className="mt-3 grid grid-cols-3 items-end text-center gap-3">
                <div className="text-base font-semibold text-gray-800 dark:text-gray-100">{home}</div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">x</div>
                <div className="text-base font-semibold text-gray-800 dark:text-gray-100">{away}</div>

                {/* Odds 1/X/2 */}
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

              {/* Link de detalhes à ESQUERDA, azul, com > / ^ */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => setOpenId(isOpen ? null : m.id)}
                >
                  {isOpen ? "^ Ocultar" : "> Detalhes"}
                </button>
                <div />
              </div>
            </div>

            {isOpen && (
              <div className="p-4 border-t">
                {hasDC ? (
                  <>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Dupla Chance</div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-xl border px-4 py-3 text-center">
                        <div className="text-[10px] uppercase text-gray-500 mb-1">1X</div>
                        <SafeOdd value={dc["1X"] as number | null | undefined} />
                      </div>
                      <div className="rounded-xl border px-4 py-3 text-center">
                        <div className="text-[10px] uppercase text-gray-500 mb-1">12</div>
                        <SafeOdd value={dc["12"] as number | null | undefined} />
                      </div>
                      <div className="rounded-xl border px-4 py-3 text-center">
                        <div className="text-[10px] uppercase text-gray-500 mb-1">X2</div>
                        <SafeOdd value={dc["X2"] as number | null | undefined} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-500">Nenhum mercado extra disponível.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
