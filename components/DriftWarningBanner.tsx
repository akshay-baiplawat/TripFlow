import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import type { DriftWarning } from '../types';
import { useThemeColors } from '../utils/theme';

interface Props {
  warnings: DriftWarning[];
}

export function DriftWarningBanner({ warnings }: Props) {
  const { isDark } = useThemeColors();

  if (warnings.length === 0) return null;

  const first = warnings[0];
  const overflow = first?.overflowMinutes ?? 0;
  const overHours = Math.floor(overflow / 60);
  const overMins = overflow % 60;
  const overLabel = overHours > 0 ? `${overHours}h ${overMins}m` : `${overMins}m`;

  const iconColor = isDark ? '#fbbf24' : '#d97706';

  return (
    <View className="mx-4 mb-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 flex-row items-start gap-3">
      <AlertTriangle color={iconColor} size={18} style={{ marginTop: 1 }} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-amber-800 dark:text-amber-200">Schedule Overflow</Text>
        <Text className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          {warnings.length === 1
            ? `"${first?.stopName}" runs ${overLabel} past midnight.`
            : `${warnings.length} stops overflow midnight. Adjust start time or durations.`}
        </Text>
      </View>
    </View>
  );
}
