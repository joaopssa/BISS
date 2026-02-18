/**
 * Utilitários para manipulação de strings no Backend
 * Centraliza padrões repetidos encontrados em múltiplos controllers
 */

/**
 * Converte um valor para string normalizado, lowercase e trimmed
 */
const toNormalizedString = (value) => {
  return String(value || "").toLowerCase().trim();
};

/**
 * Converte para string, trimmed (sem normalização)
 */
const toTrimmedString = (value) => {
  return String(value || "").trim();
};

/**
 * Normaliza status de apostas para formato padrão
 * Exemplos: "ganho", "Ganho", "GANHA", "ganha" -> "ganho"
 */
const normalizeApostStatus = (status) => {
  const normalized = toNormalizedString(status);
  // Padroniza variações
  if (normalized === "ganho" || normalized === "ganha") return "ganho";
  if (normalized === "perdido" || normalized === "perdida") return "perdido";
  if (normalized === "pendente") return "pendente";
  if (normalized === "cancelado" || normalized === "cancelada") return "cancelado";
  return normalized;
};

/**
 * Verifica se uma string é válida e não está vazia
 */
const isValidString = (value) => {
  return Boolean(toTrimmedString(value));
};

/**
 * Extrai campo de um objeto com fallback para valor padrão
 */
const getFieldValue = (obj, fieldName, defaultValue = null) => {
  const value = obj?.[fieldName];
  return value !== undefined && value !== null ? value : defaultValue;
};

/**
 * Converte para número com segurança
 */
const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
};

module.exports = {
  toNormalizedString,
  toTrimmedString,
  normalizeApostStatus,
  isValidString,
  getFieldValue,
  toNumber,
};
