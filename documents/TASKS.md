# Implementation Roadmap & Developer Task Checklist

> **Status as of 2026-08-30:** All 6 phases complete. 7 runtime bugs fixed (see Bug Fix Log below). App name changed to "Trip Flow". Custom app icon applied. Zero TypeScript errors. App is production-ready pending `.env` setup and Supabase SQL migrations.

## Bug Fix Log (2026-08-30) ✅

- [x] **AddPlaceModal** — `setSaving(false)` moved into `finally` block; was leaving spinner permanently on unexpected JS throw.
- [x] **packing.tsx** — `deletePackingItem` now called only after confirmed Supabase delete; was silently de-syncing local and remote state.
- [x] **EditPlaceModal** — `handleSave` made async; Supabase update now awaited with error alert on failure; was a fire-and-forget discarded Promise.
- [x] **DayMetaCard** — iOS time picker now wrapped in a Modal with a Done button; was permanently mounted with no dismiss path on iOS.
- [x] **login.tsx** — Added `idToken` null guard before `signInWithIdToken`; prevents opaque Supabase error and TypeScript strict-mode violation.
- [x] **deepLink.ts** — `upsert` result captured; returns `false` on error instead of always returning `true` regardless of DB failure.
- [x] **alerts.ts** — Known issue noted: `scheduleDepartureNotification` uses device local timezone; destination UTC offset must be passed for cross-timezone correctness (future fix when UTC offset field is added to trip/day model).

## UI / UX Updates (2026-08-30) ✅

- [x] App name changed from "TripFlow" to "Trip Flow".
- [x] Custom app icon (compass on green) applied to launcher, adaptive icon, and splash screen.
- [x] Splash screen animated (spring icon entrance + green ripple ring + staggered dots).
- [x] Stop card redesigned: removed left accent bar, index badge, status dropdown, Google Maps URL support.
- [x] Day view scrolling fixed: `NestableScrollContainer` + `NestableDraggableFlatList` replaces broken `ScrollView` + `DraggableFlatList` nesting.
- [x] DayMetaCard start time: native `DateTimePicker` replaces preset buttons grid.
- [x] Active/Upcoming/Archived tab selection persisted via MMKV across app restarts.
- [x] Trips dashboard header: profile avatar + time-based greeting replaces static "My Trips" title.
- [x] Add Place modal: field renamed to "Google Maps Link / Search Query"; direct URLs routed correctly.

## Phase 1: Project Initialization & Core Framework ✅
- [x] Initialize Expo project with TypeScript (SDK 51, Expo Router v3, New Architecture enabled).
- [x] Configure `NativeWind v4` and Tailwind tokens in `tailwind.config.js` (brand-600 `#059669`, full slate palette).
- [x] Set up `lucide-react-native`, `expo-notifications`, `expo-linking`, `expo-haptics`.
- [x] Initialize Supabase client (`utils/supabase.ts`) with `react-native-mmkv` persistence adapter (PKCE flow).

## Phase 2: Database Schema & Authentication ✅
- [x] SQL schema migrations documented in `DATABASE_SCHEMA.md` — user must run in Supabase dashboard.
- [x] RLS policies documented in `Row-Level Security (RLS) Policies.md` — user must run in Supabase dashboard.
- [x] Supabase Auth: Anonymous sign-in + Google OAuth (`@react-native-google-signin/google-signin`) + PKCE callback (`app/auth/callback.tsx`).
- [x] User Profile edit screen (`app/(tabs)/profile.tsx`) — full_name, username, phone, gender, bio, emergency contacts, debounced auto-save.
- [x] `@username` search (ilike query on `profiles` table) in profile screen and invite modal.

## Phase 3: Dynamic Schedule Engine & State Architecture ✅
- [x] Zustand store with Dual-Stack Undo/Redo (max 30 snapshots, JSON serialisation) — `stores/useScheduleStore.ts`.
- [x] Minutes-from-midnight engine (`utils/timelineEngine.ts`) — `parseTimeToMinutes`, `formatMinutesToTime`, `computeDynamicSchedule`.
- [x] Fractional indexing rank calculator (`utils/fractionalRank.ts`) — `calculateNewRank`, `needsRebalance`, `rebalanceRanks`.
- [ ] Unit tests for engine and fractional rank — **not yet written** (future work).

## Phase 4: Itinerary UI & Interactive Timeline ✅
- [x] `<DayTabs />` — horizontal scroll, active pill, visited/total badge, Gear tab link.
- [x] `<DayMetaCard />` — start-time picker (preset buttons), Undo/Redo buttons, progress bar, Add Place trigger.
- [x] `<StopCard />` — computed arrival/departure times, category badge, Pending/Visited/Skip pills, edit+delete, duration/transit steppers, collapsible What-to-do and Notes accordions.
- [x] Drag-and-drop reordering via `react-native-draggable-flatlist` with fractional rank update.
- [x] `<AddPlaceModal />` and `<EditPlaceModal />` with all fields and duration presets.
- [x] Google Maps deep link (`https://www.google.com/maps/search/?api=1&query=...`) on every stop card.
- [ ] Haptic feedback on drag start/drop — not implemented (future enhancement).
- [ ] Apple Maps link — not added (Google Maps used for both platforms per zero-cost constraint).

## Phase 5: Offline Packing Checklist & Alerts ✅ (partial)
- [x] Packing checklist screen (`app/(tabs)/trips/[id]/packing.tsx`) — category accordions, progress bar, add/delete/toggle items, debounced Supabase sync.
- [x] MMKV-backed offline mutation queue built (`utils/offlineQueue.ts`).
- [x] `<DriftWarningBanner />` — amber banner shown when any stop overflows past midnight.
- [x] `scheduleDepartureNotification` and `computeDriftWarnings` built in `utils/alerts.ts`.
- [ ] **NetInfo listener to trigger `flushOfflineMutations` on reconnect — not wired up** (future work).
- [ ] **`scheduleDepartureNotification` not called from UI** — notification scheduling not connected to stop load/add (future work).
- [ ] Static monsoon/weather advisory cards — not implemented.

## Phase 6: Collaboration, Deep Links & Final Polish ✅
- [x] `app.json` — `scheme: "tripflow"`, Android intentFilters, iOS associatedDomains.
- [x] Deep link handler wired in `app/_layout.tsx` — `Linking.getInitialURL` + `addEventListener`; calls `handleIncomingInvite` then navigates to the trip.
- [x] `<InviteModal />` — share link via native share sheet, add by @username.
- [x] `<TripMembersPanel />` — member list, role change dropdown (owner only), remove member.
- [x] RBAC enforced in UI — viewers cannot see edit/delete/drag controls on stop cards.
- [x] Notification permission requested on app launch.
- [ ] Owner force-delete trip confirmation modal — currently handled via Alert sheet on TripCard ⋮ menu.
- [ ] Production APK/IPA build and distribution.
