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
  try {
    const resp = await fetch("/data/players/players_by_club_2025.csv");
    
    if (!resp.ok) {
      console.error("Erro ao buscar CSV:", resp.status);
      return [];
    }
    
    const text = await resp.text();
    const rows: PlayerRow[] = [];
    
    // Parse CSV com suporte a quoted fields
    const lines = text.split("\n");
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parser básico de CSV que suporta aspas
      const cols = parseCSVLine(line);
      
      if (cols.length >= 4) {
        const playerName = cols[0].trim();
        const clubName = cols[1].trim();
        const jsonClub = cols[2].trim();
        const leagueName = cols[3].trim();
        
        // Validar que os campos têm conteúdo
        if (playerName && clubName && jsonClub && leagueName) {
          rows.push({
            player_name: playerName,
            club_name: clubName,
            json_club: jsonClub,
            league_name: leagueName,
          });
        }
      }
    }

    console.log(`Carregados ${rows.length} jogadores do CSV`);
    return rows;
  } catch (error) {
    console.error("Erro ao carregar CSV de jogadores:", error);
    return [];
  }
}

// Função auxiliar para fazer parsing de linhas CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
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
