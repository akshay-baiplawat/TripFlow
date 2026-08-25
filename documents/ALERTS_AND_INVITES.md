# Alerts Engine, Deep Linking & Guest Flow

## 1. Deep Link Architecture (Option A: Pure Deep Link)
- **App URL Scheme:** `tripflow://trip/[tripId]?invite=[inviteCode]`
- **Universal Web Redirect (Vercel $0):** `https://tripflow.app/t/[tripId]`
  - If installed: Directly launches TripFlow and triggers `joinTrip(tripId, inviteCode)`.
  - If not installed: Displays an "Install Test Build via Expo Go" prompt.

## 2. Guest Auto-Join Flow
```typescript
export async function handleIncomingInvite(tripId: string, inviteCode: string) {
  let user = supabase.auth.user();
  
  // If not logged in, sign in anonymously at $0 cost
  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    user = data.user;
  }

  // Add user to trip_members with 'editor' role
  await supabase.from('trip_members').upsert({
    trip_id: tripId,
    user_id: user.id,
    role: 'editor'
  });
}