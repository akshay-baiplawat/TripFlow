# Dual-Stack Undo & Redo Command Pattern

> **Status as of 2026-08-30:** Fully implemented in `stores/useScheduleStore.ts`. Undo/Redo buttons are rendered in `<DayMetaCard />`. Max depth: 30 snapshots. Tested manually; automated unit tests not yet written (tracked in `TASKS.md`).

---

## Design

Rather than a Command Object pattern (tracking discrete operations), TripFlow uses **JSON snapshot stacks**. Before every user-initiated mutation the entire `days` array is serialised to JSON and pushed onto `undoStack`. On undo, the top snapshot is popped and restored; the prior live state is pushed onto `redoStack`. This is simple, covers all mutation types uniformly, and costs only serialisation time (typically <2ms for a typical day's stops).

**Trade-off:** Snapshot approach uses more memory than command objects for large histories, but the 30-snapshot cap bounds this to a practical maximum.

---

## Store Interface

```typescript
interface ScheduleState {
  days: ItineraryDay[];
  undoStack: string[];   // JSON snapshots, newest last
  redoStack: string[];   // JSON snapshots, newest last

  recordSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  // ... all mutators call recordSnapshot() before applying changes
}
```

## Core Implementation (`stores/useScheduleStore.ts`)

```typescript
recordSnapshot: () => {
  const currentState = JSON.stringify(get().days);
  set((state) => ({
    undoStack: [...state.undoStack.slice(-30), currentState],
    redoStack: [],  // any new user action invalidates redo history
  }));
},

undo: () => {
  const { undoStack, days, redoStack } = get();
  if (undoStack.length === 0) return;
  const previousSnapshot = undoStack[undoStack.length - 1];
  const currentSnapshot = JSON.stringify(days);
  set({
    days: JSON.parse(previousSnapshot),
    undoStack: undoStack.slice(0, -1),
    redoStack: [...redoStack, currentSnapshot],
  });
},

redo: () => {
  const { redoStack, days, undoStack } = get();
  if (redoStack.length === 0) return;
  const nextSnapshot = redoStack[redoStack.length - 1];
  const currentSnapshot = JSON.stringify(days);
  set({
    days: JSON.parse(nextSnapshot),
    redoStack: redoStack.slice(0, -1),
    undoStack: [...undoStack, currentSnapshot],
  });
},
```

---

## UI Integration

- `canUndo` = `undoStack.length > 0` — drives disabled state of the Undo button in `<DayMetaCard />`.
- `canRedo` = `redoStack.length > 0` — drives disabled state of the Redo button.
- Buttons render as `<RotateCcw />` / `<RotateCw />` icons from `lucide-react-native`.
- Disabled buttons render at 30% opacity.
