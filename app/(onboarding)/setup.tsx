import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function OnboardingSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = (value: string) => {
    if (!value) { setUsernameError(''); return; }
    if (!USERNAME_REGEX.test(value)) {
      setUsernameError('3–20 chars · lowercase letters, numbers, underscores only');
    } else {
      setUsernameError('');
    }
  };

  const handleGetStarted = async () => {
    const name = fullName.trim();
    const uname = username.trim().toLowerCase();

    if (!name) { setError('Please enter your full name.'); return; }
    if (!uname) { setError('Please choose a username.'); return; }
    if (!USERNAME_REGEX.test(uname)) { setError(usernameError || 'Invalid username format.'); return; }

    setLoading(true);
    setError('');

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', uname)
      .limit(1);

    if (existing && existing.length > 0) {
      setError('That username is already taken. Please choose another.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: name, username: uname }, { onConflict: 'id' });

    setLoading(false);
    if (upsertError) { setError(upsertError.message); return; }
    router.replace('/(tabs)/trips');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 40, gap: 12 }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' }}>
            <User color="#059669" size={32} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 }}>
            Set up your profile
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
            Help your travel crew know who you are.
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          {/* Full Name */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Full Name
            </Text>
            <TextInput
              style={{
                backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 15, color: '#0f172a',
              }}
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
            />
          </View>

          {/* Username */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Username
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'white',
              borderWidth: 1, borderColor: usernameError ? '#ef4444' : '#e2e8f0',
              borderRadius: 14, paddingHorizontal: 16,
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 15 }}>@</Text>
              <TextInput
                style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#0f172a' }}
                placeholder="yourhandle"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={(v) => { setUsername(v); validateUsername(v); }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {usernameError ? (
              <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{usernameError}</Text>
            ) : null}
          </View>

          {/* Error */}
          {error ? (
            <Text style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{error}</Text>
          ) : null}

          {/* CTA */}
          <Pressable
            onPress={handleGetStarted}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', marginTop: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Get Started →</Text>}
          </Pressable>
        </View>

        {/* Skip */}
        <Pressable
          onPress={() => router.replace('/(tabs)/trips')}
          style={{ marginTop: 24, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
