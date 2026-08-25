interface ScheduleState {
  days: ItineraryDay[];
  undoStack: string[];
  redoStack: string[];
  
  // Actions
  recordSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  updateDuration: (stopId: string, minutes: number) => void;
  reorderStop: (dayId: string, fromIndex: number, toIndex: number) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  days: [],
  undoStack: [],
  redoStack: [],

  recordSnapshot: () => {
    const currentState = JSON.stringify(get().days);
    set((state) => ({
      undoStack: [...state.undoStack.slice(-30), currentState],
      redoStack: [] // Clear redo stack on new user action
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
      redoStack: [...redoStack, currentSnapshot]
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
      undoStack: [...undoStack, currentSnapshot]
    });
  }
}));