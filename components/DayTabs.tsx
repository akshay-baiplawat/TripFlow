import { useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Backpack } from 'lucide-react-native';
import { useScheduleStore } from '../stores/useScheduleStore';
import { useThemeColors } from '../utils/theme';
import type { ItineraryDay } from '../types';

interface Props {
  days: ItineraryDay[];
  activeDayIndex: number;
  tripId: string;
}

export function DayTabs({ days, activeDayIndex, tripId }: Props) {
  const setActiveDayIndex = useScheduleStore((s) => s.setActiveDayIndex);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const c = useThemeColors();

  const handleDayPress = (index: number) => {
    setActiveDayIndex(index);
    scrollRef.current?.scrollTo({ x: index * 72, animated: true });
  };

  return (
    <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}
      >
        {days.map((day, index) => {
          const isActive = index === activeDayIndex;
          const visitedCount = day.stops.filter((s) => s.status === 'visited').length;
          const totalCount = day.stops.filter((s) => s.status !== 'skipped').length;

          return (
            <Pressable
              key={day.id}
              onPress={() => handleDayPress(index)}
              className={`px-4 py-2 rounded-xl min-w-16 items-center ${isActive ? 'bg-brand-600' : 'bg-slate-100 dark:bg-slate-700'}`}
            >
              <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                Day {day.day_number}
              </Text>
              {totalCount > 0 && visitedCount > 0 && (
                <View className={`mt-0.5 px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                  <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {visitedCount}/{totalCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push(`/(tabs)/trips/${tripId}/packing` as never)}
          className="px-4 py-2 rounded-xl items-center flex-row gap-1.5 bg-slate-100 dark:bg-slate-700"
        >
          <Backpack color={c.textMuted} size={14} />
          <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Gear</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
