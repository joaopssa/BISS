/**
 * Utilitários para manipulação e formatação de datas
 * Centraliza padrões repetidos encontrados em múltiplos arquivos
 */

/**
 * Converte uma Date para formato YYYY-MM-DD (ISO date only)
 */
export const toISODateOnly = (date: Date | null | undefined): string | null => {
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
 * Converte uma Date para formato ISO completo sem milissegundos
 * Exemplo: "2024-02-18T14:30:45"
 */
export const toISODateTime = (date: Date | null | undefined): string | null => {
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
 * Converte uma Date para formato SQL com espaço
 * Exemplo: "2024-02-18 14:30:45"
 */
export const toSQLDateTime = (date: Date | null | undefined): string | null => {
  const iso = toISODateTime(date);
  return iso ? iso.replace("T", " ") : null;
};

/**
 * Formata uma data para exibição localizada (pt-BR)
 * Exemplo: "18/02/2024"
 */
export const formatDateBR = (date: Date | null | undefined): string => {
  if (!date) return "";
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
};

/**
 * Formata uma hora para exibição localizada (pt-BR)
 * Exemplo: "14:30"
 */
export const formatTimeBR = (date: Date | null | undefined): string => {
  if (!date) return "";
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

/**
 * Formata data e hora combinadas (pt-BR)
 * Exemplo: "18/02/2024 14:30"
 */
export const formatDateTimeBR = (date: Date | null | undefined): string => {
  const dateBR = formatDateBR(date);
  const timeBR = formatTimeBR(date);
  return dateBR && timeBR ? `${dateBR} ${timeBR}` : "";
};

/**
 * Extrai dados de uma string de data no formato YYYY-MM-DD
 * Retorna undefined se inválida
 */
export const parseDateString = (dateStr: string | undefined): { year: number; month: number; day: number } | null => {
  if (!dateStr) return null;
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    day: parseInt(match[3], 10),
  };
};

/**
 * Calcula a diferença em dias entre duas datas
 */
export const daysBetween = (date1: Date, date2: Date): number => {
  const ms = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

/**
 * Verifica se uma data é válida
 */
export const isValidDate = (date: any): boolean => {
  if (date instanceof Date) return Number.isFinite(date.getTime());
  try {
    const d = new Date(date);
    return Number.isFinite(d.getTime());
  } catch {
    return false;
  }
};

/**
 * Retorna a data atual em formato YYYY-MM-DD
 */
export const getTodayISO = (): string => {
  return toISODateOnly(new Date()) || "";
};

/**
 * Cria uma chave de mês no formato YYYY-MM a partir de uma data
 */
export const getMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Cria uma chave de data no formato YYYY-MM-DD a partir de uma data
 */
export const getDateKey = (date: Date): string => {
  return toISODateOnly(date) || "";
};
