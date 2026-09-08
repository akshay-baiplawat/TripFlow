import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import debounce from 'lodash/debounce';
import type { Trip, Stop, PackingItem } from '../types';
import { calculateNewRank, needsRebalance, rebalanceRanks } from '../utils/fractionalRank';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/mmkv';

const MAX_UNDO = 30;

interface ScheduleState {
  trips: Trip[];
  activeTripId: string | null;
  activeDayIndex: number;
  undoStack: string[];
  redoStack: string[];
}

interface ScheduleActions {
  setTrips: (trips: Trip[]) => void;
  setActiveTripId: (id: string | null) => void;
  setActiveDayIndex: (index: number) => void;
  setDayStartTime: (dayId: string, minutes: number) => void;
  setStopStatus: (stopId: string, status: Stop['status']) => void;
  updateStopDuration: (stopId: string, minutes: number) => void;
  updateStopTransit: (stopId: string, minutes: number) => void;
  updateStopNotes: (stopId: string, notes: string) => void;
  reorderStop: (dayId: string, fromIndex: number, toIndex: number) => void;
  addStop: (stop: Stop) => void;
  updateStop: (stopId: string, changes: Partial<Omit<Stop, 'id'>>) => void;
  deleteStop: (stopId: string) => void;
  toggleAccordion: (stopId: string, field: 'is_what_to_do_open' | 'is_notes_open') => void;
  upsertTrip: (trip: Trip) => void;
  updateTrip: (tripId: string, changes: Partial<Omit<Trip, 'id'>>) => void;
  deleteTrip: (tripId: string) => void;
  undo: () => void;
  redo: () => void;
  togglePackingItem: (itemId: string) => void;
  addPackingItem: (item: PackingItem) => void;
  deletePackingItem: (itemId: string) => void;
}

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => { storage.set(name, value); },
  removeItem: (name: string) => { storage.remove(name); },
};

const syncStops = debounce(async (_dayId: string, stops: Stop[]) => {
  const results = await Promise.all(
    stops.map((s) =>
      supabase.from('stops').update({
        order_rank: s.order_rank,
        duration_minutes: s.duration_minutes,
        transit_to_next_minutes: s.transit_to_next_minutes,
        status: s.status,
        notes: s.notes,
        is_what_to_do_open: s.is_what_to_do_open,
        is_notes_open: s.is_notes_open,
        updated_at: new Date().toISOString(),
      }).eq('id', s.id),
    ),
  );
  if (__DEV__) {
    results.forEach(({ error }) => {
      if (error) console.warn('[syncStops] update failed:', error.code, error.message);
    });
  }
}, 1000);

function snap(trips: Trip[]): string {
  return JSON.stringify(trips);
}

function withUndo(
  state: ScheduleState,
  currentSnap: string,
): Pick<ScheduleState, 'undoStack' | 'redoStack'> {
  const next = [...state.undoStack, currentSnap];
  return {
    undoStack: next.length > MAX_UNDO ? next.slice(1) : next,
    redoStack: [],
  };
}

function mapStops(
  trips: Trip[],
  predicate: (s: Stop) => boolean,
  updater: (s: Stop) => Stop,
): Trip[] {
  return trips.map((t) => ({
    ...t,
    days: t.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (predicate(s) ? updater(s) : s)),
    })),
  }));
}

export const useScheduleStore = create<ScheduleState & ScheduleActions>()(
  persist(
    (set) => ({
      trips: [],
      activeTripId: null,
      activeDayIndex: 0,
      undoStack: [],
      redoStack: [],

      setTrips: (trips) => set({ trips }),
      setActiveTripId: (activeTripId) => set({ activeTripId }),
      setActiveDayIndex: (activeDayIndex) => set({ activeDayIndex }),

      setDayStartTime: (dayId, minutes) =>
        set((s) => {
          const currentSnap = snap(s.trips);
          supabase.from('itinerary_days').update({ start_time_minutes: minutes }).eq('id', dayId);
          return {
            trips: s.trips.map((t) => ({
              ...t,
              days: t.days.map((d) =>
                d.id === dayId ? { ...d, start_time_minutes: minutes } : d,
              ),
            })),
            ...withUndo(s, currentSnap),
          };
        }),

      setStopStatus: (stopId, status) =>
        set((s) => {
          const currentSnap = snap(s.trips);
          const newTrips = mapStops(
            s.trips,
            (stop) => stop.id === stopId,
            (stop) => ({ ...stop, status }),
          );
          const day = newTrips
            .flatMap((t) => t.days)
            .find((d) => d.stops.some((st) => st.id === stopId));
          if (day) syncStops(day.id, day.stops);
          return { trips: newTrips, ...withUndo(s, currentSnap) };
        }),

      updateStopDuration: (stopId, minutes) =>
        set((s) => {
          const currentSnap = snap(s.trips);
          const newTrips = mapStops(
            s.trips,
            (st) => st.id === stopId,
            (st) => ({ ...st, duration_minutes: minutes }),
          );
          const day = newTrips
            .flatMap((t) => t.days)
            .find((d) => d.stops.some((st) => st.id === stopId));
          if (day) syncStops(day.id, day.stops);
          return { trips: newTrips, ...withUndo(s, currentSnap) };
        }),

      updateStopTransit: (stopId, minutes) =>
        set((s) => {
          const currentSnap = snap(s.trips);
          const newTrips = mapStops(
            s.trips,
            (st) => st.id === stopId,
            (st) => ({ ...st, transit_to_next_minutes: minutes }),
          );
          const day = newTrips
            .flatMap((t) => t.days)
            .find((d) => d.stops.some((st) => st.id === stopId));
          if (day) syncStops(day.id, day.stops);
          return { trips: newTrips, ...withUndo(s, currentSnap) };
        }),

      updateStopNotes: (stopId, notes) =>
        set((s) => {
          const newTrips = mapStops(
            s.trips,
            (st) => st.id === stopId,
            (st) => ({ ...st, notes }),
          );
          const day = newTrips
            .flatMap((t) => t.days)
            .find((d) => d.stops.some((st) => st.id === stopId));
          if (day) syncStops(day.id, day.stops);
          return { trips: newTrips };
        }),

      reorderStop: (dayId, fromIndex, toIndex) =>
        set((s) => {
          const currentSnap = snap(s.trips);
          const newTrips = s.trips.map((t) => ({
            ...t,
            days: t.days.map((d) => {
              if (d.id !== dayId) return d;
              const stops = [...d.stops];
              const [moved] = stops.splice(fromIndex, 1);
              if (!moved) return d;
              stops.splice(toIndex, 0, moved);

              const prevRank = toIndex > 0 ? (stops[toIndex - 1]?.order_rank ?? null) : null;
              const nextRank =
                toIndex < stops.length - 1 ? (stops[toIndex + 1]?.order_rank ?? null) : null;

              let finalStops: Stop[];
              if (
                prevRank !== null &&
                nextRank !== null &&
                needsRebalance(prevRank, nextRank)
              ) {
                const ranks = rebalanceRanks(stops.length);
                finalStops = stops.map((st, i) => ({
                  ...st,
                  order_rank: ranks[i] ?? st.order_rank,
                }));
              } else {
                const newRank = calculateNewRank(prevRank, nextRank);
                finalStops = stops.map((st, i) =>
                  i === toIndex ? { ...st, order_rank: newRank } : st,
                );
              }
              syncStops(dayId, finalStops);
              return { ...d, stops: finalStops };
            }),
          }));
          return { trips: newTrips, ...withUndo(s, currentSnap) };
        }),

      addStop: (stop) =>
        set((s) => {
          const currentSnap = snap(s.trips);
          const newTrips = s.trips.map((t) => ({
            ...t,
            days: t.days.map((d) => {
              if (d.id !== stop.day_id) return d;
              return { ...d, stops: [...d.stops, stop] };
            }),
          }));
          return { trips: newTrips, ...withUndo(s, currentSnap) };
        }),

      updateStop: (stopId, changes) =>
        set((s) => {
          const currentSnap = snap(s.trips);
          return {
            trips: mapStops(
              s.trips,
              (st) => st.id === stopId,
              (st) => ({ ...st, ...changes }),
            ),
            ...withUndo(s, currentSnap),
          };
        }),

      deleteStop: (stopId) => {
        supabase.from('stops').delete().eq('id', stopId);
        set((s) => {
          const currentSnap = snap(s.trips);
          return {
            trips: s.trips.map((t) => ({
              ...t,
              days: t.days.map((d) => ({
                ...d,
                stops: d.stops.filter((st) => st.id !== stopId),
              })),
            })),
            ...withUndo(s, currentSnap),
          };
        });
      },

      toggleAccordion: (stopId, field) =>
        set((s) => ({
          trips: mapStops(
            s.trips,
            (st) => st.id === stopId,
            (st) => ({ ...st, [field]: !st[field] }),
          ),
        })),

      upsertTrip: (trip) =>
        set((s) => ({
          trips: s.trips.some((t) => t.id === trip.id)
            ? s.trips.map((t) => (t.id === trip.id ? trip : t))
            : [...s.trips, trip],
        })),

      updateTrip: (tripId, changes) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === tripId ? { ...t, ...changes } : t)),
        })),

      deleteTrip: (tripId) => {
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== tripId),
          activeTripId: s.activeTripId === tripId ? null : s.activeTripId,
        }));
      },

      undo: () =>
        set((s) => {
          if (s.undoStack.length === 0) return s;
          const prev = s.undoStack[s.undoStack.length - 1] as string;
          return {
            trips: JSON.parse(prev) as Trip[],
            undoStack: s.undoStack.slice(0, -1),
            redoStack: [snap(s.trips), ...s.redoStack],
          };
        }),

      redo: () =>
        set((s) => {
          if (s.redoStack.length === 0) return s;
          const next = s.redoStack[0] as string;
          return {
            trips: JSON.parse(next) as Trip[],
            undoStack: [...s.undoStack, snap(s.trips)],
            redoStack: s.redoStack.slice(1),
          };
        }),

      togglePackingItem: (itemId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== s.activeTripId
              ? t
              : {
                  ...t,
                  packingItems: t.packingItems.map((i) =>
                    i.id === itemId ? { ...i, is_checked: !i.is_checked } : i,
                  ),
                },
          ),
        })),

      addPackingItem: (item) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== s.activeTripId
              ? t
              : { ...t, packingItems: [...t.packingItems, item] },
          ),
        })),

      deletePackingItem: (itemId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== s.activeTripId
              ? t
              : {
                  ...t,
                  packingItems: t.packingItems.filter((i) => i.id !== itemId),
                },
          ),
        })),
    }),
    {
      name: 'tripflow-schedule',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({
        trips: s.trips,
        activeTripId: s.activeTripId,
        activeDayIndex: s.activeDayIndex,
      }),
    },
  ),
);

// Convenience selector for the active trip
export function selectActiveTrip(s: ScheduleState): Trip | undefined {
  return s.trips.find((t) => t.id === s.activeTripId);
}
