import { useState } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Plus, RotateCcw, RotateCw, Clock } from 'lucide-react-native';
import { useScheduleStore } from '../stores/useScheduleStore';
import { formatMinutesToTime } from '../utils/timelineEngine';
import { useThemeColors } from '../utils/theme';
import type { ItineraryDay, Stop } from '../types';

interface Props {
  day: ItineraryDay;
  onAddPlace: () => void;
  canEdit: boolean;
}

function minutesToDate(minutes: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export function DayMetaCard({ day, onAddPlace, canEdit }: Props) {
  const setDayStartTime = useScheduleStore((s) => s.setDayStartTime);
  const undo = useScheduleStore((s) => s.undo);
  const redo = useScheduleStore((s) => s.redo);
  const canUndo = useScheduleStore((s) => s.undoStack.length > 0);
  const canRedo = useScheduleStore((s) => s.redoStack.length > 0);
  const [showPicker, setShowPicker] = useState(false);
  const c = useThemeColors();

  const visitedCount = day.stops.filter((s: Stop) => s.status === 'visited').length;
  const totalCount = day.stops.filter((s: Stop) => s.status !== 'skipped').length;
  const progress = totalCount > 0 ? visitedCount / totalCount : 0;
  const { timeStr } = formatMinutesToTime(day.start_time_minutes);

  return (
    <View className="mx-4 mb-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <View className="h-1.5 bg-slate-100 dark:bg-slate-700">
        <View className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
      </View>

      <View className="px-4 py-3 gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Clock color={c.brand} size={15} />
            <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400">Start:</Text>
            {canEdit ? (
              <Pressable
                onPress={() => setShowPicker(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.brandBg, borderWidth: 1, borderColor: c.brandBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.brand }}>{timeStr}</Text>
              </Pressable>
            ) : (
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400">{timeStr}</Text>
            )}
          </View>
          <View className="flex-row items-center gap-1">
            <Pressable onPress={undo} disabled={!canUndo} className={`p-2 rounded-lg ${canUndo ? 'active:bg-slate-100 dark:active:bg-slate-700' : 'opacity-30'}`}>
              <RotateCcw color={c.textMuted} size={16} />
            </Pressable>
            <Pressable onPress={redo} disabled={!canRedo} className={`p-2 rounded-lg ${canRedo ? 'active:bg-slate-100 dark:active:bg-slate-700' : 'opacity-30'}`}>
              <RotateCw color={c.textMuted} size={16} />
            </Pressable>
          </View>
        </View>

        {showPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={minutesToDate(day.start_time_minutes)}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={(_: unknown, selected?: Date) => {
              setShowPicker(false);
              if (selected) {
                setDayStartTime(day.id, selected.getHours() * 60 + selected.getMinutes());
              }
            }}
          />
        )}

        {showPicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
              <View style={{ backgroundColor: c.card, paddingBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 8 }}>
                  <Pressable onPress={() => setShowPicker(false)} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: c.brand }}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={minutesToDate(day.start_time_minutes)}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={(_: unknown, selected?: Date) => {
                    if (selected) {
                      setDayStartTime(day.id, selected.getHours() * 60 + selected.getMinutes());
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-slate-500 dark:text-slate-400">{visitedCount}/{totalCount} stops visited</Text>
          {canEdit && (
            <Pressable onPress={onAddPlace} className="flex-row items-center gap-1.5 bg-brand-600 px-3 py-1.5 rounded-xl active:scale-95">
              <Plus color="white" size={14} />
              <Text className="text-xs font-bold text-white">Add Place</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
