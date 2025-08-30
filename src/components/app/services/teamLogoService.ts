const API_KEY = '58bfaee3bd005386cb021cf4dde184e8';
const BASE_URL = 'https://v3.football.api-sports.io/teams';

const logoCache: Record<string, string> = {};

export const fetchTeamLogo = async (teamName: string): Promise<string | null> => {
  if (logoCache[teamName]) return logoCache[teamName];

  try {
    const response = await fetch(`${BASE_URL}?search=${encodeURIComponent(teamName)}`, {
      headers: {
        'x-apisports-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error('Erro ao buscar logo do time:', response.status);
      return null;
    }

    const data = await response.json();
    const team = data.response?.[0];
    const logo = team?.team?.logo ?? null;
    if (logo) logoCache[teamName] = logo;
    return logo;
  } catch (error) {
    console.error('Erro na chamada à API-Football:', error);
    return null;
  }
};
