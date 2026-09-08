import { storage } from './mmkv';
import { supabase } from './supabase';

const QUEUE_KEY = 'offline_queue';

type MutationType = 'upsert_stop' | 'toggle_packing' | 'upsert_profile';

interface OfflineMutation {
  type: MutationType;
  table: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export function enqueueOfflineMutation(
  type: MutationType,
  table: string,
  payload: Record<string, unknown>,
): void {
  const existing = JSON.parse(storage.getString(QUEUE_KEY) ?? '[]') as OfflineMutation[];
  storage.set(QUEUE_KEY, JSON.stringify([
    ...existing,
    { type, table, payload, timestamp: new Date().toISOString() },
  ]));
}

export async function flushOfflineMutations(): Promise<void> {
  const raw = storage.getString(QUEUE_KEY);
  if (!raw) return;
  const mutations = JSON.parse(raw) as OfflineMutation[];
  if (mutations.length === 0) return;

  const failed: OfflineMutation[] = [];
  for (const mutation of mutations) {
    const { error } = await supabase.from(mutation.table).upsert(mutation.payload as never);
    if (error) failed.push(mutation);
  }
  storage.set(QUEUE_KEY, JSON.stringify(failed));
}

export function getPendingMutationCount(): number {
  const raw = storage.getString(QUEUE_KEY);
  if (!raw) return 0;
  return (JSON.parse(raw) as OfflineMutation[]).length;
}
