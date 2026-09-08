import { storage } from './mmkv';
import { supabase } from './supabase';

export interface Contact {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const KEY = 'tripflow-contacts';

function writeCache(contacts: Contact[]): void {
  storage.set(KEY, JSON.stringify(contacts));
}

export function getContacts(): Contact[] {
  try {
    return JSON.parse(storage.getString(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function isContact(id: string): boolean {
  return getContacts().some((c) => c.id === id);
}

export async function loadContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('user_contacts')
    .select('contact_id, profile:profiles!contact_id(id, username, full_name, avatar_url)')
    .eq('user_id', userId);

  if (error || !data) return getContacts();

  const contacts: Contact[] = data.map((row) => {
    const profiles = row.profile as unknown as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[];
    const p = Array.isArray(profiles) ? profiles[0] : (profiles as unknown as typeof profiles[0] | null);
    return {
      id: p?.id ?? (row.contact_id as string),
      username: p?.username ?? null,
      full_name: p?.full_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });

  writeCache(contacts);
  return contacts;
}

export async function addContact(userId: string, contact: Contact): Promise<void> {
  const updated = [...getContacts().filter((c) => c.id !== contact.id), contact];
  writeCache(updated);
  await supabase
    .from('user_contacts')
    .upsert({ user_id: userId, contact_id: contact.id }, { onConflict: 'user_id,contact_id' });
}

export async function removeContact(userId: string, contactId: string): Promise<void> {
  writeCache(getContacts().filter((c) => c.id !== contactId));
  await supabase
    .from('user_contacts')
    .delete()
    .eq('user_id', userId)
    .eq('contact_id', contactId);
}
