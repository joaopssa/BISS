import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import clubsMap from "@/utils/clubs-map.json";
import { leagueCountries } from "@/utils/league-countries";
import { getFlagByCountryCode } from "@/utils/getFlagByCountryCode";
import { getLocalLogo } from "@/utils/getLocalLogo";

const normalize = (str: string) =>
  (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const findClubLogo = (name: string) => {
  const target = normalize(name);
  for (const [key, val] of Object.entries(clubsMap)) {
    if (normalize(key) === target) {
      const p = (val as any).logo;
      return p ? getLocalLogo(p) : null;
    }
  }
  return null;
};


const SafeOdd = ({ value, selected }: { value: number; selected?: boolean }) => {
  if (value == null || Number.isNaN(value)) return <span>-</span>;
  return (
    <span
      className={[
        "mt-1 block text-lg font-bold",
        selected
          ? "text-[#014a8f] dark:text-white"
          : "text-[#0a2a5e] dark:text-white",
      ].join(" ")}
    >
      {Number(value).toFixed(2)}
    </span>
  );
};

// Tipagem mínima do que a gente usa
type BetSelection = {
  matchId: string | number;
  mercado: string;
  selecao: string;
  linha?: string;
};

export default function ExpandableMatchCard({
  matches,
  selections = [],
  onSelectOdd,
  onSelectHistory,
}: {
  matches: any[];
  selections?: BetSelection[];
  onSelectOdd: (p: any) => void;
  onSelectHistory?: (p: any) => void;
}) {
  const [openId, setOpenId] = useState<number | string | null>(null);

  const toggleExpand = (id: number | string) =>
    setOpenId(openId === id ? null : id);

  // index rápido por matchId -> selections daquele jogo
  const byMatch = useMemo(() => {
    const map = new Map<string, BetSelection[]>();
    for (const s of selections || []) {
      const k = String(s.matchId);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [selections]);

  const isSelected = (args: {
    matchId: string | number;
    market: string;
    selection: string;
    linha?: string | null;
  }) => {
    const list = byMatch.get(String(args.matchId)) || [];
    const mkt = normalize(args.market);
    const sel = normalize(args.selection);
    const ln = (args.linha || "").trim();

    return list.some((s) => {
      const smkt = normalize(s.mercado);
      const ssel = normalize(s.selecao);
      const sln = (s.linha || "").trim();

      // compara mercado + seleção + linha (quando existir)
      const sameMarket = smkt === mkt;
      const sameSelection = ssel === sel;

      // se ambos tiverem linha, exige igualdade. Se nenhum tiver, ok.
      const sameLine =
        (ln && sln && ln === sln) ||
        (!ln && !sln);

      return sameMarket && sameSelection && sameLine;
    });
  };

  const baseBtn =
  "relative flex flex-col items-center justify-center py-4 font-semibold transition-all duration-200 cursor-pointer select-none";

  const normalBtn =
  "hover:bg-gray-50 dark:hover:bg-neutral-800 hover:shadow-sm hover:-translate-y-[1px]";


  const selectedBtn =
  "relative bg-gradient-to-b from-[#014a8f]/10 to-white dark:to-neutral-900 " +
  "ring-2 ring-[#014a8f]/35 z-10 " +
  "shadow-md shadow-blue-500/20 " +
  "scale-[1.02]";

  const cardBase =
    "relative rounded-2xl overflow-hidden scroll-mt-24 bg-white dark:bg-neutral-900 transition";

  const cardNormal =
    "border border-[#014a8f]/15 dark:border-neutral-700 shadow-xl shadow-blue-500/10";

  const cardActive =
    "border-2 border-[#014a8f]/45 shadow-2xl shadow-blue-500/25 ring-4 ring-[#014a8f]/10";

  const baseExtraBtn =
  "relative border rounded-lg p-3 text-center transition-all duration-200 cursor-pointer select-none";


  const normalExtraBtn =
  "hover:bg-gray-50 dark:hover:bg-neutral-800 border-gray-200 dark:border-neutral-700 hover:shadow-sm hover:-translate-y-[1px]";


  const selectedExtraBtn =
  "border border-[#014a8f]/40 bg-gradient-to-b from-[#014a8f]/10 to-white " +
  "dark:to-neutral-900 ring-2 ring-[#014a8f]/30 shadow-md shadow-blue-500/15 scale-[1.01]";


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
          m.hasH2H === true || (m.homeTeam && m.awayTeam && m.competition);
        const hasSelection = (byMatch.get(String(m.id)) || []).length > 0;


        return (
          <div
            key={m.id}
            id={`match-${m.id}`}
            data-match-id={m.id}
            className={[cardBase, hasSelection ? cardActive : cardNormal].join(" ")}
>
            {/* brilho sutil estilo “featured” */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />
            {/* ================= HEADER ================= */}
            <div
              className={[
                "flex items-center justify-between px-5 py-4 bg-gradient-to-r transition",
                hasSelection
                  ? "from-[#014a8f]/18 via-white to-emerald-50 dark:from-[#014a8f]/25 dark:via-neutral-900 dark:to-emerald-950/25"
                  : "from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-900 dark:to-emerald-950/20",
              ].join(" ")}
            >
              {/* ==== ESQUERDA — HISTÓRICO ==== */}
              <div className="flex items-center gap-2">
                {hasH2hButton && onSelectHistory && (
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
                      <img src={logoHome} className="h-6 w-auto object-contain" />
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
                      <img src={logoAway} className="h-6 w-auto object-contain" />
                    )}
                  </div>
                </div>

                {/* Subinfo */}
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  {leagueFlag && (
                    <img src={leagueFlag} className="w-4 h-4 object-contain" />
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

            {/* ===================== ODDS 1X2 ===================== */}
            <div className="grid grid-cols-3 border-t border-gray-200 dark:border-neutral-700">
              {[
                { label: "1", val: m.odds?.home },
                { label: "X", val: m.odds?.draw },
                { label: "2", val: m.odds?.away },
              ].map((opt) => {
                const selected = isSelected({
                  matchId: m.id,
                  market: "1X2",
                  selection: opt.label,
                  linha: null,
                });

                const oddNum = Number(opt.val);
                const disabled = !oddNum || Number.isNaN(oddNum);
                return (
                  <button
                    key={opt.label}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;

                      onSelectOdd({
                        matchId: m.id,
                        homeTeam: m.homeTeam,
                        awayTeam: m.awayTeam,
                        competition: m.competition,
                        market: "1X2",
                        selection: opt.label,
                        odd: oddNum,
                      });
                    }}
                    className={[
                      baseBtn,
                      "border-r last:border-r-0 border-gray-200 dark:border-neutral-700",
                      selected ? selectedBtn : normalBtn,
                      disabled ? "opacity-40 cursor-not-allowed hover:shadow-none hover:translate-y-0" : "",
                    ].join(" ")}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#014a8f] shadow-sm" />
                    )}

                    <span className={["text-xs", selected ? "text-[#014a8f] font-bold" : "text-gray-500"].join(" ")}>
                      {opt.label}
                    </span>

                    <SafeOdd value={oddNum} selected={selected} />
                  </button>
                );
              })}
            </div>

            {/* ===================== MERCADOS EXTRAS ===================== */}
            {isOpen && hasExtra && (
              <div className="p-5 space-y-5 border-t border-gray-200 dark:border-neutral-700">
                {Object.entries(m._extraMarkets).map(([market, options]) => {
                  // detecta mercado do tipo "Total de Gols (2.5)" e separa a linha
                  const totMatch = String(market).match(
                    /^(Total de Gols)\s*\(([^)]+)\)/i
                  );
                  const baseMarket = totMatch ? totMatch[1] : String(market);
                  const linha = totMatch ? totMatch[2] : null;

                  return (
                    <div key={market}>
                      <p className="font-semibold mb-2">{String(market)}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(options as any).map(([sel, val]) => {
                          const selected = isSelected({
                            matchId: m.id,
                            market: baseMarket,
                            selection: sel,
                            linha,
                          });
                          const oddNum = Number(val);
                          const disabled = !oddNum || Number.isNaN(oddNum);

                          return (
                            <button
                              key={sel}
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;

                                onSelectOdd({
                                  matchId: m.id,
                                  homeTeam: m.homeTeam,
                                  awayTeam: m.awayTeam,
                                  competition: m.competition,
                                  market: baseMarket,
                                  selection: sel,
                                  odd: oddNum,
                                  linha,
                                });
                              }}
                              className={[
                                baseExtraBtn,
                                selected ? selectedExtraBtn : normalExtraBtn,
                                disabled ? "opacity-40 cursor-not-allowed hover:shadow-none hover:-translate-y-0" : "",
                              ].join(" ")}
                            >
                              {selected && (
                                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#014a8f] shadow-sm" />
                              )}

                              <span className={["block font-medium", selected ? "text-[#014a8f]" : ""].join(" ")}>
                                {sel}
                              </span>

                              <SafeOdd value={oddNum} selected={selected} />
                            </button>
                          );
                        })}
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
