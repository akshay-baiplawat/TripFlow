import { supabase } from './supabase';

export interface InviteParams {
  tripId: string;
  inviteCode: string;
}

export function parseInviteUrl(url: string): InviteParams | null {
  try {
    // new URL() treats "trip" as the hostname for custom schemes, so parse manually.
    // Expected format: tripflow://trip/<id>?invite=<code>
    const PREFIX = 'tripflow://trip/';
    if (!url.startsWith(PREFIX)) return null;
    const rest = url.slice(PREFIX.length);
    const qIdx = rest.indexOf('?');
    const tripId = (qIdx === -1 ? rest : rest.slice(0, qIdx)).replace(/\/+$/, '');
    const query = qIdx === -1 ? '' : rest.slice(qIdx + 1);
    const inviteCode = new URLSearchParams(query).get('invite');
    if (!tripId || !inviteCode) return null;
    return { tripId, inviteCode };
  } catch {
    return null;
  }
}

export function buildInviteUrl(tripId: string, inviteCode: string): string {
  return `tripflow://trip/${tripId}?invite=${encodeURIComponent(inviteCode)}`;
}

export async function handleIncomingInvite(url: string): Promise<boolean> {
  const params = parseInviteUrl(url);
  if (!params) return false;

  const { data: { user } } = await supabase.auth.getUser();
  let userId = user?.id;

  if (!userId) {
    const { data } = await supabase.auth.signInAnonymously();
    userId = data.user?.id;
  }
  if (!userId) return false;

  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', params.tripId)
    .eq('invite_code', params.inviteCode)
    .single();

  if (!trip) return false;

  const { error: upsertError } = await supabase
    .from('trip_members')
    .upsert(
      { trip_id: params.tripId, user_id: userId, role: 'editor' },
      { onConflict: 'trip_id,user_id' },
    );

  if (upsertError) return false;
  return true;
}
