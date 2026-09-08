import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, MapPin, Calendar, ChevronRight, ChevronLeft, Plane, MoreVertical, Link2 } from 'lucide-react-native';
import { supabase } from '../../../utils/supabase';
import { useScheduleStore } from '../../../stores/useScheduleStore';
import { storage } from '../../../utils/mmkv';
import type { Trip, TransportMode } from '../../../types';
import { useThemeColors } from '../../../utils/theme';

const TABS = ['Active', 'Upcoming', 'Archived'] as const;
type TabKey = typeof TABS[number];
const TAB_STORAGE_KEY = 'trips_active_tab';

function tripTabKey(trip: Trip): TabKey {
  const today = new Date().toISOString().slice(0, 10);
  if (trip.status === 'archived') return 'Archived';
  if (trip.start_date <= today && trip.end_date >= today) return 'Active';
  return 'Upcoming';
}

export default function TripsDashboard() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setTrips = useScheduleStore((s) => s.setTrips);
  const setActiveTripId = useScheduleStore((s) => s.setActiveTripId);
  const trips = useScheduleStore((s) => s.trips);
  const updateTrip = useScheduleStore((s) => s.updateTrip);
  const deleteTrip = useScheduleStore((s) => s.deleteTrip);

  const [activeTab, setActiveTab] = useState<TabKey>(
    (storage.getString(TAB_STORAGE_KEY) as TabKey | undefined) ?? 'Upcoming'
  );
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => { loadTrips(); }, []);

  const loadTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    setIsAnonymous(user.is_anonymous === true);

    const [tripsResult, profileResult] = await Promise.all([
      supabase
        .from('trips')
        .select(`*, days:itinerary_days( *, stops(*) ), members:trip_members( *, profile:profiles(*) ), packingItems:packing_items(*)`)
        .order('start_date', { ascending: true }),
      supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    ]);

    if (!tripsResult.error && tripsResult.data) {
      const hydrated = (tripsResult.data as Trip[]).map((t) => ({
        ...t,
        days: (t.days ?? [])
          .map((d) => ({ ...d, stops: (d.stops ?? []).sort((a, b) => a.order_rank - b.order_rank) }))
          .sort((a, b) => a.day_number - b.day_number),
        packingItems: t.packingItems ?? [],
        members: t.members ?? [],
      }));
      setTrips(hydrated);
    }
    if (!profileResult.error && profileResult.data) {
      setProfile(profileResult.data);
    }
    setLoading(false);
  };

  const handleCreatePress = () => {
    if (isAnonymous) {
      Alert.alert(
        'Sign in required',
        'Create an account to make and manage your own trips.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => supabase.auth.signOut(),
          },
        ],
      );
      return;
    }
    setShowCreate(true);
  };

  const handleTripPress = (trip: Trip) => {
    setActiveTripId(trip.id);
    router.push(`/(tabs)/trips/${trip.id}/day` as never);
  };

  const handleDeleteTrip = (trip: Trip) => {
    Alert.alert(
      'Delete Trip',
      `Delete "${trip.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('trips').delete().eq('id', trip.id);
            if (error) { Alert.alert('Error', error.message); return; }
            deleteTrip(trip.id);
          },
        },
      ],
    );
  };

  const handleLeaveTrip = (trip: Trip) => {
    Alert.alert(
      'Leave Trip',
      `Leave "${trip.title}"? You will lose access unless re-invited.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive',
          onPress: async () => {
            if (!currentUserId) return;
            const { error } = await supabase
              .from('trip_members')
              .delete()
              .eq('trip_id', trip.id)
              .eq('user_id', currentUserId);
            if (error) { Alert.alert('Error', error.message); return; }
            deleteTrip(trip.id);
          },
        },
      ],
    );
  };

  const filteredTrips = trips.filter((t) => tripTabKey(t) === activeTab);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    if (h >= 17 && h < 21) return 'Good evening';
    return 'Good night';
  })();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Traveller';
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-5 pb-4" style={{ paddingTop: insets.top + 12 }}>
        {/* Greeting row */}
        <View className="flex-row items-center justify-between mb-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            {/* Avatar */}
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: c.brandBorder }}
              />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.brandBorder }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>{initials}</Text>
              </View>
            )}
            {/* Greeting text */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: '500' }}>{greeting} 👋</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }} numberOfLines={1}>{firstName}</Text>
            </View>
          </View>
          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setShowJoin(true)}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center active:scale-95"
            >
              <Link2 color="#059669" size={18} />
            </Pressable>
            <Pressable
              onPress={handleCreatePress}
              className="w-10 h-10 rounded-full bg-brand-600 items-center justify-center shadow-md active:scale-95"
            >
              <Plus color="white" size={22} />
            </Pressable>
          </View>
        </View>

        <View className="flex-row bg-slate-100 dark:bg-slate-700 rounded-xl p-1 gap-1">
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => { setActiveTab(tab); storage.set(TAB_STORAGE_KEY, tab); }}
              className="flex-1 py-2 rounded-lg items-center"
              style={activeTab === tab ? { backgroundColor: c.card, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 } : undefined}
            >
              <Text className={`text-sm font-semibold ${activeTab === tab ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#059669" />
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={<EmptyState key={activeTab} tab={activeTab} onCreate={handleCreatePress} />}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => handleTripPress(item)}
              onEdit={() => setEditingTrip(item)}
              onDelete={() => handleDeleteTrip(item)}
              onLeave={() => handleLeaveTrip(item)}
              isOwner={item.members.find((m) => m.user_id === currentUserId)?.role === 'owner'}
            />
          )}
        />
      )}

      <CreateTripModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={loadTrips} />
      <JoinTripModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={(tripId) => { loadTrips(); router.push(`/(tabs)/trips/${tripId}/day` as never); }}
      />
      <EditTripModal
        visible={editingTrip !== null}
        trip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSaved={(changes) => {
          if (editingTrip) updateTrip(editingTrip.id, changes);
          setEditingTrip(null);
          loadTrips();
        }}
      />
    </View>
  );
}

function TripCard({ trip, onPress, onEdit, onDelete, onLeave, isOwner }: {
  trip: Trip; onPress: () => void; onEdit: () => void; onDelete: () => void;
  onLeave: () => void; isOwner: boolean | undefined;
}) {
  const nights = Math.max(
    0,
    Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000),
  );
  const handleMenu = () => {
    if (isOwner) {
      Alert.alert(trip.title, '', [
        { text: 'Edit Trip', onPress: onEdit },
        { text: 'Delete Trip', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert(trip.title, '', [
        { text: 'Leave Trip', style: 'destructive', onPress: onLeave },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };
  return (
    <Pressable onPress={onPress} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-98">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1.5">
          <Text className="text-base font-bold text-slate-900 dark:text-white">{trip.title}</Text>
          <View className="flex-row items-center gap-1.5">
            <MapPin color="#059669" size={13} />
            <Text className="text-sm text-slate-500 dark:text-slate-400">{trip.destination}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Calendar color="#64748b" size={13} />
            <Text className="text-xs text-slate-400 dark:text-slate-500">{trip.start_date} → {trip.end_date} · {nights}N</Text>
          </View>
        </View>
        <View className="items-end gap-2">
          <View className="flex-row items-center gap-1">
            {trip.members.slice(0, 3).map((m, i) => (
              <View
                key={m.id}
                style={{ marginLeft: i > 0 ? -8 : 0 }}
                className="w-7 h-7 rounded-full bg-emerald-100 items-center justify-center border-2 border-white dark:border-slate-800 overflow-hidden"
              >
                {m.profile?.avatar_url ? (
                  <Image source={{ uri: m.profile.avatar_url }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                ) : (
                  <Text className="text-xs font-bold text-emerald-700">
                    {(m.profile?.full_name ?? '?')[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
            ))}
            <Pressable onPress={handleMenu} className="p-1 active:bg-slate-100 rounded-lg ml-1">
              <MoreVertical color="#94a3b8" size={18} />
            </Pressable>
          </View>
          <ChevronRight color="#94a3b8" size={18} />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ tab, onCreate }: { tab: TabKey; onCreate: () => void }) {
  return (
    <View className="items-center justify-center py-20 gap-4">
      <View className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 items-center justify-center">
        <Plane color="#94a3b8" size={28} />
      </View>
      <Text className="text-base font-semibold text-slate-500 dark:text-slate-400">No {tab.toLowerCase()} trips</Text>
      {tab !== 'Archived' && (
        <Pressable onPress={onCreate} className="bg-brand-600 px-5 py-2.5 rounded-xl active:scale-95">
          <Text className="text-sm font-bold text-white">Create a trip</Text>
        </Pressable>
      )}
    </View>
  );
}

const TRANSPORT_MODES: TransportMode[] = ['scooter', 'car', 'transit'];

function JoinTripModal({ visible, onClose, onJoined }: {
  visible: boolean;
  onClose: () => void;
  onJoined: (tripId: string) => void;
}) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => { setCode(''); setErrorMsg(''); };

  const handleJoin = async () => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) { setErrorMsg('Enter an invite code.'); return; }
    setLoading(true);
    setErrorMsg('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      const { data } = await supabase.auth.signInAnonymously();
      if (!data.user) { setErrorMsg('Could not get user session.'); setLoading(false); return; }
    }

    const { data, error } = await supabase.rpc('join_trip_by_code', { p_invite_code: trimmed });
    setLoading(false);

    if (error || !data?.success) {
      setErrorMsg(data?.error ?? error?.message ?? 'Invalid invite code. Please check and try again.');
      return;
    }

    reset();
    onClose();
    onJoined(data.trip_id as string);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {visible && <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-700" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Join a Trip</Text>
          <Pressable onPress={() => { reset(); onClose(); }} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200">
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 32, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center' }}>
              <Link2 color="#059669" size={26} />
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center leading-5">
              Enter the invite code your trip organiser shared with you.
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">Invite Code</Text>
            <TextInput
              style={{ backgroundColor: c.input, borderWidth: 1, borderColor: errorMsg ? c.danger : c.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, fontWeight: '700', color: c.text, textAlign: 'center', letterSpacing: 4 }}
              placeholder="e.g. bcce532e"
              placeholderTextColor={c.textHint}
              value={code}
              onChangeText={(v) => { setCode(v); setErrorMsg(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!loading}
            />
            {errorMsg ? (
              <Text className="text-xs text-red-500 text-center">{errorMsg}</Text>
            ) : null}
          </View>
        </ScrollView>

        <View className="px-5 pb-8 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Pressable
            onPress={handleJoin}
            disabled={loading}
            className="bg-brand-600 rounded-2xl py-4 items-center active:scale-95"
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-base font-bold text-white">Join Trip</Text>}
          </Pressable>
        </View>
      </View>}
    </Modal>
  );
}



function CreateTripModal({
  visible, onClose, onCreated,
}: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const insets = useSafeAreaInsets();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [transport, setTransport] = useState<TransportMode>('scooter');
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(''); setDestination(''); setStartDate(todayStr); setEndDate(todayStr); };

  const handleStartDateChange = (v: string) => {
    setStartDate(v);
    if (endDate < v) setEndDate(v);
  };

  const handleCreate = async () => {
    if (!title.trim() || !destination.trim() || !startDate || !endDate) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format (e.g. 2025-12-25).');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Invalid dates', 'End date must be on or after start date.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          title: title.trim(), destination: destination.trim(),
          transport_mode: transport, start_date: startDate, end_date: endDate,
          status: 'planning', created_by: user.id,
        })
        .select()
        .single();

      if (error || !trip) {
        Alert.alert('Failed', error?.message ?? 'Could not create trip');
        return;
      }

      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({ trip_id: trip.id, user_id: user.id, role: 'owner' });
      if (memberError) {
        Alert.alert('Failed', 'Could not add you as owner: ' + memberError.message);
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      const days = Array.from({ length: numDays }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return {
          trip_id: trip.id,
          day_number: i + 1,
          date: d.toISOString().slice(0, 10),
          title: `Day ${i + 1}`,
          description: null,
          start_time_minutes: 540,
        };
      });
      const { error: daysError } = await supabase.from('itinerary_days').insert(days);
      if (daysError) {
        Alert.alert('Failed', 'Could not create itinerary days: ' + daysError.message);
        return;
      }
      reset();
      onClose();
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {visible && <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-700" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">New Trip</Text>
          <Pressable onPress={() => { reset(); onClose(); }} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200">
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</Text>
          </Pressable>
        </View>
        <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ gap: 16 }}>
          <MField label="Trip Name *" value={title} onChangeText={setTitle} placeholder="e.g. Goa Monsoon Expedition" />
          <MField label="Destination *" value={destination} onChangeText={setDestination} placeholder="e.g. Goa, India" />
          <DateField label="Start Date *" value={startDate} onChange={handleStartDateChange} minDate={todayStr} />
          <DateField label="End Date *" value={endDate} onChange={setEndDate} minDate={startDate || todayStr} highlightDate={startDate} />
          <View>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Transport Mode</Text>
            <View className="flex-row gap-2">
              {TRANSPORT_MODES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setTransport(m)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${transport === m ? 'bg-brand-600 border-brand-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}
                >
                  <Text className={`text-sm font-semibold capitalize ${transport === m ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
        <View className="px-5 pb-8 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Pressable onPress={handleCreate} disabled={saving} className="bg-brand-600 rounded-2xl py-4 items-center active:scale-95">
            {saving ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">Create Trip</Text>}
          </Pressable>
        </View>
      </View>}
    </Modal>
  );
}

function EditTripModal({
  visible, trip, onClose, onSaved,
}: {
  visible: boolean;
  trip: Trip | null;
  onClose: () => void;
  onSaved: (changes: Partial<Trip>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transport, setTransport] = useState<TransportMode>('scooter');
  const [saving, setSaving] = useState(false);

  const handleStartDateChange = (v: string) => {
    setStartDate(v);
    if (endDate < v) setEndDate(v);
  };

  useEffect(() => {
    if (!trip) return;
    setTitle(trip.title);
    setDestination(trip.destination);
    setStartDate(trip.start_date);
    setEndDate(trip.end_date);
    setTransport(trip.transport_mode);
  }, [trip]);

  const handleSave = async () => {
    if (!trip || !title.trim() || !destination.trim() || !startDate || !endDate) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format (e.g. 2025-12-25).');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Invalid dates', 'End date must be on or after start date.');
      return;
    }
    setSaving(true);
    const changes = {
      title: title.trim(), destination: destination.trim(),
      transport_mode: transport, start_date: startDate, end_date: endDate,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('trips').update(changes).eq('id', trip.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onSaved(changes);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {visible && <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-700" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Edit Trip</Text>
          <Pressable onPress={onClose} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200">
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</Text>
          </Pressable>
        </View>
        <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ gap: 16 }}>
          <MField label="Trip Name *" value={title} onChangeText={setTitle} placeholder="e.g. Goa Monsoon Expedition" />
          <MField label="Destination *" value={destination} onChangeText={setDestination} placeholder="e.g. Goa, India" />
          <DateField label="Start Date *" value={startDate} onChange={handleStartDateChange} />
          <DateField label="End Date *" value={endDate} onChange={setEndDate} minDate={startDate} highlightDate={startDate} />
          <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Text className="text-xs text-amber-700">Changing dates does not add or remove existing days. Use the day tabs on the trip screen to manage days.</Text>
          </View>
          <View>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Transport Mode</Text>
            <View className="flex-row gap-2">
              {TRANSPORT_MODES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setTransport(m)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${transport === m ? 'bg-brand-600 border-brand-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}
                >
                  <Text className={`text-sm font-semibold capitalize ${transport === m ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
        <View className="px-5 pb-8 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Pressable onPress={handleSave} disabled={saving} className="bg-brand-600 rounded-2xl py-4 items-center active:scale-95">
            {saving ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">Save Changes</Text>}
          </Pressable>
        </View>
      </View>}
    </Modal>
  );
}

function MField({
  label, value, onChangeText, placeholder, keyboardType,
}: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' }) {
  const c = useThemeColors();
  return (
    <View>
      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</Text>
      <TextInput
        className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textHint}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function DateField({ label, value, onChange, minDate, highlightDate }: { label: string; value: string; onChange: (v: string) => void; minDate?: string; highlightDate?: string }) {
  const c = useThemeColors();
  const todayStr = new Date().toISOString().slice(0, 10);
  const effectiveMin = minDate || todayStr;
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [show, setShow] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Select date';

  const openPicker = () => {
    const anchor = value || effectiveMin;
    const d = new Date(anchor + 'T00:00:00');
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setShow(true);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) =>
    i < firstDow ? null : i - firstDow + 1,
  );

  const isDisabled = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}` < effectiveMin;
  };

  const selectDay = (day: number) => {
    if (isDisabled(day)) return;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setShow(false);
  };

  const minYM = effectiveMin.slice(0, 7);
  const viewYM = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const canGoPrev = viewYM > minYM;

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectedDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
    ? parsed.getDate() : null;

  const highlightParsed = highlightDate ? new Date(highlightDate + 'T00:00:00') : null;
  const highlightDay = highlightParsed && highlightParsed.getFullYear() === viewYear && highlightParsed.getMonth() === viewMonth
    ? highlightParsed.getDate() : null;

  return (
    <View>
      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</Text>
      <Pressable
        onPress={openPicker}
        className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 flex-row items-center justify-between active:bg-slate-100"
      >
        <Text className={`text-sm ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{displayValue}</Text>
        <Calendar color="#64748b" size={16} />
      </Pressable>

      <Modal visible={show} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShow(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: c.card, borderRadius: 20, padding: 20, width: 320 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Pressable onPress={prevMonth} style={{ padding: 6, opacity: canGoPrev ? 1 : 0.3 }}>
                <ChevronLeft color="#059669" size={20} />
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={nextMonth} style={{ padding: 6 }}>
                <ChevronRight color="#059669" size={20} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {DAY_NAMES.map(d => (
                <Text key={d} style={{ width: 40, textAlign: 'center', fontSize: 12, fontWeight: '600', color: c.textHint }}>{d}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((day, idx) => {
                const disabled = day ? isDisabled(day) : false;
                const selected = day !== null && day === selectedDay;
                const highlighted = day !== null && day === highlightDay && !selected;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => day && selectDay(day)}
                    style={{
                      width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20,
                      backgroundColor: selected ? '#059669' : 'transparent',
                      borderWidth: highlighted ? 2 : 0,
                      borderColor: '#059669',
                      opacity: disabled ? 0.3 : 1,
                    }}
                  >
                    {day ? (
                      <Text style={{ fontSize: 14, fontWeight: selected || highlighted ? '700' : '400', color: selected ? 'white' : highlighted ? '#059669' : c.text }}>{day}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
