import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, TextInput, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react-native';
import debounce from 'lodash/debounce';
import { useScheduleStore } from '../../../../stores/useScheduleStore';
import { supabase } from '../../../../utils/supabase';
import { useThemeColors } from '../../../../utils/theme';
import type { PackingItem } from '../../../../types';

const DEFAULT_CATEGORIES = ['Clothes', 'Toiletries', 'Electronics', 'Documents', 'Misc'];

function groupByCategory(items: PackingItem[]): Record<string, PackingItem[]> {
  return items.reduce<Record<string, PackingItem[]>>((acc, item) => {
    const key = item.category || 'Misc';
    return { ...acc, [key]: [...(acc[key] ?? []), item] };
  }, {});
}

export default function PackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const trips = useScheduleStore((s) => s.trips);
  const togglePackingItem = useScheduleStore((s) => s.togglePackingItem);
  const addPackingItem = useScheduleStore((s) => s.addPackingItem);
  const deletePackingItem = useScheduleStore((s) => s.deletePackingItem);
  const setActiveTripId = useScheduleStore((s) => s.setActiveTripId);

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Misc');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(DEFAULT_CATEGORIES),
  );

  const trip = trips.find((t) => t.id === id);
  const packingItems = trip?.packingItems ?? [];
  const checkedCount = packingItems.filter((i) => i.is_checked).length;
  const progress = packingItems.length > 0 ? checkedCount / packingItems.length : 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const syncToggle = useCallback(
    debounce(async (itemId: string, isChecked: boolean) => {
      await supabase.from('packing_items').update({ is_checked: isChecked }).eq('id', itemId);
    }, 800),
    [],
  );

  const handleToggle = (item: PackingItem) => {
    if (!id) return;
    setActiveTripId(id);
    togglePackingItem(item.id);
    syncToggle(item.id, !item.is_checked);
  };

  const handleAdd = async () => {
    if (!newItemName.trim() || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    setActiveTripId(id);
    const payload = {
      trip_id: id, item_name: newItemName.trim(),
      category: newItemCategory, is_checked: false,
      is_shared: false, assigned_to: user?.id ?? null,
    };
    const { data: inserted, error } = await supabase
      .from('packing_items')
      .insert(payload)
      .select()
      .single();
    if (error || !inserted) { Alert.alert('Error', error?.message ?? 'Could not add item'); return; }
    addPackingItem(inserted as PackingItem);
    setNewItemName('');
  };

  const handleDelete = (item: PackingItem) => {
    Alert.alert('Remove item', `Remove "${item.item_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('packing_items').delete().eq('id', item.id);
          if (error) { Alert.alert('Error', error.message); return; }
          deletePackingItem(item.id);
        },
      },
    ]);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const grouped = groupByCategory(packingItems);
  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...Object.keys(grouped)]));

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-3 mb-3">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:bg-slate-100 rounded-xl">
            <ArrowLeft color={c.textMuted} size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900 dark:text-white">Gear Checklist</Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">{checkedCount}/{packingItems.length} packed</Text>
          </View>
        </View>
        <View className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <View className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>

      {/* Quick add */}
      <View className="mx-4 my-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 gap-3">
        <TextInput
          className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder="Add item..."
          placeholderTextColor={c.textHint}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <View className="flex-row gap-2 flex-wrap">
          {DEFAULT_CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setNewItemCategory(c)}
              className={`px-3 py-1 rounded-full border ${newItemCategory === c ? 'bg-brand-600 border-brand-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}
            >
              <Text className={`text-xs font-medium ${newItemCategory === c ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={handleAdd}
          disabled={!newItemName.trim()}
          className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl active:scale-95"
          style={{ backgroundColor: newItemName.trim() ? '#059669' : '#e2e8f0' }}
        >
          <Plus color="white" size={16} />
          <Text className="text-sm font-bold text-white">Add to List</Text>
        </Pressable>
      </View>

      {/* Category sections */}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {allCategories.map((cat) => {
          const items = grouped[cat] ?? [];
          if (items.length === 0) return null;
          const isExpanded = expandedCategories.has(cat);
          const catChecked = items.filter((i) => i.is_checked).length;

          return (
            <View key={cat} className="mx-4 mb-3">
              <Pressable onPress={() => toggleCategory(cat)} className="flex-row items-center justify-between py-2">
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{cat}</Text>
                <Text className="text-xs text-slate-400 dark:text-slate-500">{catChecked}/{items.length}</Text>
              </Pressable>

              {isExpanded && (
                <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                  {items.map((item, i) => (
                    <View
                      key={item.id}
                      className={`flex-row items-center px-4 py-3 gap-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}
                    >
                      <Pressable
                        onPress={() => handleToggle(item)}
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${item.is_checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}
                      >
                        {item.is_checked ? <Check color="white" size={12} /> : null}
                      </Pressable>
                      <Text className={`flex-1 text-sm ${item.is_checked ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100 font-medium'}`}>
                        {item.item_name}
                      </Text>
                      <Pressable onPress={() => handleDelete(item)} className="p-1.5 active:bg-slate-100 rounded-lg">
                        <Trash2 color={c.textHint} size={14} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
