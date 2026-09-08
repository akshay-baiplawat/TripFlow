# UI / UX Component & Screen Architecture

> **Status as of 2026-08-30:** All screens and components implemented. Notable deviations from original spec are noted per section below.

---

## 1. Design System & Tokens

- **Palette:** Emerald (`brand-600: #059669`, `brand-500: #10b981`), Slate (`slate-900: #0f172a`, `slate-50: #f8fafc`), Amber (Warnings), Rose (Deletions/Skips).
- **Typography:** System Font (Inter via NativeWind), monospace-weight strings for computed time values.
- **Haptics:** `expo-haptics` — drag start uses `ImpactFeedbackStyle.Light`; status toggles use `NotificationFeedbackType.Success`. *(Haptics on drag not yet wired — tracked in `TASKS.md`.)*

---

## 2. Screen & Component Hierarchy

### Screen 1: Trip Dashboard (`/trips/index`) ✅

- **Header:** Time-based greeting + user avatar (image if `avatar_url` set; emerald initials circle otherwise). *(Replaced original static "My Trips" title — 2026-08-30)*
- Tab Selector: `Active` | `Upcoming` | `Archived` — selection persisted in MMKV.
- Trip Card: destination, title, dates, role badge (`Owner`/`Editor`/`Viewer`), member avatar stack.
- FAB `+` to create new trip.

### Screen 2: Day Itinerary View (`/trips/[id]/day`) ✅

- **Sticky Header:** Day Tabs (Day 1, Day 2…, Gear Checklist tab), Undo & Redo buttons.
- **Day Meta Card (`<DayMetaCard />`):**
  - Native `DateTimePicker` for start time — Android: inline dismiss; iOS: slide-up Modal with Done button. *(Replaced original preset button grid — 2026-08-30)*
  - Add Place trigger, progress bar, visited/total counter.
- **Draggable Timeline Cards (`<StopCard />`):**
  - Drag grip handle.
  - Computed Arrival → Departure times (e.g. `06:30 AM → 08:30 AM`).
  - Category badge (Sightseeing / Food / Activity / Transit).
  - Status pills: Pending / Visited / Skip.
  - Edit (pencil) + Delete (trash) with confirmation.
  - Place name + highlights with sparkle icon.
  - Collapsible "What to do" accordion (persists `is_what_to_do_open`).
  - Duration stepper (5-min steps) + Transit stepper (5-min steps).
  - Collapsible Notes accordion (persists `is_notes_open`).
  - Google Maps deep link (`https://www.google.com/maps/search/?api=1&query=...`).
- **Transit Dividers:** Dashed vertical line with transit minutes.
- **Scroll + drag:** `NestableScrollContainer` + `NestableDraggableFlatList` from `react-native-draggable-flatlist`. *(Replaced broken ScrollView nesting — 2026-08-30)*
- **RBAC:** Viewers see no edit/delete/drag controls.

### Screen 3: Add / Edit Place Modals ✅

- `<AddPlaceModal />` and `<EditPlaceModal />` — fields: Name, Google Maps Link / Search Query, Category, Duration, Transit to Next, Highlights, What to do, Notes.
- `<EditPlaceModal />` uses optimistic local update + async Supabase sync with failure alert. *(Bug fixed 2026-08-30)*

### Screen 4: Packing Checklist (`/trips/[id]/packing`) ✅

- Progress bar + `X/Y packed` counter.
- Quick-add form with category picker.
- Category accordion sections with checkbox toggles and delete.
- Delete confirms Supabase success before removing from local state. *(Bug fixed 2026-08-30)*

### Screen 5: Extended Profile (`/profile`) ✅

- Full Name, `@username`, Email, Phone, Gender, Bio, Emergency Contacts.
- Debounced auto-save (800ms) to `profiles` table via `upsert`.
- Live `@username` uniqueness check.

---

## 3. Animated Splash Screen (`app/_layout.tsx`) ✅

New as of 2026-08-30 — replaces static Expo splash.

- White background.
- App icon springs in from scale 0.4 → 1.0 with `useNativeDriver`.
- Green ripple ring loops continuously behind the icon.
- Title slides up from below; subtitle fades in; three dots pulse with staggered delay.

---

## 4. Deviations from Original Spec

| Original Spec | Actual Implementation |
| --- | --- |
| Static "My Trips" header | Avatar + time-based greeting |
| Preset start-time buttons | Native `DateTimePicker` |
| `ScrollView` + `DraggableFlatList` nesting | `NestableScrollContainer` + `NestableDraggableFlatList` |
| Order badge + status dropdown on stop card | Status pills, no separate dropdown |
| Apple Maps link on stop cards | Google Maps only (zero-cost constraint) |
| Haptics on drag start | Not yet wired |
