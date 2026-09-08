# Local-First Synchronization & Mutation Queue

> **Status as of 2026-08-30:** Core sync engine implemented. Offline mutation queue built but not yet wired to a NetInfo listener (future work).

---

## 1. Storage Architecture

- **Fast Storage:** `react-native-mmkv` — all local cache reads/writes are synchronous, under 5ms.
- **Replication Flow:**

```
UI Interaction
  → Immediate Zustand state update (0ms)
  → MMKV persist middleware writes snapshot
  → Debounced remote dispatcher fires after 1000ms
  → Supabase upsert
```

## 2. Debounced Remote Sync Engine (`stores/useScheduleStore.ts`)

Stop mutations (status, duration, transit, notes, order_rank) are batched and sent after 1000ms of inactivity:

```typescript
const syncStops = debounce(async (dayId: string, stops: Stop[]) => {
  const updates = stops.map((s) => ({
    id: s.id,
    day_id: dayId,
    order_rank: s.order_rank,
    duration_minutes: s.duration_minutes,
    transit_to_next_minutes: s.transit_to_next_minutes,
    status: s.status,
    notes: s.notes,
    is_what_to_do_open: s.is_what_to_do_open,
    is_notes_open: s.is_notes_open,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from('stops').upsert(updates);
}, 1000);
```

Day start time is synced immediately (fire-and-forget) on every change:

```typescript
supabase.from('itinerary_days').update({ start_time_minutes: minutes }).eq('id', dayId);
```

Packing item toggle is debounced at 800ms:

```typescript
await supabase.from('packing_items').update({ is_checked: isChecked }).eq('id', itemId);
```

Profile fields are debounced at 800ms via `upsert` on the `profiles` table.

## 3. Offline Mutation Queue (`utils/offlineQueue.ts`)

Built and ready — **not yet wired to a network listener**.

```typescript
// Append a failed mutation to the MMKV-backed queue
export function enqueueOfflineMutation(
  type: 'upsert_stop' | 'toggle_packing' | 'upsert_profile',
  table: string,
  payload: Record<string, unknown>,
): void

// Replay all queued mutations against Supabase; keep failed ones
export async function flushOfflineMutations(): Promise<void>

// Check how many mutations are pending
export function getPendingMutationCount(): number
```

**TODO:** Import `@react-native-community/netinfo` and call `flushOfflineMutations()` when the app comes back online:

```typescript
import NetInfo from '@react-native-community/netinfo';
import { flushOfflineMutations } from './offlineQueue';

NetInfo.addEventListener((state) => {
  if (state.isConnected) flushOfflineMutations();
});
```

## 4. MMKV Persist Keys

| Key | Content |
|-----|---------|
| `tripflow-schedule` | Zustand store snapshot (trips, activeTripId, activeDayIndex) |
| `offline_queue` | JSON array of `OfflineMutation` objects |
| Supabase auth keys | Session tokens managed by the MMKV storage adapter |
