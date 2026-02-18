/**
 * Utilitários para componentes e funções de UI
 * Centraliza funções duplicadas entre componentes
 */

/**
 * Retorna a source de imagem da badge de tier BISS
 * Exemplo: "am1" -> "/classes/am1.png"
 */
export const getTierBadgeSource = (tierKey?: string | null): string => {
  const key = String(tierKey || "INI").toLowerCase();
  return `${import.meta.env.BASE_URL}classes/${key}.png`;
};

/**
 * Verifica se uma taxa de lucro é sustentável com base na probabilidade de ganho
 * @param winProbability - Probabilidade de ganho entre 0 e 1
 * @param averageOdd - Odd média das apostas
 * @returns true se a combinação é sustentável no longo prazo
 */
export const isSustainable = (winProbability: number, averageOdd: number): boolean => {
  if (!Number.isFinite(winProbability) || winProbability <= 0) return false;
  if (!Number.isFinite(averageOdd) || averageOdd <= 0) return false;
  // Sustentável se a odd média está acima do break-even para essa taxa de acerto
  // Break-even odd = 1 / probability
  return averageOdd >= 1 / winProbability;
};

/**
 * Calcula dados agregados de apostas para um período/filtro
 * Útil para evitar duplicação de lógica em múltiplos componentes
 */
export const aggregateBetStats = (bets: any[]): {
  totalBets: number;
  wins: number;
  losses: number;
  pending: number;
  totalProfit: number;
  totalStaked: number;
  averageOdd: number;
} => {
  let totalBets = 0;
  let wins = 0;
  let losses = 0;
  let pending = 0;
  let totalProfit = 0;
  let totalStaked = 0;
  let totalOddSum = 0;

  for (const bet of bets || []) {
    const status = String(bet?.status || "").toLowerCase().trim();
    const stake = Number(bet?.valor_apostado) || Number(bet?.stake) || 0;
    const odd = Number(bet?.odd) || 0;
    const profit = Number(bet?.lucro) || Number(bet?.profit) || 0;

    totalBets++;
    totalStaked += stake;
    totalOddSum += odd;

    if (status === "ganho" || status === "ganha") {
      wins++;
      totalProfit += profit;
    } else if (status === "perdido" || status === "perdida") {
      losses++;
      totalProfit -= stake;
    } else {
      pending++;
    }
  }

  const averageOdd =
    totalBets > 0 ? totalOddSum / totalBets : 0;

  return {
    totalBets,
    wins,
    losses,
    pending,
    totalProfit,
    totalStaked,
    averageOdd,
  };
};

/**
 * Separa um array de dados em dois arrays baseado em um predicate
 * Útil para filtrar dados sem duplicação de lógica
 */
export const partition = <T,>(
  items: T[],
  predicate: (item: T) => boolean
): [T[], T[]] => {
  const match: T[] = [];
  const noMatch: T[] = [];

  for (const item of items) {
    (predicate(item) ? match : noMatch).push(item);
  }

  return [match, noMatch];
};

/**
 * Agrupa itens por uma chave
 */
export const groupBy = <T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K
): Record<K, T[]> => {
  const result = {} as Record<K, T[]>;

  for (const item of items) {
    const key = getKey(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }

  return result;
};

/**
 * Calcula a média ponderada
 */
export const weightedAverage = (
  items: { value: number; weight: number }[]
): number => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  const sum = items.reduce((acc, item) => acc + item.value * item.weight, 0);
  return sum / totalWeight;
};
