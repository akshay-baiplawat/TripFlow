---

### `SYNC_AND_OFFLINE.md`

```markdown
# Local-First Synchronization & Mutation Queue

## 1. Storage Architecture
- **Fast Storage:** `react-native-mmkv` handles all local cache reads/writes synchronously under 5ms.
- **Replication Flow:**
  `UI Interaction -> Immediate Zustand & MMKV Update -> Debounced Remote Dispatcher -> Supabase`

## 2. Debounced Remote Sync Engine
When a user rapidly drags cards or tweaks durations, network writes are delayed by **1000ms**:

```typescript
import { debounce } from 'lodash';

export const debouncedSyncDayStops = debounce(async (dayId: string, stops: Stop[]) => {
  try {
    const updates = stops.map(s => ({
      id: s.id,
      day_id: dayId,
      order_rank: s.order_rank,
      duration_minutes: s.duration_minutes,
      transit_to_next_minutes: s.transit_to_next_minutes,
      status: s.status,
      notes: s.notes,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('stops').upsert(updates);
    if (error) throw error;
  } catch (err) {
    enqueueOfflineMutation('UPSERT_STOPS', { dayId, stops });
  }
}, 1000);