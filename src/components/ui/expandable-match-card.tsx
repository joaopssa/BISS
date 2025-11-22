import React, { useState } from "react";
import type { UIMatch } from "@/data/matchData";
import clubsMap from "@/utils/clubs-map.json";
import { ChevronDown, ChevronUp } from "lucide-react";

// 👉 novo import
import { leagueCountries } from "@/utils/league-countries";
import { getFlagByCountryCode } from "@/utils/getFlagByCountryCode";

// ========= Helpers =========

const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// encontra logo no clubs-map
const findClubLogo = (teamName: string): string | null => {
  const target = normalize(teamName);

  for (const [key, data] of Object.entries(clubsMap)) {
    const normKey = normalize(key);
    if (target.includes(normKey) || normKey.includes(target)) {
      return data.logo ? data.logo : null;
    }
  }

  return null;
};

const SafeOdd: React.FC<{ value?: number | null }> = ({ value }) => {
  if (value == null || Number.isNaN(value)) return <span>-</span>;
  return (
    <span className="font-semibold text-gray-800 dark:text-gray-100">
      {Number(value).toFixed(2)}
    </span>
  );
};

// ========= Componente principal =========
export default function ExpandableMatchCard({ matches, onSelectOdd }) {
  const [openId, setOpenId] = useState<string | number | null>(null);

  const toggleExpand = (id: string | number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {matches.map((m) => {
        const isOpen = openId === m.id;

        const main: UIMatch["odds"] = m.odds || {
          home: null,
          draw: null,
          away: null,
        };
        const extra = m._extraMarkets || {};
        const hasExtraMarkets = Object.keys(extra).length > 0;
        const logoHome = findClubLogo(m.homeTeam);
        const logoAway = findClubLogo(m.awayTeam);

        // 👉 agora pegamos o countryCode correto
        const leagueCountryCode = leagueCountries[m.competition];
        const leagueFlag = leagueCountryCode
          ? getFlagByCountryCode(leagueCountryCode)
          : null;

        return (
          <div
            key={m.id}
            className="bg-white dark:bg-neutral-900 rounded-xl shadow border border-gray-200 dark:border-neutral-800 overflow-hidden"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex items-center justify-center gap-3">
                  {/* Home */}
                  <div className="flex items-center gap-2">
                    {logoHome && (
                      <img
                        src={logoHome}
                        alt={m.homeTeam}
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {m.homeTeam}
                    </span>
                  </div>

                  <span className="text-gray-500 font-medium">x</span>

                  {/* Away */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {m.awayTeam}
                    </span>
                    {logoAway && (
                      <img
                        src={logoAway}
                        alt={m.awayTeam}
                        className="w-5 h-5 object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Liga + Bandeira */}
                <div className="mt-1 text-xs text-gray-500 text-center flex items-center gap-1 justify-center">
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

              {hasExtraMarkets && (
                <button
                  className="p-2 hover:bg-gray-50 rounded-full transition ml-2"
                  onClick={() => toggleExpand(m.id)}
                >
                  {isOpen ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </button>
              )}
            </div>

            {/* Mercado principal 1X2 */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-100">
              {[
                { label: "1", val: main.home },
                { label: "X", val: main.draw },
                { label: "2", val: main.away },
              ].map(({ label, val }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (typeof val === "number" && onSelectOdd) {
                      onSelectOdd({
                        matchId: m.id,
                        homeTeam: m.homeTeam,
                        awayTeam: m.awayTeam,
                        competition: m.competition,
                        market: "1X2",
                        selection: label,
                        odd: val,
                      });
                    }
                  }}
                  className="p-3 flex flex-col items-center hover:bg-gray-50 transition"
                >
                  <span className="font-semibold text-gray-700">{label}</span>
                  <SafeOdd value={val} />
                </button>
              ))}
            </div>

            {/* Mercados adicionais */}
            {isOpen && Object.keys(extra).length > 0 && (
              <div className="p-4 border-t border-gray-100 text-sm text-gray-700 space-y-4">
                <div className="border-b border-gray-200 pb-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Mercados adicionais
                  </h3>
                  <p className="text-xs text-gray-500">
                    Explore mais opções de apostas (Over/Under, Ambas Marcam, etc)
                  </p>
                </div>

                {Object.entries(extra).map(([market, options]) => (
                  <div key={market}>
                    <p className="font-semibold mb-1 text-gray-800 dark:text-gray-200">
                      {market}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(options as Record<string, number | null>)
                        .filter(([_, val]) => val != null)
                        .map(([sel, val]) => (
                          <button
                            key={sel}
                            onClick={() =>
                              onSelectOdd &&
                              onSelectOdd({
                                matchId: m.id,
                                homeTeam: m.homeTeam,
                                awayTeam: m.awayTeam,
                                competition: m.competition,
                                market,
                                selection: sel,
                                odd: val!,
                              })
                            }
                            className="border rounded-lg py-2 text-center hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                          >
                            <span className="block font-medium text-gray-700 dark:text-gray-200">
                              {sel}
                            </span>
                            <SafeOdd value={val} />
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
