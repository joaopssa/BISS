import * as React from "react";

type Props = {
  match: {
    id: string | number;
    homeTeam: string;
    awayTeam: string;
    competition: string;
    date: string;
    time: string;
    live?: { status?: string; minute?: number; score?: { home?: number; away?: number } };
    logos?: { home?: string; away?: string };
  };
  logos?: Record<string, string>;
};

export default function LiveMatchCard({ match, logos = {} }: Props) {
  const s = String(match.live?.status || "").toUpperCase();
  const minute = typeof match.live?.minute === "number" ? `${match.live?.minute}'` : s || "";
  const homeScore = match.live?.score?.home ?? "-";
  const awayScore = match.live?.score?.away ?? "-";

  const homeLogo = match.logos?.home || logos[match.homeTeam];
  const awayLogo = match.logos?.away || logos[match.awayTeam];

  return (
    <div className="rounded-xl border bg-white dark:bg-neutral-900 p-4 mb-3">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Competição</span>
        <span>{match.date} • {match.time}</span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200">
          {minute}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 items-center gap-3">
        <div className="col-span-2 flex items-center gap-3">
          {homeLogo ? <img src={homeLogo} className="h-6 w-6 rounded-full" /> : <div className="h-6 w-6 rounded-full bg-gray-200" />}
          <div className="font-medium">{match.homeTeam}</div>
        </div>

        <div className="col-span-1 text-center font-extrabold text-xl">
          {homeScore} <span className="text-gray-400">x</span> {awayScore}
        </div>

        <div className="col-span-2 flex items-center gap-3 justify-end">
          <div className="font-medium text-right">{match.awayTeam}</div>
          {awayLogo ? <img src={awayLogo} className="h-6 w-6 rounded-full" /> : <div className="h-6 w-6 rounded-full bg-gray-200" />}
        </div>
      </div>
    </div>
  );
}
