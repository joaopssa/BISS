// generateFlagsMap.ts
// Uso: npx ts-node generateFlagsMap.ts
import fs from "fs";
import path from "path";
import { normalizeISO2, countryNameToISO2, flagUrl } from "./flags";

type League = {
  id: string | number | null;
  name: string;
  country?: string | null;
  type?: string | null;
  logo?: string | null;
  iso2?: string | null;
  flag?: string | null;
};

const flagsMapPath = path.resolve(process.cwd(), "flags-map.json");
const leaguesPath  = path.resolve(process.cwd(), "leagues.json");

const flagsMap: Record<string, string> = JSON.parse(fs.readFileSync(flagsMapPath, "utf-8"));
const leagues: League[] = JSON.parse(fs.readFileSync(leaguesPath, "utf-8"));

function getISO2ForLeague(leagueName: string, country?: string | null): string | null {
  // 1) se já tem country por nome -> ISO2
  const fromCountry = countryNameToISO2(country || "");
  if (fromCountry) return fromCountry;

  // 2) tenta flags-map.json por nome exato
  const code = flagsMap[leagueName] || flagsMap[leagueName.trim()];
  if (code) return normalizeISO2(code);

  return null;
}

const out = leagues.map(lg => {
  const iso2 = getISO2ForLeague(lg.name, lg.country);
  const flag = flagUrl(iso2, 16);
  return { ...lg, iso2: iso2 || null, flag: flag || null };
});

fs.writeFileSync(leaguesPath, JSON.stringify(out, null, 2), "utf-8");
console.log(`OK: enriquecidas ${out.length} ligas em ${path.basename(leaguesPath)}`);
