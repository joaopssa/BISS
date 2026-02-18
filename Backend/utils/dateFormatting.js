/**
 * Utilitários para formatação de datas no Backend
 * Centraliza padrões repetidos encontrados em múltiplos controllers
 */

/**
 * Converte uma Date para formato ISO date only (YYYY-MM-DD)
 */
const toISODateOnly = (date) => {
  if (!date) return null;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

/**
 * Converte uma Date para formato ISO completo (YYYY-MM-DDTHH:mm:ss)
 */
const toISODateTime = (date) => {
  if (!date) return null;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return null;
    return d.toISOString().slice(0, 19);
  } catch {
    return null;
  }
};

/**
 * Converte uma Date para formato SQL (YYYY-MM-DD HH:mm:ss)
 * Exemplo: "2024-02-18 14:30:45"
 */
const toSQLDateTime = (date) => {
  const isoDate = toISODateTime(date);
  return isoDate ? isoDate.replace("T", " ") : null;
};

/**
 * Retorna data de hoje em formato YYYY-MM-DD
 */
const getTodayISO = () => {
  return toISODateOnly(new Date());
};

/**
 * Cria uma chave de mês no formato YYYY-MM a partir de uma data
 */
const getMonthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Cria uma chave de data no formato YYYY-MM-DD a partir de uma data
 */
const getDateKey = (date) => {
  return toISODateOnly(date);
};

/**
 * Verifica se uma data é válida
 */
const isValidDate = (date) => {
  if (date instanceof Date) return Number.isFinite(date.getTime());
  try {
    const d = new Date(date);
    return Number.isFinite(d.getTime());
  } catch {
    return false;
  }
};

module.exports = {
  toISODateOnly,
  toISODateTime,
  toSQLDateTime,
  getTodayISO,
  getMonthKey,
  getDateKey,
  isValidDate,
};
