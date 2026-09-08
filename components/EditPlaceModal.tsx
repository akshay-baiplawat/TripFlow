import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScheduleStore } from '../stores/useScheduleStore';
import { supabase } from '../utils/supabase';
import type { Stop, StopCategory } from '../types';
import { useThemeColors } from '../utils/theme';

const CATEGORIES: StopCategory[] = ['sightseeing', 'food', 'activity', 'transit'];
const DURATION_PRESETS = [30, 60, 90, 120, 180];

interface Props {
  visible: boolean;
  stop: Stop | null;
  onClose: () => void;
}

export function EditPlaceModal({ visible, stop, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const updateStop = useScheduleStore((s) => s.updateStop);
  const [name, setName] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [category, setCategory] = useState<StopCategory>('sightseeing');
  const [duration, setDuration] = useState(60);
  const [transit, setTransit] = useState(15);
  const [highlights, setHighlights] = useState('');
  const [whatToDo, setWhatToDo] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!stop) return;
    setName(stop.name); setLocationQuery(stop.location_query); setCategory(stop.category);
    setDuration(stop.duration_minutes); setTransit(stop.transit_to_next_minutes);
    setHighlights(stop.highlights ?? ''); setWhatToDo(stop.what_to_do ?? ''); setNotes(stop.notes ?? '');
  }, [stop]);

  const handleSave = async () => {
    if (!stop || !name.trim()) return;
    const changes = {
      name: name.trim(), location_query: locationQuery.trim() || name.trim(),
      category, duration_minutes: duration, transit_to_next_minutes: transit,
      highlights: highlights.trim() || null, what_to_do: whatToDo.trim() || null,
      notes: notes.trim() || null, updated_at: new Date().toISOString(),
    };
    updateStop(stop.id, changes);
    onClose();
    const { error } = await supabase.from('stops').update(changes).eq('id', stop.id);
    if (error) {
      Alert.alert('Sync failed', 'Changes saved locally but could not sync to server. Please re-save when connection is restored.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-700" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Place</Text>
          <Pressable onPress={onClose} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600"><Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</Text></Pressable>
        </View>
        <ScrollView className="flex-1 px-5 py-5" contentContainerStyle={{ gap: 16 }}>
          <EF label="Place Name *" value={name} onChangeText={setName} />
          <EF label="Search Query" value={locationQuery} onChangeText={setLocationQuery} />
          <View>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Pressable key={c} onPress={() => setCategory(c)} className={`px-3 py-1.5 rounded-full border ${category === c ? 'bg-brand-600 border-brand-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}>
                  <Text className={`text-xs font-semibold capitalize ${category === c ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Duration</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {DURATION_PRESETS.map((p) => (
                  <Pressable key={p} onPress={() => setDuration(p)} className={`px-2.5 py-1 rounded-lg border ${duration === p ? 'bg-brand-600 border-brand-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}>
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
          <EF label="Highlights" value={highlights} onChangeText={setHighlights} multiline />
          <EF label="What to do" value={whatToDo} onChangeText={setWhatToDo} multiline />
          <EF label="Notes" value={notes} onChangeText={setNotes} multiline />
        </ScrollView>
        <View className="px-5 pb-8 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Pressable onPress={handleSave} className="bg-brand-600 rounded-2xl py-4 items-center active:scale-95">
            <Text className="text-base font-bold text-white">Save Changes</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function EF({ label, value, onChangeText, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void; multiline?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View>
      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</Text>
      <TextInput className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100" value={value} onChangeText={onChangeText} placeholderTextColor={c.textHint} multiline={multiline} numberOfLines={multiline ? 3 : 1} />
    </View>
  );
}
