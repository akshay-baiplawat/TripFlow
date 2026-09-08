import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScaleDecorator, NestableScrollContainer, NestableDraggableFlatList } from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { ArrowLeft, Users, UserPlus } from 'lucide-react-native';
import { useScheduleStore } from '../../../../stores/useScheduleStore';
import { useThemeColors } from '../../../../utils/theme';
import { computeDynamicSchedule } from '../../../../utils/timelineEngine';
import { computeDriftWarnings } from '../../../../utils/alerts';
import { supabase } from '../../../../utils/supabase';
import { DayTabs } from '../../../../components/DayTabs';
import { DayMetaCard } from '../../../../components/DayMetaCard';
import { StopCard } from '../../../../components/StopCard';
import { DriftWarningBanner } from '../../../../components/DriftWarningBanner';
import { AddPlaceModal } from '../../../../components/AddPlaceModal';
import { EditPlaceModal } from '../../../../components/EditPlaceModal';
import { InviteModal } from '../../../../components/InviteModal';
import { TripMembersPanel } from '../../../../components/TripMembersPanel';
import type { ComputedStop, MemberRole, Trip } from '../../../../types';

export default function DayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const trips = useScheduleStore((s) => s.trips);
  const activeDayIndex = useScheduleStore((s) => s.activeDayIndex);
  const setActiveTripId = useScheduleStore((s) => s.setActiveTripId);
  const upsertTrip = useScheduleStore((s) => s.upsertTrip);
  const reorderStop = useScheduleStore((s) => s.reorderStop);
  const c = useThemeColors();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showEditPlace, setShowEditPlace] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingStop, setEditingStop] = useState<ComputedStop | null>(null);

  const loadTrip = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`*, days:itinerary_days( *, stops(*) ), members:trip_members( *, profile:profiles(*) ), packingItems:packing_items(*)`)
        .eq('id', id)
        .single();

      if (!error && data) {
        const raw = data as Trip;
        const hydrated: Trip = {
          ...raw,
          days: (raw.days ?? [])
            .map((d) => ({ ...d, stops: (d.stops ?? []).sort((a, b) => a.order_rank - b.order_rank) }))
            .sort((a, b) => a.day_number - b.day_number),
          packingItems: raw.packingItems ?? [],
          members: raw.members ?? [],
        };
        upsertTrip(hydrated);
      }
    } finally {
      setLoading(false);
    }
  }, [id, upsertTrip]);

  useEffect(() => {
    if (id) setActiveTripId(id);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
      setIsGuestUser(user?.is_anonymous === true);
    });
    loadTrip();
  }, [id, loadTrip, setActiveTripId]);

  const trip = trips.find((t) => t.id === id);
  const currentMember = trip?.members.find((m) => m.user_id === currentUserId);
  const currentUserRole: MemberRole = currentMember?.role ?? 'viewer';
  const canEdit = currentUserRole !== 'viewer' && !isGuestUser;
  const activeDay = trip?.days[activeDayIndex];
  const computedStops: ComputedStop[] = activeDay ? computeDynamicSchedule(activeDay) : [];
  const driftWarnings = computeDriftWarnings(computedStops);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  if (!trip || !activeDay) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900 gap-4 px-8">
        <Text className="text-base font-semibold text-slate-500 dark:text-slate-400 text-center">
          Could not load trip details.
        </Text>
        <Pressable
          onPress={() => { setLoading(true); loadTrip(); }}
          className="bg-brand-600 px-6 py-3 rounded-xl active:scale-95"
        >
          <Text className="text-sm font-bold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between mb-1">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:bg-slate-100 dark:active:bg-slate-700 rounded-xl">
            <ArrowLeft color={c.textMuted} size={20} />
          </Pressable>
          <View className="flex-1 mx-3">
            <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>{trip.title}</Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">{trip.destination}</Text>
          </View>
          <View className="flex-row gap-1">
            <Pressable onPress={() => setShowMembers((v) => !v)} className="p-2 active:bg-slate-100 dark:active:bg-slate-700 rounded-xl">
              <Users color={c.textMuted} size={20} />
            </Pressable>
            {canEdit && (
              <Pressable onPress={() => setShowInvite(true)} className="p-2 active:bg-slate-100 dark:active:bg-slate-700 rounded-xl">
                <UserPlus color={c.brand} size={20} />
              </Pressable>
            )}
          </View>
        </View>

        {showMembers && (
          <View className="mt-3">
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <TripMembersPanel
                members={trip.members}
                currentUserId={currentUserId ?? ''}
                currentUserRole={currentUserRole}
                onMembersChanged={loadTrip}
              />
            </ScrollView>
          </View>
        )}
      </View>

      {/* Day tabs */}
      <DayTabs days={trip.days} activeDayIndex={activeDayIndex} tripId={trip.id} />

      {/* Scrollable body — NestableScrollContainer allows DraggableFlatList gestures + parent scroll to coexist */}
      <NestableScrollContainer
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadTrip(); setRefreshing(false); }}
            colors={['#059669']}
            tintColor="#059669"
          />
        }
      >
        {/* Day title */}
        <View className="px-4 pt-3 pb-1">
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Day {activeDay.day_number} · {activeDay.date}
          </Text>
          {activeDay.title ? (
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeDay.title}</Text>
          ) : null}
        </View>

        {/* Drift warning */}
        <DriftWarningBanner warnings={driftWarnings} />

        {/* Meta card */}
        <DayMetaCard day={activeDay} onAddPlace={() => setShowAddPlace(true)} canEdit={canEdit} />

        {/* Stop list — NestableDraggableFlatList + NestableScrollContainer work together for drag + parent scroll */}
        <NestableDraggableFlatList
          scrollEnabled={false}
          data={computedStops}
          keyExtractor={(item) => item.id}
          onDragEnd={({ from, to }) => {
            if (from !== to && activeDay) {
              reorderStop(activeDay.id, from, to);
            }
          }}
          renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<typeof computedStops[0]>) => (
            <ScaleDecorator>
              <StopCard
                stop={item}
                index={getIndex() ?? 0}
                role={currentUserRole}
                drag={canEdit ? drag : undefined}
                isActive={isActive}
                onEdit={(s) => { setEditingStop(s); setShowEditPlace(true); }}
              />
            </ScaleDecorator>
          )}
          ListEmptyComponent={
            <View className="items-center py-16 gap-4">
              <Text className="text-sm text-slate-400 dark:text-slate-500">No stops yet.</Text>
              {canEdit && (
                <Pressable
                  onPress={() => setShowAddPlace(true)}
                  className="bg-brand-600 px-5 py-2.5 rounded-xl active:scale-95"
                >
                  <Text className="text-sm font-bold text-white">Add First Stop</Text>
                </Pressable>
              )}
            </View>
          }
        />
      </NestableScrollContainer>

      <AddPlaceModal visible={showAddPlace} dayId={activeDay.id} onClose={() => setShowAddPlace(false)} />
      <EditPlaceModal
        visible={showEditPlace}
        stop={editingStop}
        onClose={() => { setShowEditPlace(false); setEditingStop(null); }}
      />
      <InviteModal visible={showInvite} trip={trip} onClose={() => setShowInvite(false)} onMembersChanged={loadTrip} />
    </View>
  );
}
