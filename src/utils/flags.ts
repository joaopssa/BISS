// src/flags.ts
// Utilitários simples para ISO2 e URL de bandeira.

export type ISO2 = string; // "BR", "GB", "ES", ...

// Normaliza alguns nomes PT/EN comuns -> ISO2.
// Você pode expandir livremente esta tabela sem quebrar o app.
const COUNTRY_TO_ISO2: Record<string, ISO2> = {
  // Inglês
  Brazil: "BR", Spain: "ES", England: "GB", France: "FR", Germany: "DE", Italy: "IT",
  Portugal: "PT", Argentina: "AR", Chile: "CL", Colombia: "CO", Mexico: "MX", Netherlands: "NL",
  Belgium: "BE", Scotland: "GB", Wales: "GB", "Northern Ireland": "GB", USA: "US", "United States": "US",
  Japan: "JP", China: "CN", "Saudi Arabia": "SA", Qatar: "QA", Turkey: "TR",

  // Português
  Brasil: "BR", Espanha: "ES", Inglaterra: "GB", França: "FR", Alemanha: "DE", Itália: "IT",
  Portugal_: "PT", // evitar conflito de chave com TS (apenas ilustrativo)
  Argentina_: "AR", Chile_: "CL", Colômbia: "CO", Colombia_: "CO", México: "MX",
  PaísesBaixos: "NL", Holanda: "NL", Bélgica: "BE", Escócia: "GB", PaísDeGales: "GB",
  IrlandaDoNorte: "GB", EstadosUnidos: "US", Japão: "JP", China_: "CN", ArábiaSaudita: "SA",
  Catar: "QA", Turquia: "TR",
};

// Tenta normalizar uma string de país (PT/EN) -> ISO2
export function countryNameToISO2(country?: string | null): ISO2 | null {
  if (!country) return null;
  const key = country.trim()
    .replace(/\s+/g, "")
    .replace(/[^\p{Letter}]/gu, "")
    .toLowerCase();

  const hit = Object.entries(COUNTRY_TO_ISO2).find(([k]) => k.toLowerCase() === key);
  return hit ? hit[1] : null;
}

// Recebe "GB", "GB-ENG", "WO" etc. e devolve um ISO2 utilizável para bandeira.
export function normalizeISO2(code?: string | null): ISO2 | null {
  if (!code) return null;
  const c = String(code).toUpperCase();
  if (c === "WO") return null;          // "World" -> sem bandeira
  if (c.includes("-")) return c.split("-")[0]; // "GB-ENG" -> "GB"
  if (c.length === 2) return c;
  return null;
}

// URL de bandeira via flagcdn
export function flagUrl(iso2?: string | null, size: 16 | 24 | 32 = 16): string | null {
  const code = normalizeISO2(iso2);
  return code ? `https://flagcdn.com/h${size}/${code.toLowerCase()}.png` : null;
}
