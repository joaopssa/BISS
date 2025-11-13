import { normalize } from "./normalize";
import { leagueMap } from "@/data/leagueMap";

export function resolveLeagueName(userLeague: string): string | null {
  const norm = normalize(userLeague);

  for (const [key, value] of Object.entries(leagueMap)) {
    if (normalize(key) === norm) {
      return value;
    }
  }

  return null; // não encontrou mapeamento
}
