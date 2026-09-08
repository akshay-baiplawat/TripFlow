import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScheduleStore } from '../stores/useScheduleStore';
import { useThemeColors } from '../utils/theme';
import { supabase } from '../utils/supabase';
import type { Stop, StopCategory } from '../types';

const CATEGORIES: StopCategory[] = ['sightseeing', 'food', 'activity', 'transit'];
const DURATION_PRESETS = [30, 60, 90, 120, 180];

interface Props {
  visible: boolean;
  dayId: string;
  onClose: () => void;
}

export function AddPlaceModal({ visible, dayId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const addStop = useScheduleStore((s) => s.addStop);
  const trips = useScheduleStore((s) => s.trips);
  const [name, setName] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [category, setCategory] = useState<StopCategory>('sightseeing');
  const [duration, setDuration] = useState(60);
  const [transit, setTransit] = useState(15);
  const [highlights, setHighlights] = useState('');
  const [whatToDo, setWhatToDo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setLocationQuery(''); setCategory('sightseeing');
    setDuration(60); setTransit(15); setHighlights(''); setWhatToDo(''); setNotes('');
  };

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Place name is required.'); return; }
    setSaving(true);
    try {
      const dayStops = trips.flatMap((t) => t.days).find((d) => d.id === dayId)?.stops ?? [];
      const order_rank = (dayStops[dayStops.length - 1]?.order_rank ?? 0) + 1000;
      const now = new Date().toISOString();
      const { data: inserted, error } = await supabase
        .from('stops')
        .insert({
          day_id: dayId, name: name.trim(),
          location_query: locationQuery.trim() || name.trim(),
          category, duration_minutes: duration, transit_to_next_minutes: transit,
          status: 'pending', order_rank,
          highlights: highlights.trim() || null, what_to_do: whatToDo.trim() || null,
          notes: notes.trim() || null, is_what_to_do_open: false, is_notes_open: false,
          created_at: now, updated_at: now,
        })
        .select()
        .single();
      if (error || !inserted) { Alert.alert('Error', error?.message ?? 'Could not add stop'); return; }
      addStop(inserted as Stop);
      reset();
      onClose();
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-slate-800">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-700" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Add Place</Text>
          <Pressable onPress={() => { reset(); onClose(); }} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200">
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</Text>
          </Pressable>
        </View>
        <ScrollView className="flex-1 px-5 py-5" contentContainerStyle={{ gap: 16 }}>
          <MF label="Place Name *" value={name} onChangeText={setName} placeholder="e.g. Dudhsagar Falls" />
          <MF label="Google Maps Link / Search Query" value={locationQuery} onChangeText={setLocationQuery} placeholder="Paste Maps URL or e.g. Dudhsagar Falls Goa" />
          <View>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Pressable key={cat} onPress={() => setCategory(cat)} className={`px-3 py-1.5 rounded-full border ${category === cat ? 'bg-brand-600 border-brand-600' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
                  <Text className={`text-xs font-semibold capitalize ${category === cat ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Duration</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {DURATION_PRESETS.map((p) => (
                  <Pressable key={p} onPress={() => setDuration(p)} className={`px-2.5 py-1 rounded-lg border ${duration === p ? 'bg-brand-600 border-brand-600' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
                    <Text className={`text-xs font-medium ${duration === p ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{p < 60 ? `${p}m` : `${p / 60}h`}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Transit to next</Text>
              <View className="flex-row items-center gap-2">
                <Pressable onPress={() => setTransit(Math.max(0, transit - 5))} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg items-center justify-center"><Text className="text-base font-bold text-slate-600 dark:text-slate-300">-</Text></Pressable>
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200 w-10 text-center">{transit}m</Text>
                <Pressable onPress={() => setTransit(transit + 5)} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg items-center justify-center"><Text className="text-base font-bold text-slate-600 dark:text-slate-300">+</Text></Pressable>
              </View>
            </View>
          </View>
          <MF label="Highlights" value={highlights} onChangeText={setHighlights} placeholder="What makes this place special?" multiline />
          <MF label="What to do" value={whatToDo} onChangeText={setWhatToDo} placeholder="Activities, tips, must-sees..." multiline />
          <MF label="Notes" value={notes} onChangeText={setNotes} placeholder="Personal reminders..." multiline />
        </ScrollView>
        <View className="px-5 pb-8 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Pressable onPress={handleAdd} disabled={saving} className="bg-brand-600 rounded-2xl py-4 items-center active:scale-95">
            {saving ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">Add to Itinerary</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function MF({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View>
      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</Text>
      <TextInput className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white" value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.textHint} multiline={multiline} numberOfLines={multiline ? 3 : 1} />
    </View>
  );
}
