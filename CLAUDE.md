# TripFlow — Master Developer & AI Agent Guide

## 1. Project Overview & Architecture
TripFlow is a zero-cost, local-first, collaborative mobile travel companion built for Android and iOS. It features a real-time cascading schedule engine, drag-and-drop timeline reordering, dual-stack Undo/Redo state management, an offline packing checklist, role-based collaboration, and an intelligent drift alert system.

## 2. Tech Stack & Dependencies
- **Framework:** React Native with Expo (SDK 51+, Expo Router v3, TypeScript Strict)
- **Styling:** NativeWind v4 (Tailwind CSS)
- **State Management:** Zustand (with Dual-Stack Undo/Redo Command Pattern)
- **Local Persistence:** `react-native-mmkv` (High-speed synchronous key-value storage)
- **Backend & Auth:** Supabase (PostgreSQL, Row-Level Security, Realtime, Anonymous + Google + Email Magic Links)
- **Icons & Haptics:** `lucide-react-native`, `expo-haptics`, `expo-notifications`, `expo-linking`
- **Reordering:** `@react-native-aria/interactions` or `react-native-reanimated` (60 FPS smooth gestures)

## 3. Strict Development Guardrails
1. **Time Calculation Integrity:** NEVER store or compute itinerary times using UTC ISO dates. All timeline calculations MUST use **destination-local minutes from midnight** (e.g., `06:30` = `390`, `14:45` = `885`). Timeline math is purely mathematical and invariant to phone clock timezones.
2. **Zero-Cost Constraint:** NEVER integrate paid third-party APIs (no Google Places Autocomplete API, no paid SMS OTP gateways). Use OpenStreetMap/Photon for free text lookups and platform native deep links (`https://www.google.com/maps/search/?api=1&query=...`) for outbound navigation.
3. **Fractional Indexing for Reordering:** NEVER use sequential integer arrays for reordering stops (`order: 1, 2, 3`). Always use floating-point `order_rank` to enable O(1) single-row reorder updates without cascading database write locks.
4. **Optimistic Local-First UI:** Local state updates instantly in MMKV/Zustand (0 ms). All remote database sync calls MUST be debounced (800ms–1200ms) to conserve Supabase free-tier API quotas.
5. **No Placeholders:** All code generated must be complete, strictly typed (zero `any`), and production-ready.

## 4. Key CLI Commands
- `npx expo start` : Start local Expo development server
- `npx expo run:android` : Run on local Android emulator / device
- `npx expo run:ios` : Run on local iOS simulator / device
- `npx supabase db push` : Apply schema migrations to Supabase
- `npm run lint` : Run TypeScript and ESLint verification