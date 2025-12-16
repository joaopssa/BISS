import React, { useState } from "react";
import { ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import clubsMap from "@/utils/clubs-map.json";
import { leagueCountries } from "@/utils/league-countries";
import { getFlagByCountryCode } from "@/utils/getFlagByCountryCode";

const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const findClubLogo = (name: string) => {
  const target = normalize(name);
  for (const [key, val] of Object.entries(clubsMap)) {
    if (normalize(key) === target) return val.logo;
  }
  return null;
};

const SafeOdd = ({ value }: { value: number }) => {
  if (value == null || Number.isNaN(value)) return <span>-</span>;
  return (
    <span className="mt-1 block text-lg font-bold text-[#0a2a5e] dark:text-white">
      {Number(value).toFixed(2)}
    </span>
  );
};

export default function ExpandableMatchCard({
  matches,
  onSelectOdd,
  onSelectHistory,
}) {
  const [openId, setOpenId] = useState<number | string | null>(null);

  const toggleExpand = (id: number | string) =>
    setOpenId(openId === id ? null : id);

  return (
    <div className="space-y-6">
      {matches.map((m) => {
        const isOpen = openId === m.id;

        const logoHome = findClubLogo(m.homeTeam);
        const logoAway = findClubLogo(m.awayTeam);

        const leagueCode = leagueCountries[m.competition];
        const leagueFlag = leagueCode ? getFlagByCountryCode(leagueCode) : null;

        const hasExtra =
          m._extraMarkets && Object.keys(m._extraMarkets).length > 0;

        const hasH2hButton =
          m.hasH2H === true ||
          (m.homeTeam && m.awayTeam && m.competition); // fallback seguro

        return (
          <div
            key={m.id}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow border border-gray-200 dark:border-neutral-700 overflow-hidden"
          >
            {/* ================= HEADER ================= */}
            <div className="flex items-center justify-between px-5 py-4">

              {/* ==== ESQUERDA — HISTÓRICO ==== */}
              <div className="flex items-center gap-2">
                {hasH2hButton && (
                  <button
                    onClick={() =>
                      onSelectHistory({
                        homeTeam: m.homeTeam,
                        awayTeam: m.awayTeam,
                        competition: m.competition,
                      })
                    }
                    title="Histórico do Confronto"
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition shadow-sm"
                  >
                    <BarChart2 size={18} className="text-gray-600" />
                  </button>
                )}
              </div>

              {/* ===== CENTRO DO HEADER ===== */}
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center gap-4">

                  {/* LOGO HOME */}
                  <div className="flex items-center gap-2">
                    {logoHome && (
                      <img
                        src={logoHome}
                        className="h-6 w-auto object-contain"
                      />
                    )}
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {m.homeTeam}
                    </span>
                  </div>

                  <span className="text-gray-500 font-semibold">x</span>

                  {/* LOGO AWAY */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {m.awayTeam}
                    </span>
                    {logoAway && (
                      <img
                        src={logoAway}
                        className="h-6 w-auto object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Subinfo */}
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  {leagueFlag && (
                    <img
                      src={leagueFlag}
                      className="w-4 h-4 object-contain"
                    />
                  )}
                  <span>
                    {m.competition} • {m.date} • {m.time}
                  </span>
                </div>
              </div>

              {/* ==== DIREITA — EXPANDIR ==== */}
              <div className="flex items-center gap-2">
                {hasExtra && (
                  <button
                    onClick={() => toggleExpand(m.id)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
                  >
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                )}
              </div>
            </div>

            {/* ===================== ODDS ===================== */}
            <div className="grid grid-cols-3 border-t border-gray-200 dark:border-neutral-700">
              {[
                { label: "1", val: m.odds?.home },
                { label: "X", val: m.odds?.draw },
                { label: "2", val: m.odds?.away },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() =>
                    onSelectOdd({
                      matchId: m.id,
                      homeTeam: m.homeTeam,
                      awayTeam: m.awayTeam,
                      competition: m.competition,
                      market: "1X2",
                      selection: opt.label,
                      odd: opt.val,
                    })
                  }
                  className="
                    flex flex-col items-center justify-center py-4 
                    hover:bg-gray-50 dark:hover:bg-neutral-800 
                    transition font-semibold
                  "
                >
                  <span className="text-xs text-gray-500">{opt.label}</span>
                  <SafeOdd value={opt.val} />
                </button>
              ))}
            </div>

            {/* ===================== MERCADOS EXTRAS ===================== */}
            {isOpen && hasExtra && (
              <div className="p-5 space-y-5 border-t border-gray-200 dark:border-neutral-700">
                {Object.entries(m._extraMarkets).map(([market, options]) => {
                  // detecta mercado do tipo "Total de Gols (2.5)" e separa a linha
                  const totMatch = market.match(/^(Total de Gols)\s*\(([^)]+)\)/i);
                  const baseMarket = totMatch ? totMatch[1] : market;
                  const linha = totMatch ? totMatch[2] : null;
                  return (
                    <div key={market}>
                      <p className="font-semibold mb-2">{market}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(options).map(([sel, val]) => (
                          <button
                            key={sel}
                            onClick={() =>
                              onSelectOdd({
                                matchId: m.id,
                                homeTeam: m.homeTeam,
                                awayTeam: m.awayTeam,
                                competition: m.competition,
                                market: baseMarket,
                                selection: sel,
                                odd: val,
                                linha: linha,
                              })
                            }
                            className="
                              border rounded-lg p-3 text-center 
                              hover:bg-gray-50 dark:hover:bg-neutral-800 
                              transition
                            "
                          >
                            <span className="block font-medium">{sel}</span>
                            <SafeOdd value={val} />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
