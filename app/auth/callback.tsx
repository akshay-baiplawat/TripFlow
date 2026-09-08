import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../utils/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    code?: string;
  }>();

  useEffect(() => {
    const handleCallback = async () => {
      const { access_token, refresh_token, code } = params;

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        router.replace(error ? '/(auth)/login' : '/(tabs)/trips');
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        router.replace(error ? '/(auth)/login' : '/(tabs)/trips');
      } else {
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#059669" size="large" />
    </View>
  );
}
