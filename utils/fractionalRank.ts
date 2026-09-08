const REBALANCE_THRESHOLD = 1e-9;

export function calculateNewRank(
  prevRank: number | null,
  nextRank: number | null,
): number {
  if (prevRank === null && nextRank === null) return 1000;
  if (prevRank === null) return (nextRank as number) / 2;
  if (nextRank === null) return prevRank + 1000;
  return (prevRank + nextRank) / 2;
}

export function needsRebalance(prevRank: number, nextRank: number): boolean {
  return Math.abs(nextRank - prevRank) < REBALANCE_THRESHOLD;
}

export function rebalanceRanks(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * 1000);
}
