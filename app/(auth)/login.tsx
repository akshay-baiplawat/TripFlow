import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Compass } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { useThemeColors } from '../../utils/theme';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
  scopes: ['profile', 'email'],
});

export default function LoginScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const anyLoading = googleLoading || appleLoading || emailLoading || guestLoading || otpLoading;

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.idToken) {
        setErrorMsg('Google did not return an ID token. Please try again.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.idToken,
      });
      if (error) setErrorMsg(error.message);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code !== statusCodes.SIGN_IN_CANCELLED) {
        setErrorMsg(e?.message ?? 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setErrorMsg('');
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setErrorMsg('Apple sign-in did not return a token.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) setErrorMsg(error.message);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMsg(e?.message ?? 'Apple sign-in failed');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleEmailSendOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setErrorMsg('Please enter your email address.'); return; }
    setErrorMsg('');
    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed });
    setEmailLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    setEmailSent(true);
  };

  const handleVerifyOtp = async () => {
    const trimmed = otpCode.trim();
    if (trimmed.length !== 6) { setErrorMsg('Enter the 6-digit code from your email.'); return; }
    setErrorMsg('');
    setOtpLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: trimmed, type: 'email' });
    setOtpLoading(false);
    if (error) { setErrorMsg(error.message); return; }
  };

  const handleGuestSignIn = async () => {
    setErrorMsg('');
    setGuestLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) setErrorMsg(error.message);
    setGuestLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
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
        {/* Logo */}
        <View style={{ alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 }}>
            <Compass color="white" size={40} />
          </View>
          <Text style={{ fontSize: 32, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>TripFlow</Text>
          <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center' }}>
            Plan. Navigate. Experience.
          </Text>
        </View>

        {/* Auth buttons */}
        <View style={{ gap: 12 }}>

          {/* Google */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={anyLoading}
            android_ripple={{ color: '#f1f5f9' }}
            style={{
              backgroundColor: c.card,
              borderWidth: 1, borderColor: c.border,
              borderRadius: 16, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
            }}
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '800', lineHeight: 14 }}>G</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Apple (iOS only) */}
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={handleAppleSignIn}
              disabled={anyLoading}
              style={{
                backgroundColor: '#000',
                borderRadius: 16, paddingVertical: 16,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {appleLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={{ color: 'white', fontSize: 19, lineHeight: 22 }}></Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            <Text style={{ fontSize: 11, color: c.textHint, fontWeight: '600' }}>or continue with email</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          </View>

          {/* Email OTP */}
          {!emailSent ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: c.text }}
                placeholder="your@email.com"
                placeholderTextColor={c.textHint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!anyLoading}
              />
              <Pressable
                onPress={handleEmailSendOtp}
                disabled={anyLoading}
                android_ripple={{ color: '#047857' }}
                style={{ backgroundColor: '#059669', borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}
              >
                {emailLoading
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Send</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 12, color: c.textMuted, textAlign: 'center' }}>
                Code sent to <Text style={{ fontWeight: '700', color: c.text }}>{email.trim()}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, fontWeight: '700', color: c.text, textAlign: 'center', letterSpacing: 8 }}
                  placeholder="······"
                  placeholderTextColor={c.borderSubtle}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  autoFocus
                  editable={!anyLoading}
                />
                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={anyLoading}
                  android_ripple={{ color: '#047857' }}
                  style={{ backgroundColor: '#059669', borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}
                >
                  {otpLoading
                    ? <ActivityIndicator color="white" size="small" />
                    : <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Verify</Text>}
                </Pressable>
              </View>
              <Pressable onPress={() => { setEmailSent(false); setOtpCode(''); setErrorMsg(''); }} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: c.textHint }}>Use a different email</Text>
              </Pressable>
            </View>
          )}

          {/* Inline error */}
          {errorMsg ? (
            <Text style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: -4 }}>{errorMsg}</Text>
          ) : null}

          {/* Guest */}
          <Pressable
            onPress={handleGuestSignIn}
            disabled={anyLoading}
            style={{ paddingVertical: 12, alignItems: 'center' }}
          >
            {guestLoading
              ? <ActivityIndicator color={c.textHint} size="small" />
              : <Text style={{ fontSize: 13, color: c.textHint, fontWeight: '500' }}>Continue as Guest</Text>}
          </Pressable>
        </View>

        <Text style={{ fontSize: 11, color: c.borderSubtle, textAlign: 'center', paddingHorizontal: 8, lineHeight: 16, marginTop: 16 }}>
          Guest sessions are local only.{'\n'}Sign in to sync across devices and collaborate.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
