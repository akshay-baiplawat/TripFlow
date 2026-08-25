---

### `TASKS.md`

```markdown
# Implementation Roadmap & Developer Task Checklist

## Phase 1: Project Initialization & Core Framework
- [ ] Initialize Expo project: `npx create-expo-app TripFlow -t tabs` with TypeScript.
- [ ] Configure `NativeWind v4` and Tailwind tokens in `tailwind.config.js`.
- [ ] Set up `lucide-react-native`, `expo-haptics`, `expo-notifications`, and `expo-linking`.
- [ ] Initialize Supabase client (`utils/supabase.ts`) with AsyncStorage/MMKV persistence adapter.

## Phase 2: Database Schema & Authentication
- [ ] Execute SQL schema migrations from `DATABASE_SCHEMA.md` on Supabase.
- [ ] Implement Supabase Auth flow: Anonymous Sign-in, Google OAuth, and Email Magic Link.
- [ ] Build User Profile edit screen with username, phone, gender, and emergency contacts.
- [ ] Implement `@username` search query function for friend discovery.

## Phase 3: Dynamic Schedule Engine & State Architecture
- [ ] Create Zustand store with Dual-Stack Undo/Redo command pattern (`stores/useScheduleStore.ts`).
- [ ] Implement minutes-from-midnight mathematical engine (`utils/timelineEngine.ts`).
- [ ] Implement Fractional Indexing rank calculator for reordering (`utils/fractionalRank.ts`).
- [ ] Build unit tests verifying that skipping a stop deducts duration and pulls subsequent stops forward.

## Phase 4: Itinerary UI & Interactive Timeline
- [ ] Build `<DayTabs />` sticky navigation bar with Undo, Redo, and Reset triggers.
- [ ] Build `<StopCard />` with dynamic timing labels, category badges, and Pending/Visited/Skip actions.
- [ ] Implement collapsible **"What to do"** and **"Notes"** accordions with state persistence.
- [ ] Implement drag-and-drop reordering with haptic feedback.
- [ ] Build `<AddPlaceModal />` and `<EditPlaceModal />` with duration and transit buffer steppers.
- [ ] Connect Google Maps and Apple Maps deep linking navigation buttons.

## Phase 5: Offline Packing Checklist & Alerts
- [ ] Build `<PackingChecklist />` with category sections, custom item addition, and progress tracking.
- [ ] Integrate local-first MMKV persistence and offline mutation queue.
- [ ] Implement schedule drift warning indicators and local notification departure countdowns.
- [ ] Add static monsoon and weather advisory cards.

## Phase 6: Collaboration, Deep Links & Final Polish
- [ ] Configure `app.json` URL scheme (`tripflow://`).
- [ ] Build Universal Deep Link listener to auto-join users via invite links.
- [ ] Implement Owner force-delete trip modal with warning confirmation.
- [ ] Build production test APK / IPA and distribute via Firebase App Distribution / Expo Go.