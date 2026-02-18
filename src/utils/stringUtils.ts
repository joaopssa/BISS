/**
 * Utilitários para manipulação e normalização de strings
 * Centraliza padrões repetidos encontrados em múltiplos arquivos
 */

/**
 * Normaliza uma string removendo diacríticos e convertendo para lowercase
 */
export const normalizeString = (value: string): string => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Converte um valor para string, normalizado, lowercase e trimmed
 */
export const toNormalizedString = (value: any): string => {
  return String(value || "").toLowerCase().trim();
};

/**
 * Converte para string, trimmed (sem normalização de diacríticos)
 */
export const toTrimmedString = (value: any): string => {
  return String(value || "").trim();
};

/**
 * Verifica se uma string é válida e não está vazia
 */
export const isValidString = (value: any): boolean => {
  return Boolean(toTrimmedString(value));
};

/**
 * Normaliza status de apostas para formato padrão
 * Exemplos: "ganho", "Ganho", "GANHA", "ganha" -> "ganho"
 */
export const normalizeApostStatus = (status: any): string => {
  const normalized = toNormalizedString(status);
  // Padroniza variações
  if (normalized === "ganho" || normalized === "ganha") return "ganho";
  if (normalized === "perdido" || normalized === "perdida") return "perdido";
  if (normalized === "pendente") return "pendente";
  if (normalized === "cancelado" || normalized === "cancelada") return "cancelado";
  return normalized;
};

/**
 * Limpa e normaliza nomes de times para comparação
 */
export const normalizeTeamName = (teamName: string): string => {
  return normalizeString(teamName)
    .replace(/\s+/g, "")
    .replace(/[áàâã]/g, "a")
    .replace(/[éè]/g, "e")
    .replace(/[óô]/g, "o");
};

/**
 * Limpa e normaliza nomes de ligas
 */
export const normalizeLeagueName = (leagueName: string): string => {
  return normalizeString(leagueName);
};

/**
 * Extrai nome limpo de um path ou URL
 */
export const extractCleanName = (path: string): string => {
  if (!path) return "";
  return path.split("/").pop()?.replace(/\.[^/.]+$/, "") || "";
};

/**
 * Capitaliza a primeira letra de uma string
 */
export const capitalize = (value: string): string => {
  const trimmed = toTrimmedString(value);
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Capitaliza cada palavra em uma string
 */
export const capitalizeWords = (value: string): string => {
  return toTrimmedString(value)
    .split(/\s+/)
    .map(word => capitalize(word))
    .join(" ");
};
