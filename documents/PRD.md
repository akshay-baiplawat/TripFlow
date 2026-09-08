# Product Requirements Document (PRD) — TripFlow V1

> **Status as of 2026-08-30:** All V1 features implemented and production-ready. See `TASKS.md` for the full bug fix log and UI update notes. Pending items: unit tests for engine/fractional rank, NetInfo reconnect wiring, departure notification wiring from day.tsx.

## 1. Executive Summary
TripFlow is a mobile SaaS designed to solve schedule rigidity during group and solo trips. When real-world conditions deviate from the plan (monsoons, wake-up delays, transit traffic), TripFlow dynamically recalculates the entire day's schedule across all participants while providing instant maps navigation, offline checklists, and group alerts.

## 2. Target Personas
- **Trip Planners / Group Leaders:** Need to design, reorder, and tweak schedules without breaking time continuity.
- **Active Travelers & Pillions:** Need 1-tap navigation, offline access in poor coverage zones, and live alerts for departure countdowns.
- **Group Collaborators:** Want shared packing checklists, friend invites, and synchronized trip updates.

## 3. Core Feature Specifications

### 3.1 Authentication & Extended Profiles
- **Auth Methods ($0 Free Tier):** Anonymous / Guest Mode (instant trial), Google OAuth, and Email Magic Link.
- **User Profile Fields:**
  - `id` (UUID), `full_name` (Text), `username` (Unique string for friend search), `email` (Text)
  - `phone_number` (Text contact field), `gender` (Enum: `male`, `female`, `non_binary`, `prefer_not_to_say`)
  - `avatar_url` (Text/Storage URL), `bio` (Text), `emergency_contact_name`, `emergency_contact_phone`

### 3.2 Trip Dashboard & Lifecycle
- **Trip Creation:** Title, Destination, Transport Mode (Scooter, Car, Transit), Date Range.
- **Status Lifecycle:** `Planning` (Drafting & editing), `Active` (Live trip mode with auto-highlighted current stop), `Archived` (Completed, read-only with cloning option).
- **Multi-Trip Switcher:** Tabbed organization into Active, Upcoming, and Past trips.

### 3.3 Dynamic Schedule Engine
- **Day Start Time Picker:** Native time input that shifts all subsequent stops automatically.
- **Cascading Stop Card Controls:**
  - Dynamic start/end time display computed in real-time.
  - Category tags (`Sightseeing`, `Food`, `Activity`, `Transit`).
  - Status Action Pills:
    - `Pending`: Default view.
    - `Visited`: Checkmark, maintains duration, logs completion.
    - `Skip`: Strikethrough style; dynamically deducts duration and pulls forward remaining stops.
  - Interactive inputs for Stop Duration (minutes) and Transit to Next Stop (minutes).
  - **Collapsible "What to do" Accordion:** Detailed location advice, defaults to collapsed, persists open/close state.
  - **Collapsible "Notes" Accordion:** Booking references, ticket links, and reminders with local persistence.
  - **Card Controls:** Drag handle for reordering, Edit Modal trigger, and Delete action.
- **Undo / Redo System:** Side-by-side header controls supporting full rollback and roll-forward across time adjustments, reorders, additions, and deletions.

### 3.4 Navigation Deep-Linking
- 1-Tap Google Maps / Apple Maps search query deep link.
- "Directions from Previous Stop" deep link pre-populating Origin and Destination coordinates.

### 3.5 Offline Master Packing Checklist
- Dual-layer list: Shared Group Gear (with assigned member tags) and Private Personal Items.
- Category filters: Documents & Essentials, Monsoon & Ride Gear, Electronics, Clothing, Toiletries & First Aid.
- Progress bar displaying percentage and fractional completion (`14/20 Packed`).
- Add custom items and delete items with instant persistence.

### 3.6 Collaboration & Role-Based Access (RBAC)
- **Roles:**
  - `Owner`: Full management, invite generation, member role assignment, force-delete trip with confirmation.
  - `Editor`: Add, edit, delete, reorder stops, modify durations, check packing items, add notes.
  - `Viewer`: View schedules, launch navigation, check personal packing items, add notes.
- **Friend Search:** Search platform users by `@username` and dispatch 1-tap trip invites.
- **Universal Links:** Shareable `tripflow://trip/[id]` link that auto-joins guests to the trip.

### 3.7 Intelligent Alert System
- **Schedule Drift Alert:** Warning banner if a stop exceeds planned duration or if the schedule exceeds 23:59 (+1 Day overflow tag).
- **Transit Departure Countdown:** Local push notification 15 minutes before the next planned transit window.
- **Collaborator Toast:** In-app visual notification when a partner updates times or reorders stops.