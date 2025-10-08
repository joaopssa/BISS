// src/services/footballRapid.ts
import api from "@/services/api";

export const rapidLeagues = () => api.get("/football/rapid/leagues");
export const rapidLeaguesWithCountries = () => api.get("/football/rapid/leagues-with-countries");
export const rapidLeagueLogo = (leagueId: string | number) =>
  api.get(`/football/rapid/league/${leagueId}/logo`);
export const rapidTeams = (leagueId: string | number, mode: "all"|"home"|"away" = "all") =>
  api.get(`/football/rapid/teams/${leagueId}`, { params: { mode } });
export const rapidTeamLogo = (teamId: string | number) =>
  api.get(`/football/rapid/team/${teamId}/logo`);
export const rapidMatch = {
  detail: (eventId: string | number) => api.get(`/football/rapid/match/${eventId}/detail`),
  score:  (eventId: string | number) => api.get(`/football/rapid/match/${eventId}/score`),
  status: (eventId: string | number) => api.get(`/football/rapid/match/${eventId}/status`),
  stats:  (eventId: string | number) => api.get(`/football/rapid/match/${eventId}/stats`),
};
