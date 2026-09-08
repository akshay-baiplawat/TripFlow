# Dynamic Cascading Engine & Undo/Redo Specifications

> **Status as of 2026-08-30:** Fully implemented in `utils/timelineEngine.ts` and `stores/useScheduleStore.ts`. All cascading rules, time formatting, and dual-stack undo/redo are live. Unit tests not yet written (tracked in `TASKS.md`).

---

## 1. Cascading Time Calculation Engine

All calculations are performed strictly with integer minutes starting from midnight ([0, 1439]).

### Mathematical Rules

Let S_i represent stop i in a scheduled day:

- `StartOfDay = day.start_time_minutes`
- For the first stop (i = 0): `Arrival_0 = StartOfDay`
- For subsequent stops (i > 0): `Arrival_i = Departure_{i-1} + EffectiveTransit_{i-1}`
- For all stops:
  - `EffectiveDuration_i = (status_i == 'skipped') ? 0 : duration_minutes_i`
  - `EffectiveTransit_i  = (status_i == 'skipped') ? 0 : transit_to_next_minutes_i`
  - `Departure_i = Arrival_i + EffectiveDuration_i`

### Time Formatting Algorithm (`utils/timelineEngine.ts`)

```typescript
export function formatMinutesToTime(totalMinutes: number): { timeStr: string; isNextDay: boolean } {
  const isNextDay = totalMinutes >= 1440;
  let normalized = totalMinutes % 1440;
  if (normalized < 0) normalized += 1440;

  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return {
    timeStr: `${displayHours}:${displayMinutes} ${period}`,
    isNextDay,
  };
}
```

### Cascading Compute (`utils/timelineEngine.ts`)

`computeDynamicSchedule(day: ItineraryDay): ComputedStop[]` — iterates stops sorted by `order_rank`, applying the rules above. Returns enriched `ComputedStop[]` with `arrivalMinutes` and `departureMinutes` attached to each stop.

---

## 2. Undo / Redo System (`stores/useScheduleStore.ts`)

### Design

- **Mechanism:** JSON snapshot of entire `days` array, stored in two stacks (`undoStack`, `redoStack`).
- **Max depth:** 30 snapshots per stack.
- **Trigger:** Every user-initiated mutation (status change, duration edit, transit edit, reorder, add, delete, notes edit) calls `recordSnapshot()` before applying the change.
- **Redo invalidation:** Any new user action clears `redoStack`.

### Stack Operations

```text
recordSnapshot():  push JSON.stringify(days) onto undoStack (capped at 30); clear redoStack
undo():            pop undoStack → restore days; push prior state onto redoStack
redo():            pop redoStack → restore days; push prior state onto undoStack
```

---

## 3. Key Invariants

- **No UTC dates.** Time values are always `INT` minutes from midnight, invariant to device timezone.
- **Skipped stops contribute 0** to both duration and transit in cascade calculations.
- **`isNextDay` flag** is surfaced by `computeDynamicSchedule` and used by `DriftWarningBanner` when any stop overflows past minute 1439.
