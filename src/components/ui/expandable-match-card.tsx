import * as React from "react";

export type UIMatch = {
  id: string | number;
  homeTeam: string;
  awayTeam: string;
  time: string;      // "HH:MM"
  date: string;      // "DD/MM/YYYY" (locale)
  competition: string;
  logos?: { home?: string; away?: string };
  live?: { status?: string; minute?: number; score?: { home?: number; away?: number } };
  _dt?: Date;
};

type Props = {
  matches: UIMatch[];
  logos?: Record<string, string>; // dicionário "nome do time" -> url logo
};

function TeamBlock({
  name,
  logo,
  align = "left",
}: {
  name: string;
  logo?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end" : ""}`}>
      {align === "right" ? null : (
        <img
          src={logo || "/placeholder-team.svg"}
          alt={name}
          className="h-8 w-8 rounded-full object-contain bg-white"
          loading="lazy"
        />
      )}
      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</span>
      {align === "right" ? (
        <img
          src={logo || "/placeholder-team.svg"}
          alt={name}
          className="h-8 w-8 rounded-full object-contain bg-white"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

function LiveBadge({ status, minute }: { status?: string; minute?: number }) {
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

export default function ExpandableMatchCard({ matches, logos = {} }: Props) {
  if (!matches?.length) return null;

  return (
    <div className="space-y-4">
      {matches.map((m) => {
        const st = (m.live?.status || "").toUpperCase();
        const isLive = ["1H", "2H", "HT", "ET", "BT", "P"].includes(st);
        const scoreHome = m.live?.score?.home;
        const scoreAway = m.live?.score?.away;

        const homeLogo = m.logos?.home || logos[m.homeTeam];
        const awayLogo = m.logos?.away || logos[m.awayTeam];

        return (
          <article
            key={m.id}
            className="rounded-2xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            {/* Cabeçalho do card */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-800 dark:text-gray-200">{m.competition}</span>
              <span className="opacity-60">•</span>
              <span>{m.date}</span>
              <span className="opacity-60">•</span>
              <span>{m.time}</span>
              <LiveBadge status={st} minute={m.live?.minute} />
            </div>

            {/* Times + centro (VS / placar) */}
            <div className="grid grid-cols-3 items-center gap-3">
              <div className="justify-self-start">
                <TeamBlock name={m.homeTeam} logo={homeLogo} />
              </div>

              <div className="justify-self-center text-center">
                {isLive ? (
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {typeof scoreHome === "number" ? scoreHome : "-"}{" "}
                    <span className="mx-1 text-gray-400 dark:text-gray-500">–</span>{" "}
                    {typeof scoreAway === "number" ? scoreAway : "-"}
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">VS</div>
                )}
              </div>

              <div className="justify-self-end">
                <TeamBlock name={m.awayTeam} logo={awayLogo} align="right" />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
