import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, Easing, Linking } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { handleIncomingInvite, parseInviteUrl } from '../utils/deepLink';
import { requestNotificationPermissions } from '../utils/alerts';
import { useThemeColors } from '../utils/theme';
import { useColorScheme } from 'nativewind';
import { storage } from '../utils/mmkv';

import { useScheduleStore } from '../stores/useScheduleStore';

// Graceful fallback — native module is unavailable until `npx expo run:android`.
// styles.xml provides the static dark fallback in the meantime.
let NavBar: React.ComponentType<{ style: 'dark' | 'light' | 'auto' | 'inverted' }> | null = null;
try { NavBar = require('expo-navigation-bar').NavigationBar; } catch { /* not yet compiled */ }

// Suppress known dev-mode warning from react-native-draggable-flatlist v4.x.
// The library calls ref.measureLayout before the ref resolves — harmless, never appears in production.
if (__DEV__) {
  const _err = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('ref.measureLayout must be called')) return;
    if (typeof args[0] === 'string' && args[0].includes("Can't perform a React state update on a component that hasn't mounted yet")) return;
    _err(...args);
  };
}

function SplashScreen() {
  const c = useThemeColors();
  const iconScale = useRef(new Animated.Value(0.4)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconY = useRef(new Animated.Value(30)).current;
  const rippleScale = useRef(new Animated.Value(0.85)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(18)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(iconY, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(250),
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rippleScale, { toValue: 1.55, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(rippleOpacity, { toValue: 0.45, duration: 150, useNativeDriver: true }),
              Animated.timing(rippleOpacity, { toValue: 0, duration: 850, useNativeDriver: true }),
            ]),
          ]),
          Animated.timing(rippleScale, { toValue: 0.85, duration: 0, useNativeDriver: true }),
          Animated.delay(900),
        ])
      ),
    ]).start();

    Animated.sequence([
      Animated.delay(320),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(520),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();

    const pulseDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.25, duration: 380, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));

    Animated.sequence([
      Animated.delay(650),
      Animated.parallel([pulseDot(d1, 0), pulseDot(d2, 160), pulseDot(d3, 320)]),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <Animated.View style={{
          position: 'absolute', width: 110, height: 110, borderRadius: 28,
          backgroundColor: '#059669',
          transform: [{ scale: rippleScale }], opacity: rippleOpacity,
        }} />
        <Animated.View style={{
          opacity: iconOpacity,
          transform: [{ scale: iconScale }, { translateY: iconY }],
          elevation: 14,
          shadowColor: '#059669', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
        }}>
          <View style={{ width: 100, height: 100, borderRadius: 24, overflow: 'hidden' }}>
            <Image source={require('../assets/images/icon.png')} style={{ width: 100, height: 100 }} />
          </View>
        </Animated.View>
      </View>

      <Animated.Text style={{
        fontSize: 36, fontWeight: '800', color: c.text, letterSpacing: -0.5,
        marginBottom: 8, opacity: titleOpacity, transform: [{ translateY: titleY }],
      }}>
        Trip Flow
      </Animated.Text>

      <Animated.Text style={{ fontSize: 14, color: c.textMuted, letterSpacing: 0.5, opacity: subtitleOpacity }}>
        Plan. Navigate. Experience.
      </Animated.Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 52 }}>
        {[d1, d2, d3].map((d, i) => (
          <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669', opacity: d }} />
        ))}
      </View>
    </View>
  );
}

async function checkNeedsOnboarding(s: Session): Promise<boolean> {
  if (s.user.is_anonymous) return false;
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', s.user.id)
    .single();
  return !data?.username;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profilePending, setProfilePending] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        const needs = await checkNeedsOnboarding(s);
        setNeedsOnboarding(needs);
      }
      setProfilePending(false);
      setIsReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !s.user.is_anonymous) {
          const pendingAnonId = storage.getString('pending_anon_migration');
          if (pendingAnonId && pendingAnonId !== s.user.id) {
            supabase.rpc('migrate_anonymous_user', {
              p_anon_id: pendingAnonId,
              p_new_id: s.user.id,
            }).then(({ error }) => {
              if (!error) {
                storage.remove('pending_anon_migration');
                useScheduleStore.getState().setTrips([]);
              }
            });
          }
        }
        setProfilePending(true);
        checkNeedsOnboarding(s).then((needs) => {
          setNeedsOnboarding(needs);
          setProfilePending(false);
        });
      } else {
        setNeedsOnboarding(false);
        setProfilePending(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady || profilePending) return;
    const inAuthGroup = segments[0] === '(auth)';
    const isOAuthCallback = segments[0] === 'auth';
    if (!session && !inAuthGroup && !isOAuthCallback) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace(needsOnboarding ? '/(onboarding)/setup' : '/(tabs)/trips');
    }
  }, [session, segments, isReady, needsOnboarding, profilePending, router]);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const handleUrl = async (url: string) => {
      const success = await handleIncomingInvite(url);
      if (success) {
        const params = parseInviteUrl(url);
        if (params) router.push(`/(tabs)/trips/${params.tripId}/day` as never);
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [isReady, router]);

  if (!isReady || profilePending) return <SplashScreen />;

  return <>{children}</>;
}

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    const stored = storage.getString('theme_mode') as 'light' | 'dark' | 'system' | undefined;
    if (stored) setColorScheme(stored);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {NavBar && <NavBar style={colorScheme === 'dark' ? 'dark' : 'light'} />}
      <SafeAreaProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
