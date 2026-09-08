# Fractional Indexing — `order_rank` Strategy

> **Status as of 2026-08-30:** Fully implemented in `utils/fractionalRank.ts`. Used by `useScheduleStore` on every drag-and-drop reorder and new stop insert. Rebalance logic fires when midpoint precision collapses.

---

## Why Fractional Indexing

Drag-and-drop reordering with sequential integers (`order: 1, 2, 3`) requires updating every row after the insertion point — O(n) writes and potential Supabase free-tier quota burn. Floating-point `order_rank` enables O(1) single-row updates: insert between two ranks by taking their midpoint.

## Rules

| Case | Formula |
| --- | --- |
| Head insert (no predecessor) | `nextRank / 2` |
| Tail append (no successor) | `prevRank + 1000` |
| Between two stops | `(prevRank + nextRank) / 2` |
| Empty list | `1000.0` |

## Implementation (`utils/fractionalRank.ts`)

```typescript
export function calculateNewRank(prevRank: number | null, nextRank: number | null): number {
  if (prevRank === null && nextRank === null) return 1000.0;
  if (prevRank === null && nextRank !== null) return nextRank / 2.0;
  if (prevRank !== null && nextRank === null) return prevRank + 1000.0;
  return (prevRank! + nextRank!) / 2.0;
}
```

## Rebalancing

After repeated midpoint splits the gap between adjacent ranks can collapse below floating-point precision. `needsRebalance(stops: Stop[]): boolean` detects this. `rebalanceRanks(stops: Stop[]): Stop[]` redistributes ranks evenly with a gap of 1000 — returns a new array (no mutation). The caller syncs all affected rows to Supabase in a single `upsert` batch.

## Database Column

```sql
order_rank DOUBLE PRECISION NOT NULL DEFAULT 1000.0
```

Stops are always fetched `ORDER BY order_rank ASC`. No triggers or stored procedures — all rank logic lives in the client.
