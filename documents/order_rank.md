export function calculateNewRank(prevRank: number | null, nextRank: number | null): number {
  if (prevRank === null && nextRank === null) return 1000.0;
  if (prevRank === null && nextRank !== null) return nextRank / 2.0;
  if (prevRank !== null && nextRank === null) return prevRank + 1000.0;
  return (prevRank! + nextRank!) / 2.0;
}