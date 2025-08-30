import fs from 'fs';
import fetch from 'node-fetch';

const API_KEY = '58bfaee3bd005386cb021cf4dde184e8'; 
async function generateFlagsMap() {
  try {
    const response = await fetch('https://v3.football.api-sports.io/leagues', {
      headers: { 'x-apisports-key': API_KEY }
    });

    const data = await response.json();

    const map: Record<string, string> = {};

    data.response.forEach((item: any) => {
      const leagueName = item.league.name;
      const countryCode = item.country.code || item.country.name.slice(0, 2).toUpperCase();
      map[leagueName] = countryCode;
    });

    const path = './src/utils/flags-map.json';
    fs.writeFileSync(path, JSON.stringify(map, null, 2));
    console.log(`✅ Mapeamento salvo em ${path}`);
  } catch (error) {
    console.error('Erro ao gerar mapa de bandeiras:', error);
  }
}

generateFlagsMap();
