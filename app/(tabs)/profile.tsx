import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { storage } from '../../utils/mmkv';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LogOut, Search, Phone, Shield, ChevronDown, Check, Camera, ImagePlus, Trash2, UserPlus, UserMinus, Sun, Moon, SunMoon,
} from 'lucide-react-native';
import debounce from 'lodash/debounce';
import { supabase } from '../../utils/supabase';
import { addContact, removeContact, isContact, getContacts, loadContacts, type Contact } from '../../utils/contacts';
import { useThemeColors, useThemeMode } from '../../utils/theme';
import type { Profile } from '../../types';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
] as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [genderOpen, setGenderOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(() => getContacts());
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [linkGoogleLoading, setLinkGoogleLoading] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkEmailLoading, setLinkEmailLoading] = useState(false);
  const [linkEmailSent, setLinkEmailSent] = useState(false);
  const [linkError, setLinkError] = useState('');

  const refreshContacts = async (userId: string) => setContacts(await loadContacts(userId));

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!error && data) {
      const p = data as Profile;
      if (!p.avatar_url) {
        const googleAvatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
        if (googleAvatar) {
          await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', user.id);
          setProfile({ ...p, avatar_url: googleAvatar });
          setLoading(false);
          loadContacts(user.id).then(setContacts);
          return;
        }
      }
      setProfile(p);
      loadContacts(user.id).then(setContacts);
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setIsAnonymous(authUser?.is_anonymous === true);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveProfile = useCallback(
    debounce(async (updates: Partial<Profile>) => {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      const { error } = await supabase.from('profiles').upsert({
        ...updates, id: user.id, updated_at: new Date().toISOString(),
      });
      if (error) Alert.alert('Save failed', error.message);
      setSaving(false);
    }, 800),
    [],
  );

  const handleField = (field: keyof Profile, value: string) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    saveProfile(updated);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) { setSearchResults([]); return; }
      const { data } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`).limit(10);
      setSearchResults((data as Profile[]) ?? []);
    }, 400),
    [],
  );

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const handleLinkGoogle = async () => {
    setLinkError('');
    setLinkGoogleLoading(true);
    try {
      const { data: { user: anonUser } } = await supabase.auth.getUser();
      // Persist anonymous ID to MMKV before launching Google Sign-In.
      // Android may kill this activity during the OAuth flow; _layout.tsx
      // picks up the pending migration from MMKV on the next onAuthStateChange.
      if (anonUser?.id) storage.set('pending_anon_migration', anonUser.id);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.idToken) {
        storage.remove('pending_anon_migration');
        setLinkError('Google did not return an ID token. Please try again.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.idToken,
      });
      if (error) {
        storage.remove('pending_anon_migration');
        setLinkError(error.message);
        return;
      }
      // Migration is handled by onAuthStateChange in _layout.tsx
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      storage.remove('pending_anon_migration');
      if (e?.code !== statusCodes.SIGN_IN_CANCELLED) {
        setLinkError(e?.message ?? 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLinkGoogleLoading(false);
    }
  };

  const handleLinkEmail = async () => {
    if (!linkEmail.trim()) return;
    setLinkError('');
    setLinkEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: linkEmail.trim() });
      if (error) { setLinkError(error.message); return; }
      setLinkEmailSent(true);
    } catch {
      setLinkError('Failed to send link. Please try again.');
    } finally {
      setLinkEmailLoading(false);
    }
  };

  const handlePickPhoto = () => setPhotoSheetOpen(true);

  const pickFromCamera = async () => {
    setPhotoSheetOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission denied', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled) uploadPhoto(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    setPhotoSheetOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission denied', 'Photo library access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled) uploadPhoto(result.assets[0].uri);
  };

  const uploadPhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) { Alert.alert('Upload failed', uploadError.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: finalUrl }).eq('id', user.id);
      setProfile((p) => ({ ...p, avatar_url: finalUrl }));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const initials = profile.full_name
    ? profile.full_name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (profile.username?.slice(0, 2).toUpperCase() ?? '?');

  const selectedGender = GENDER_OPTIONS.find((o) => o.value === profile.gender);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1 bg-slate-50 dark:bg-slate-900"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 16, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }} className="px-5 pb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">My Profile</Text>
            {saving && (
              <View className="flex-row items-center gap-1.5">
                <ActivityIndicator size="small" color="#059669" />
                <Text className="text-xs text-emerald-600 dark:text-emerald-400">Saving…</Text>
              </View>
            )}
          </View>
        </View>

        {isAnonymous && (
          <GuestUpgradeBanner
            c={c}
            linkGoogleLoading={linkGoogleLoading}
            linkEmail={linkEmail}
            onLinkEmailChange={setLinkEmail}
            linkEmailLoading={linkEmailLoading}
            linkEmailSent={linkEmailSent}
            linkError={linkError}
            onLinkGoogle={handleLinkGoogle}
            onLinkEmail={handleLinkEmail}
          />
        )}

        {/* Avatar Hero */}
        <View style={{ backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }} className="items-center pt-8 pb-7 px-5">
          <Pressable onPress={handlePickPhoto} style={{ position: 'relative' }}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.brandBg }} />
            ) : (
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center', shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
                <Text style={{ fontSize: 30, fontWeight: '800', color: c.brand }}>{initials}</Text>
              </View>
            )}
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: c.brand, borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.card }}>
              {uploadingPhoto ? <ActivityIndicator size="small" color="white" /> : <Camera color="white" size={13} />}
            </View>
          </Pressable>
          <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            {profile.full_name || profile.username || 'Set your name'}
          </Text>
          {profile.username ? (
            <Text className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">@{profile.username}</Text>
          ) : null}
          <Text className="text-xs text-slate-300 dark:text-slate-600 mt-2">Changes save automatically</Text>
        </View>

        <View className="px-4 pt-6 gap-5">
          {/* Basic Info */}
          <Section title="Basic Info">
            <PField label="Full Name" value={profile.full_name ?? ''} onChangeText={(v) => handleField('full_name', v)} placeholder="Your full name" />
            <PField label="Username" value={profile.username ?? ''} onChangeText={(v) => handleField('username', v)} autoCapitalize="none" prefix="@" placeholder="username" />
            {profile.email ? (
              <EmailField email={profile.email} />
            ) : null}
            <PField label="Bio" value={profile.bio ?? ''} onChangeText={(v) => handleField('bio', v)} multiline placeholder="A short bio about yourself" />
            {/* Gender Dropdown */}
            <GenderField selectedGender={selectedGender} onOpen={() => setGenderOpen(true)} />
          </Section>

          {/* Contact */}
          <Section title="Contact" icon={<Phone color="#059669" size={13} />}>
            <PField label="Phone Number" value={profile.phone_number ?? ''} onChangeText={(v) => handleField('phone_number', v)} keyboardType="phone-pad" placeholder="+91 00000 00000" />
          </Section>

          {/* Emergency Contact */}
          <Section title="Emergency Contact" icon={<Shield color="#ef4444" size={13} />}>
            <PField label="Name" value={profile.emergency_contact_name ?? ''} onChangeText={(v) => handleField('emergency_contact_name', v)} placeholder="Contact person's name" />
            <PField label="Phone" value={profile.emergency_contact_phone ?? ''} onChangeText={(v) => handleField('emergency_contact_phone', v)} keyboardType="phone-pad" placeholder="+91 00000 00000" />
          </Section>

          {/* Find People */}
          <Section title="Find People" icon={<Search color={c.textMuted} size={13} />}>
            {contacts.length > 0 && (
              <ContactsList
                contacts={contacts}
                onRemove={(contactId) => removeContact(profile.id!, contactId).then(() => refreshContacts(profile.id!))}
              />
            )}
            <SearchBar
              value={searchQuery}
              onChangeText={(v) => { setSearchQuery(v); searchUsers(v); }}
            />
            {searchResults.length > 0 && (
              <SearchResults
                results={searchResults}
                onToggle={(u) => {
                  const uid = profile.id!;
                  if (isContact(u.id)) {
                    removeContact(uid, u.id).then(() => refreshContacts(uid));
                  } else {
                    addContact(uid, { id: u.id, username: u.username ?? null, full_name: u.full_name ?? null, avatar_url: u.avatar_url ?? null }).then(() => refreshContacts(uid));
                  }
                }}
              />
            )}
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <AppearanceToggle mode={themeMode} onChange={setThemeMode} />
          </Section>

          {/* Sign Out */}
          <Pressable
            onPress={handleSignOut}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.isDark ? '#1c0a0a' : '#fff1f2', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: c.isDark ? '#3d1515' : '#fecdd3' }}
          >
            <LogOut color="#ef4444" size={18} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#ef4444' }}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Photo Picker Sheet */}
      <Modal visible={photoSheetOpen} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' }} onPress={() => setPhotoSheetOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 8, overflow: 'hidden' }}>
            {/* Preview */}
            <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 10 }} />
              ) : (
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: c.brand }}>{initials}</Text>
                </View>
              )}
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>Profile Photo</Text>
              <Text style={{ fontSize: 13, color: c.textHint, marginTop: 2 }}>Choose how to update your photo</Text>
            </View>
            {/* Options */}
            <Pressable onPress={pickFromCamera} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center' }}>
                <Camera color={c.brand} size={20} />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>Take Photo</Text>
                <Text style={{ fontSize: 12, color: c.textHint }}>Use your camera</Text>
              </View>
            </Pressable>
            <Pressable onPress={pickFromLibrary} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: profile.avatar_url ? 1 : 0, borderBottomColor: c.borderSubtle }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus color="#3b82f6" size={20} />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>Photo Library</Text>
                <Text style={{ fontSize: 12, color: c.textHint }}>Pick from your gallery</Text>
              </View>
            </Pressable>
            {profile.avatar_url ? (
              <Pressable onPress={() => { handleField('avatar_url', ''); setPhotoSheetOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 18 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 color="#ef4444" size={18} />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ef4444' }}>Remove Photo</Text>
                  <Text style={{ fontSize: 12, color: c.textHint }}>Revert to initials</Text>
                </View>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Gender Dropdown Modal */}
      <Modal visible={genderOpen} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' }}
          onPress={() => setGenderOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>Select Gender</Text>
              <Pressable onPress={() => setGenderOpen(false)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.brandText }}>Done</Text>
              </Pressable>
            </View>
            {GENDER_OPTIONS.map((opt) => {
              const active = profile.gender === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => { handleField('gender', opt.value); setGenderOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }}
                >
                  <Text style={{ fontSize: 15, color: active ? c.brandText : c.text, fontWeight: active ? '600' : '400' }}>{opt.label}</Text>
                  {active && <Check color={c.brand} size={18} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components extracted to keep ProfileScreen under 200 lines
// ---------------------------------------------------------------------------

function EmailField({ email }: { email: string }) {
  const c = useThemeColors();
  return (
    <View style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.textHint, marginBottom: 4 }}>Email</Text>
      <Text style={{ fontSize: 14, color: c.textHint }}>{email}</Text>
    </View>
  );
}

function GenderField({ selectedGender, onOpen }: { selectedGender: { label: string } | undefined; onOpen: () => void }) {
  const c = useThemeColors();
  return (
    <View style={{ paddingBottom: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.textHint, marginBottom: 4 }}>Gender</Text>
      <Pressable
        onPress={onOpen}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}
      >
        <Text style={{ fontSize: 14, color: selectedGender ? c.text : c.textHint }}>
          {selectedGender ? selectedGender.label : 'Select gender'}
        </Text>
        <ChevronDown color={c.textHint} size={16} />
      </Pressable>
    </View>
  );
}

function ContactsList({ contacts, onRemove }: { contacts: Contact[]; onRemove: (id: string) => void }) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.textHint, letterSpacing: 0.8, textTransform: 'uppercase' }}>My Contacts</Text>
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden' }}>
        {contacts.map((contact, i) => (
          <View key={contact.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.borderSubtle }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {contact.avatar_url
                ? <Image source={{ uri: contact.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                : <Text style={{ fontSize: 13, fontWeight: '700', color: c.brand }}>{(contact.full_name || contact.username || '?').slice(0, 2).toUpperCase()}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>@{contact.username}</Text>
              {contact.full_name ? <Text style={{ fontSize: 12, color: c.textHint }}>{contact.full_name}</Text> : null}
            </View>
            <Pressable onPress={() => onRemove(contact.id)} style={{ padding: 6 }}>
              <UserMinus color="#ef4444" size={16} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function SearchBar({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.input, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, gap: 8 }}>
      <Search color={c.textHint} size={15} />
      <TextInput
        style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: c.text }}
        placeholder="Search by @username"
        placeholderTextColor={c.textHint}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
    </View>
  );
}

function SearchResults({ results, onToggle }: { results: Profile[]; onToggle: (u: Profile) => void }) {
  const c = useThemeColors();
  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden' }}>
      {results.map((u, i) => {
        const alreadyContact = isContact(u.id);
        return (
          <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.borderSubtle }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {u.avatar_url
                ? <Image source={{ uri: u.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                : <Text style={{ fontSize: 13, fontWeight: '700', color: c.brand }}>{(u.full_name || u.username || '?').slice(0, 2).toUpperCase()}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>@{u.username}</Text>
              {u.full_name ? <Text style={{ fontSize: 12, color: c.textHint }}>{u.full_name}</Text> : null}
            </View>
            <Pressable onPress={() => onToggle(u)} style={{ padding: 6 }}>
              {alreadyContact
                ? <UserMinus color="#ef4444" size={18} />
                : <UserPlus color={c.brand} size={18} />}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={{ fontSize: 11, fontWeight: '700', color: c.textHint, textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</Text>
      </View>
      <View style={{ backgroundColor: c.card, borderRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, borderWidth: 1, borderColor: c.borderSubtle, gap: 2 }}>
        {children}
      </View>
    </View>
  );
}

interface PFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  prefix?: string;
  placeholder?: string;
}

function PField({ label, value, onChangeText, multiline, autoCapitalize, keyboardType, prefix, placeholder }: PFieldProps) {
  const c = useThemeColors();
  return (
    <View style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.borderSubtle }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.textHint, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center' }}>
        {prefix ? <Text style={{ fontSize: 14, color: c.textHint, marginRight: 2 }}>{prefix}</Text> : null}
        <TextInput
          style={{ flex: 1, fontSize: 14, color: c.text, paddingVertical: 0 }}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          keyboardType={keyboardType ?? 'default'}
          placeholder={placeholder}
          placeholderTextColor={c.textHint}
        />
      </View>
    </View>
  );
}

function AppearanceToggle({ mode, onChange }: { mode: 'light' | 'dark' | 'system'; onChange: (m: 'light' | 'dark' | 'system') => void }) {
  const c = useThemeColors();
  const options: { key: 'system' | 'light' | 'dark'; label: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
    { key: 'system', label: 'System', Icon: SunMoon },
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'dark', label: 'Dark', Icon: Moon },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
      {options.map(({ key, label, Icon }) => {
        const active = mode === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              paddingVertical: 10, borderRadius: 12,
              backgroundColor: active ? c.brandBg : c.cardSubtle,
              borderWidth: 1, borderColor: active ? c.brandBorder : c.borderSubtle,
            }}
          >
            <Icon color={active ? c.brand : c.textMuted} size={15} />
            <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? c.brandText : c.textMuted }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface GuestUpgradeBannerProps {
  c: ReturnType<typeof useThemeColors>;
  linkGoogleLoading: boolean;
  linkEmail: string;
  onLinkEmailChange: (v: string) => void;
  linkEmailLoading: boolean;
  linkEmailSent: boolean;
  linkError: string;
  onLinkGoogle: () => void;
  onLinkEmail: () => void;
}

function GuestUpgradeBanner({
  c, linkGoogleLoading, linkEmail, onLinkEmailChange,
  linkEmailLoading, linkEmailSent, linkError, onLinkGoogle, onLinkEmail,
}: GuestUpgradeBannerProps) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 20, backgroundColor: c.brandBg, borderWidth: 1, borderColor: c.brandBorder, padding: 16, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>You're signed in as a guest</Text>
        <Text style={{ fontSize: 13, color: c.textSecondary }}>Sign in to sync your trips across devices and collaborate with others.</Text>
      </View>

      {/* Google */}
      <Pressable
        onPress={onLinkGoogle}
        disabled={linkGoogleLoading}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.card, borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: c.border }}
      >
        {linkGoogleLoading
          ? <ActivityIndicator size="small" color={c.brand} />
          : <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>G  Continue with Google</Text>
        }
      </Pressable>

      {/* Divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.borderSubtle }} />
        <Text style={{ fontSize: 12, color: c.textHint }}>or continue with email</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.borderSubtle }} />
      </View>

      {/* Email */}
      {linkEmailSent ? (
        <View style={{ backgroundColor: c.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: c.brandBorder, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.brandText }}>Check your inbox ✓</Text>
          <Text style={{ fontSize: 12, color: c.textHint, marginTop: 2 }}>Tap the link in your email to finish signing in.</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.border }}
            placeholder="your@email.com"
            placeholderTextColor={c.textHint}
            value={linkEmail}
            onChangeText={onLinkEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Pressable
            onPress={onLinkEmail}
            disabled={linkEmailLoading || !linkEmail.trim()}
            style={{ backgroundColor: c.brand, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', opacity: linkEmail.trim() ? 1 : 0.5 }}
          >
            {linkEmailLoading
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Send</Text>
            }
          </Pressable>
        </View>
      )}

      {linkError ? (
        <Text style={{ fontSize: 12, color: c.danger, textAlign: 'center' }}>{linkError}</Text>
      ) : null}
    </View>
  );
}
