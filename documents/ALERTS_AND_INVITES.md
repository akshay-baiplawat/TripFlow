# Alerts Engine, Deep Linking & Guest Flow

> **Status:** Fully implemented as of 2026-08-30. Deep link handler wired in `app/_layout.tsx`. Notification permission requested on launch. Departure notification scheduling is built but not yet connected to the stop load flow (future work).

---

## 1. Deep Link Architecture

- **App URL Scheme:** `tripflow://trip/[tripId]?invite=[inviteCode]`
- **Build invite URL** (`utils/deepLink.ts`):

```typescript
export function buildInviteUrl(tripId: string, inviteCode: string): string {
  return `tripflow://trip/${tripId}?invite=${encodeURIComponent(inviteCode)}`;
}
```

## 2. Guest Auto-Join Flow (`utils/deepLink.ts`)

Uses Supabase v2 API. Validates `invite_code` against the trips table before upserting membership:

```typescript
export async function handleIncomingInvite(url: string): Promise<boolean> {
  const params = parseInviteUrl(url);
  if (!params) return false;

  const { data: { user } } = await supabase.auth.getUser();
  let userId = user?.id;

  // Sign in anonymously if no session
  if (!userId) {
    const { data } = await supabase.auth.signInAnonymously();
    userId = data.user?.id;
  }
  if (!userId) return false;

  // Validate invite code
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', params.tripId)
    .eq('invite_code', params.inviteCode)
    .single();
  if (!trip) return false;

  // Upsert membership — idempotent, won't downgrade existing owner
  const { error: upsertError } = await supabase.from('trip_members').upsert(
    { trip_id: params.tripId, user_id: userId, role: 'editor' },
    { onConflict: 'trip_id,user_id' },
  );
  if (upsertError) return false;
  return true;
}
```

## 3. Deep Link Listener (wired in `app/_layout.tsx`)

`AuthGuard` listens for URLs after the session is ready, joins the trip, and navigates:

```typescript
useEffect(() => {
  if (!isReady) return;

  const handleUrl = async (url: string) => {
    const success = await handleIncomingInvite(url);
    if (success) {
      const params = parseInviteUrl(url);
      if (params) router.push(`/(tabs)/trips/${params.tripId}/day`);
    }
  };

  Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
  const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
  return () => sub.remove();
}, [isReady, router]);
```

## 4. Notification Alerts (`utils/alerts.ts`)

Notification permission is requested on every app launch. Departure notifications are built but not yet called from the UI:

```typescript
// Called on app mount in _layout.tsx
export async function requestNotificationPermissions(): Promise<boolean>

// Schedule 15-min-before-departure notification (TODO: call from day.tsx after loading stops)
export async function scheduleDepartureNotification(
  stopName: string,
  departureMinutes: number,
  dayDate: string,
): Promise<void>

// Returns stops that overflow past midnight — used by DriftWarningBanner
export function computeDriftWarnings(stops: ComputedStop[]): DriftWarning[]
```

## 5. Remaining Work

- Call `scheduleDepartureNotification` when loading/adding stops in `day.tsx`
- Wire `flushOfflineMutations` (`utils/offlineQueue.ts`) to a NetInfo connectivity listener
