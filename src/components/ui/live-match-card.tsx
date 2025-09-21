import * as React from "react";

export type LiveUIMatch = {
  id: string | number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  date: string;   // "DD/MM/YYYY"
  time: string;   // "HH:MM"
  logos?: { home?: string; away?: string };
  live?: {
    status?: string;                    // "1H", "2H", "HT", "ET", "P", "NS"...
    minute?: number;                    // 0..120
    score?: { home?: number; away?: number };
  };
  _dt?: Date;
};

type Props = {
  matches: LiveUIMatch[];
  logos?: Record<string, string>; // fallback: dicionário "time" -> url
};

function StatusPill({ status, minute }: { status?: string; minute?: number }) {
  const st = (status || "").toUpperCase();
  const isLive = ["1H", "2H", "HT", "ET", "BT", "P"].includes(st);
  const text = isLive ? (typeof minute === "number" ? `${minute}'` : st || "LIVE") : st || "NS";
  const color = isLive ? "bg-red-500" : "bg-gray-400";
  return (
    <span className={`ml-2 inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold text-white ${color}`}>
      {text}
    </span>
  );
}

function Team({ name, logo, align = "left" }: { name: string; logo?: string; align?: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end" : ""}`}>
      {align === "right" ? null : (
        <img
          src={logo || "/placeholder-team.svg"}
          alt={name}
          className="h-9 w-9 rounded-full object-contain bg-white"
          loading="lazy"
        />
      )}
      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</span>
      {align === "right" ? (
        <img
          src={logo || "/placeholder-team.svg"}
          alt={name}
          className="h-9 w-9 rounded-full object-contain bg-white"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

export default function LiveMatchCard({ matches, logos = {} }: Props) {
  if (!matches?.length) return null;

  return (
    <div className="space-y-4">
      {matches.map((m) => {
        const st = (m.live?.status || "").toUpperCase();
        const scoreH = typeof m.live?.score?.home === "number" ? m.live!.score!.home! : "-";
        const scoreA = typeof m.live?.score?.away === "number" ? m.live!.score!.away! : "-";

        const homeLogo = m.logos?.home || logos[m.homeTeam];
        const awayLogo = m.logos?.away || logos[m.awayTeam];

        return (
          <article
            key={m.id}
            className="rounded-2xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-800 dark:text-gray-200">{m.competition}</span>
              <span className="opacity-60">•</span>
              <span>{m.date}</span>
              <span className="opacity-60">•</span>
              <span>{m.time}</span>
              <StatusPill status={st} minute={m.live?.minute} />
            </div>

            <div className="grid grid-cols-3 items-center gap-3">
              <div className="justify-self-start">
                <Team name={m.homeTeam} logo={homeLogo} />
              </div>

              {/* PLACAR CENTRAL GRANDE */}
              <div className="justify-self-center text-center">
                <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none">
                  {scoreH}
                  <span className="mx-2 text-gray-400 dark:text-gray-500">X</span>
                  {scoreA}
                </div>
                {/* status embaixo, se quiser reforçar */}
                {/* <div className="mt-1 text-xs text-gray-500">{st}</div> */}
              </div>

              <div className="justify-self-end">
                <Team name={m.awayTeam} logo={awayLogo} align="right" />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
