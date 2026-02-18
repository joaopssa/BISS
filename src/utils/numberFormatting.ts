/**
 * Utilitários para formatação e cálculos numéricos
 * Centraliza padrões repetidos de formatação encontrados em múltiplos componentes
 */

/**
 * Arredonda um número para 2 casas decimais
 */
export const round2 = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Arredonda um número para 1 casa decimal
 */
export const round1 = (value: number): number => {
  return Math.round(value * 10) / 10;
};

/**
 * Formata um número como percentual com 1 casa decimal (ex: "85.5%")
 */
export const formatPercent1 = (value: number): string => {
  return `${Number(value || 0).toFixed(1)}%`;
};

/**
 * Formata um número como percentual com 0 casas decimais (ex: "85%")
 */
export const formatPercent0 = (value: number): string => {
  return `${Math.round(Number(value || 0))}%`;
};

/**
 * Formata um número como odd com 2 casas decimais (sem símbolo)
 */
export const formatOdd2 = (value: number): string => {
  return Number(value || 0).toFixed(2);
};

/**
 * Limita um valor entre 0 e 1
 */
export const clamp01 = (value: number): number => {
  return Math.max(0, Math.min(1, value));
};

/**
 * Limita um valor entre min e max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Converte string com símbolos de moeda para número
 * Exemplos: "R$ 100,50" -> 100.50, "100.50" -> 100.50
 */
export const parseMonetaryValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let s = String(value).trim();
  
  // Remove moeda e espaços (inclui NBSP)
  s = s.replace(/\s|\u00A0/g, "");
  s = s.replace(/^R\$\s?/i, "");
  
  // Mantém só dígitos, ponto, vírgula e sinal
  s = s.replace(/[^\d.,-]/g, "");
  
  if (!s) return 0;
  
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  
  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    s = lastDot > lastComma ? s.replace(",", "") : s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    const parts = s.split(",");
    s = parts.length === 2 && parts[0].length > 3 ? s.replace(",", ".") : s;
  }
  
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Calcula a mudança percentual entre dois valores
 */
export const calculatePercentChange = (recent: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((recent - previous) / previous) * 100;
};

/**
 * Calcula a taxa de acerto a partir do número de ganhos e total de apostas
 */
export const calculateWinRate = (wins: number, total: number): number => {
  return total > 0 ? (wins / total) * 100 : 0;
};

/**
 * Calcula o lucro líquido a partir de ganhos e investimento
 */
export const calculateProfit = (equity: number, netDeposits: number): number => {
  return round2(equity - netDeposits);
};
