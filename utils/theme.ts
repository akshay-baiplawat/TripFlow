import { useColorScheme } from 'nativewind';
import { storage } from './mmkv';

const THEME_KEY = 'theme_mode';

export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    isDark,
    bg:           isDark ? '#0f172a' : '#f8fafc',
    card:         isDark ? '#1e293b' : '#ffffff',
    cardSubtle:   isDark ? '#334155' : '#f1f5f9',
    input:        isDark ? '#334155' : '#f8fafc',
    border:       isDark ? '#334155' : '#e2e8f0',
    borderSubtle: isDark ? '#1e293b' : '#f1f5f9',
    text:         isDark ? '#f8fafc' : '#0f172a',
    textSecondary:isDark ? '#cbd5e1' : '#475569',
    textMuted:    isDark ? '#94a3b8' : '#64748b',
    textHint:     isDark ? '#64748b' : '#94a3b8',
    brand:        '#059669',
    brandText:    isDark ? '#34d399' : '#059669',
    brandBg:      isDark ? '#064e3b' : '#f0fdf4',
    brandBorder:  isDark ? '#065f46' : '#bbf7d0',
    overlay:      isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
    danger:       '#ef4444',
    warning:      '#f59e0b',
  };
}

export function useThemeMode() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const stored = storage.getString(THEME_KEY) as 'light' | 'dark' | 'system' | undefined;
  const mode: 'light' | 'dark' | 'system' = stored ?? 'system';

  const setMode = (m: 'light' | 'dark' | 'system') => {
    storage.set(THEME_KEY, m);
    setColorScheme(m);
  };

  return { colorScheme, mode, setMode };
}
