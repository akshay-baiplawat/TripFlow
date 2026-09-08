import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'tripflow-storage' });

export const mmkvStorageAdapter = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => { storage.set(key, value); },
  removeItem: (key: string): void => { storage.remove(key); },
};
