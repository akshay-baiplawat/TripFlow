# TripFlow

A zero-cost, local-first, collaborative mobile travel companion for Android and iOS. TripFlow features a real-time cascading schedule engine, drag-and-drop timeline reordering, dual-stack Undo/Redo state management, an offline packing checklist, role-based collaboration, and an intelligent drift alert system.

## Features

- **Cascading Schedule Engine** — Change a start time or skip a stop and every downstream arrival/departure recomputes instantly. All time math uses destination-local minutes-from-midnight, so it's invariant to phone timezones.
- **Drag-and-Drop Timeline** — Reorder stops with 60 FPS gestures. Reordering uses fractional `order_rank` values for O(1) single-row updates (no cascading writes).
- **Dual-Stack Undo/Redo** — Command-pattern history (up to 30 snapshots) persisted locally.
- **Role-Based Collaboration** — Owner / Editor / Viewer roles per trip. Invite via deep links, migrate guest sessions into a real account.
- **Stop Status Tracking** — Mark stops Pending / Visited / Skipped; visible and editable by all trip members and synced across collaborators.
- **Offline Packing Checklist** — Local-first checklist with an MMKV-backed offline mutation queue.
- **Drift Alerts** — Departure countdown notifications and warnings when a day's schedule overflows past midnight.
- **Zero-Cost by Design** — No paid third-party APIs. Uses OpenStreetMap/Photon for lookups and native Google Maps deep links for navigation.

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React Native + Expo (SDK 57), Expo Router, TypeScript (strict) |
| Styling | NativeWind v4 (Tailwind CSS) |
| State | Zustand with Dual-Stack Undo/Redo |
| Local storage | `react-native-mmkv` (synchronous key-value) |
| Backend & Auth | Supabase (PostgreSQL, RLS, Realtime, Anonymous + Google + Email Magic Links) |
| Reordering | `react-native-draggable-flatlist` + `react-native-reanimated` |
| Icons / Haptics / Notifications | `lucide-react-native`, `expo-haptics`, `expo-notifications`, `expo-linking` |

## Project Structure

```
app/                    Expo Router screens
  (auth)/               Login & OAuth callback
  (onboarding)/         First-run profile setup
  (tabs)/               Trips list, day timeline, packing, profile
components/             UI components (StopCard, modals, member panel…)
stores/                 Zustand store (useScheduleStore)
utils/                  Engine, sync, storage, and platform helpers
  timelineEngine.ts     Minutes-from-midnight cascading schedule math
  fractionalRank.ts     O(1) reorder rank calculation
  supabase.ts           Supabase client (MMKV auth storage adapter)
  offlineQueue.ts       Offline mutation queue
  alerts.ts             Drift detection & departure notifications
types/                  Strictly-typed DB interfaces
documents/              Design specs (PRD, engine, RLS, sync, UI/UX)
```

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode (iOS) and/or Android Studio + emulator
- A Supabase project
- A Google OAuth client (for native Google Sign-In)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
```

### 3. Set up the database

Run the SQL from `documents/` (schema + `Row-Level Security (RLS) Policies.md`) in the Supabase SQL Editor, and enable the **Anonymous**, **Google**, and **Email Magic Link** auth providers.

### 4. Run the app

```bash
npx expo run:android    # Android emulator / device
npx expo run:ios        # iOS simulator / device
npx expo start          # Metro dev server
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Build & run on Android |
| `npm run ios` | Build & run on iOS |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |

## Building a Release APK

```bash
npx expo run:android --variant release
```

The signed APK is produced at:

```
android/app/build/outputs/apk/release/app-release.apk
```

> **Note:** The release keystore (`android/app/tripflow.keystore`) is git-ignored. Keep it and its credentials out of version control.

## Development Guardrails

1. **Time integrity** — Never store or compute itinerary times as UTC ISO dates. Use destination-local minutes from midnight (`06:30` → `390`).
2. **Zero-cost** — No paid third-party APIs. Use free OpenStreetMap/Photon lookups and native map deep links.
3. **Fractional indexing** — Never use sequential integer arrays for reordering. Always use floating-point `order_rank`.
4. **Optimistic local-first** — Local state updates instantly (MMKV/Zustand). Remote sync calls are debounced (~1000 ms) to conserve the Supabase free tier.
5. **Strict typing** — No `any`, no placeholders; all code is production-ready.

## License

Private project.
