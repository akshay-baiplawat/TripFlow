import { useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, Share, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserPlus, Share2, Users, Eye, PencilLine } from 'lucide-react-native';
import { useThemeColors } from '../utils/theme';
import { supabase } from '../utils/supabase';
import { buildInviteUrl } from '../utils/deepLink';
import { getContacts } from '../utils/contacts';
import type { Trip, MemberRole } from '../types';

interface Props {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
  onMembersChanged?: () => Promise<void>;
}

type InviteRole = Exclude<MemberRole, 'owner'>;

const ROLES: { value: InviteRole; label: string; desc: string }[] = [
  { value: 'viewer', label: 'Viewer', desc: 'Can view only' },
  { value: 'editor', label: 'Editor', desc: 'Can edit stops' },
];

export function InviteModal({ visible, trip, onClose, onMembersChanged }: Props) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [selectedRole, setSelectedRole] = useState<InviteRole>(trip.default_invite_role ?? 'editor');
  const [usernameQuery, setUsernameQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const contacts = visible ? getContacts() : [];
  const existingMemberIds = new Set(trip.members.map((m) => m.user_id));

  const inviteUrl = buildInviteUrl(trip.id, trip.invite_code);

  const handleRoleChange = async (role: InviteRole) => {
    setSelectedRole(role);
    await supabase.rpc('set_trip_invite_role', { p_trip_id: trip.id, p_role: role });
  };

  const addMember = async (userId: string, username: string, role: InviteRole) => {
    setAddingId(userId);
    const { error } = await supabase
      .from('trip_members')
      .upsert({ trip_id: trip.id, user_id: userId, role }, { onConflict: 'trip_id,user_id' });
    setAddingId(null);
    if (error) { Alert.alert('Failed', error.message); return; }
    await onMembersChanged?.();
    Alert.alert('Added', `@${username} added as ${role}.`);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message:
          `Join my trip "${trip.title}" on TripFlow!\n\n` +
          `Invite code: ${trip.invite_code.toUpperCase()}\n\n` +
          `Open TripFlow → My Trips → Join Trip, then enter the code above.`,
      });
    } catch {
      Alert.alert('Error', 'Could not open share sheet');
    }
  };

  const handleAddByUsername = async () => {
    const q = usernameQuery.trim();
    if (!q) return;
    setSearching(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .ilike('username', `%${q}%`)
      .limit(5);
    setSearching(false);

    const profile = profiles?.[0];
    if (!profile) {
      Alert.alert('Not found', `No user with username matching "${q}"`);
      return;
    }

    Alert.alert(
      'Add member',
      `Add @${profile.username} (${profile.full_name ?? ''}) as ${selectedRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add', onPress: () => { setUsernameQuery(''); addMember(profile.id, profile.username ?? '', selectedRole); } },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-700" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">Invite People</Text>
          <Pressable onPress={onClose} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200">
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Done</Text>
          </Pressable>
        </View>

        <ScrollView className="px-5 py-6" contentContainerStyle={{ gap: 24 }}>
          {/* Role selector */}
          <View style={{ gap: 8 }}>
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Add as</Text>
            <View className="flex-row gap-3">
              {ROLES.map((r) => {
                const active = selectedRole === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => handleRoleChange(r.value)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: active ? c.brand : c.border, backgroundColor: active ? c.brandBg : c.card }}
                  >
                    {r.value === 'viewer'
                      ? <Eye color={active ? c.brand : c.textHint} size={15} />
                      : <PencilLine color={active ? c.brand : c.textHint} size={15} />}
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? c.brandText : c.textSecondary }}>{r.label}</Text>
                      <Text style={{ fontSize: 10, color: active ? c.brandText : c.textHint }}>{r.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {contacts.length > 0 && (
            <View style={{ gap: 10 }}>
              <View className="flex-row items-center gap-2">
                <Users color={c.brand} size={14} />
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">My Contacts</Text>
              </View>
              {contacts.map((contact) => {
                const alreadyMember = existingMemberIds.has(contact.id);
                return (
                  <View key={contact.id} className="flex-row items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {contact.avatar_url
                        ? <Image source={{ uri: contact.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                        : <Text style={{ fontSize: 13, fontWeight: '700', color: c.brandText }}>{(contact.full_name || contact.username || '?').slice(0, 2).toUpperCase()}</Text>}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">@{contact.username}</Text>
                      {contact.full_name ? <Text className="text-xs text-slate-500 dark:text-slate-400">{contact.full_name}</Text> : null}
                    </View>
                    {alreadyMember ? (
                      <View className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                        <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">In trip</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => addMember(contact.id, contact.username ?? '', selectedRole)}
                        disabled={addingId === contact.id}
                        className="w-8 h-8 bg-brand-600 rounded-lg items-center justify-center active:scale-95"
                      >
                        {addingId === contact.id
                          ? <ActivityIndicator color="white" size="small" />
                          : <UserPlus color="white" size={15} />}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ gap: 12 }}>
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Share Invite Link</Text>
            <View className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
              <Text className="text-xs text-slate-600 dark:text-slate-400 font-mono" numberOfLines={1}>{inviteUrl}</Text>
            </View>
            <Pressable
              onPress={handleShareLink}
              className="bg-brand-600 rounded-xl py-3 flex-row items-center justify-center gap-2 active:scale-95"
            >
              <Share2 color="white" size={16} />
              <Text className="text-sm font-bold text-white">Share Link</Text>
            </Pressable>
            <Text className="text-xs text-slate-400 dark:text-slate-500 text-center">
              People joining via code will join as <Text className="font-semibold text-slate-500 dark:text-slate-400">{selectedRole}</Text>
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Add by Username</Text>
            <View className="flex-row gap-2">
              <View className="flex-1 flex-row items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3">
                <Text className="text-sm text-slate-400 dark:text-slate-500">@</Text>
                <TextInput
                  className="flex-1 py-3 text-sm text-slate-900 dark:text-slate-100"
                  value={usernameQuery}
                  onChangeText={setUsernameQuery}
                  placeholder="username"
                  placeholderTextColor={c.textHint}
                  autoCapitalize="none"
                />
              </View>
              <Pressable
                onPress={handleAddByUsername}
                disabled={searching}
                className="w-12 bg-brand-600 rounded-xl items-center justify-center active:scale-95"
              >
                {searching
                  ? <ActivityIndicator color="white" size="small" />
                  : <UserPlus color="white" size={18} />}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
