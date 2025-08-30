import flagMap from './flags-map.json';

export const competitionToCountryCode = flagMap;

export const getFlagUrl = (countryCode: string) =>
  `https://flagsapi.com/${countryCode}/flat/24.png`;
