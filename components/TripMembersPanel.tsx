import { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import { Crown, Pencil, Eye, Trash2, User, ChevronDown } from 'lucide-react-native';
import { supabase } from '../utils/supabase';
import { useThemeColors } from '../utils/theme';
import type { TripMember, MemberRole } from '../types';

const ASSIGNABLE_ROLES: MemberRole[] = ['editor', 'viewer'];

interface Props {
  members: TripMember[];
  currentUserId: string;
  currentUserRole: MemberRole;
  onMembersChanged: () => void | Promise<void>;
}

export function TripMembersPanel({ members, currentUserId, currentUserRole, onMembersChanged }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const isOwner = currentUserRole === 'owner';
  const c = useThemeColors();

  const ROLE_META: Record<MemberRole, { icon: React.ReactNode; label: string }> = {
    owner:  { icon: <Crown  color={c.warning}   size={14} />, label: 'Owner'  },
    editor: { icon: <Pencil color="#3b82f6"      size={14} />, label: 'Editor' },
    viewer: { icon: <Eye    color={c.textMuted}  size={14} />, label: 'Viewer' },
  };

  const handleChangeRole = async (member: TripMember, newRole: MemberRole) => {
    setOpenDropdownId(null);
    if (newRole === member.role) return;
    setLoadingId(member.id);
    const { error } = await supabase
      .from('trip_members')
      .update({ role: newRole })
      .eq('id', member.id);
    setLoadingId(null);
    if (error) { Alert.alert('Failed', error.message); return; }
    await onMembersChanged();
  };

  const handleRemove = (member: TripMember) => {
    if (!isOwner || member.role === 'owner') return;
    Alert.alert('Remove member', `Remove @${member.profile?.username ?? 'user'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setLoadingId(member.id);
          const { error } = await supabase.from('trip_members').delete().eq('id', member.id);
          setLoadingId(null);
          if (error) { Alert.alert('Failed', error.message); return; }
          onMembersChanged();
        },
      },
    ]);
  };

  return (
    <View className="gap-2">
      {members.map((member) => {
        const isMe = member.user_id === currentUserId;
        const canModify = isOwner && member.role !== 'owner';
        const meta = ROLE_META[member.role];
        const isOpen = openDropdownId === member.id;

        return (
          <View
            key={member.id}
            className="flex-row items-center gap-3 rounded-xl px-4 py-3 border"
            style={{ backgroundColor: c.card, borderColor: c.border }}
          >
            <View className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900 items-center justify-center overflow-hidden">
              {member.profile?.avatar_url ? (
                <Image source={{ uri: member.profile.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
              ) : (
                <User color="#059669" size={18} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {member.profile?.full_name ?? 'Unknown'}{isMe ? ' (you)' : ''}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">@{member.profile?.username ?? '—'}</Text>
            </View>

            {loadingId === member.id ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <View className="flex-row items-center gap-2">
                {/* Role badge + dropdown, elevated so it clips above siblings */}
                <View style={{ zIndex: isOpen ? 100 : 1 }}>
                  <Pressable
                    onPress={() => canModify && setOpenDropdownId(isOpen ? null : member.id)}
                    disabled={!canModify}
                    className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-full border ${canModify ? 'border-slate-200 dark:border-slate-600 active:bg-slate-50 dark:active:bg-slate-700' : 'border-transparent'}`}
                  >
                    {meta.icon}
                    <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">{meta.label}</Text>
                    {canModify && <ChevronDown color={c.textMuted} size={12} />}
                  </Pressable>

                  {isOpen && (
                    <>
                      {/* Backdrop — renders before dropdown so dropdown sits on top */}
                      <Pressable
                        onPress={() => setOpenDropdownId(null)}
                        style={{
                          position: 'absolute',
                          top: -600, left: -600, right: -600, bottom: -600,
                          zIndex: 1,
                        }}
                      />
                      {/* Dropdown menu */}
                      <View
                        style={{
                          position: 'absolute', right: 0, top: 36,
                          minWidth: 110, zIndex: 2,
                          backgroundColor: c.card,
                          borderRadius: 12,
                          borderWidth: 1, borderColor: c.border,
                          elevation: 8,
                          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.12, shadowRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        {ASSIGNABLE_ROLES.map((role) => {
                          const r = ROLE_META[role];
                          const isActive = member.role === role;
                          return (
                            <Pressable
                              key={role}
                              onPress={() => handleChangeRole(member, role)}
                              className={`flex-row items-center gap-2 px-3 py-2.5 active:bg-slate-50 dark:active:bg-slate-700 ${isActive ? 'bg-slate-50 dark:bg-slate-700' : ''}`}
                            >
                              {r.icon}
                              <Text className={`text-xs font-semibold ${isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                                {r.label}
                              </Text>
                              {isActive && (
                                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto" />
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>

                {canModify && (
                  <Pressable onPress={() => handleRemove(member)} className="p-1.5 active:bg-slate-100 dark:active:bg-slate-700 rounded-lg">
                    <Trash2 color="#ef4444" size={15} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
