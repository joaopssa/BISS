// src/utils/loadPlayers.ts
import clubsMap from "@/utils/clubs-map.json";
import { getLocalLogo } from "@/utils/getLocalLogo";

export type PlayerRow = {
  player_name: string;
  club_name: string;
  json_club: string;
  league_name: string;
};

export async function loadPlayersFromCSV(): Promise<PlayerRow[]> {
  const resp = await fetch("http://localhost:3001/api/players/csv");
  const text = await resp.text();

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = lines[0].split(",");

  const rows: PlayerRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");

    rows.push({
      player_name: cols[0],
      club_name: cols[1],
      json_club: cols[2],
      league_name: cols[3],
    });
  }

  return rows;
}

// Converte PlayerRow para PlayerOpt que o componente usa
export function convertToPlayerOpt(rows: PlayerRow[]) {
  return rows.map((r) => {
    const clubInfo = clubsMap[r.json_club];
    const logo = clubInfo ? getLocalLogo(clubInfo.logo) : null;

    return {
      id: `${r.player_name}-${r.json_club}`,
      name: r.player_name,
      club: r.json_club,
      logo,
      league: r.league_name,
    };
  });
}
