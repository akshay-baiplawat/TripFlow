import * as Notifications from 'expo-notifications';
import type { ComputedStop, DriftWarning } from '../types';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDepartureNotification(
  stopName: string,
  departureMinutes: number,
  dayDate: string,
): Promise<void> {
  const parts = dayDate.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;

  const fireDate = new Date(
    year, month - 1, day,
    Math.floor(departureMinutes / 60),
    departureMinutes % 60,
  );
  const notifyAt = new Date(fireDate.getTime() - 15 * 60 * 1000);

  if (notifyAt <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Departing in 15 minutes',
      body: `Time to head to ${stopName}`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notifyAt,
    },
  });
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function computeDriftWarnings(stops: ComputedStop[]): DriftWarning[] {
  return stops
    .filter((s) => s.computed.isNextDay)
    .map((s) => ({
      stopId: s.id,
      stopName: s.name,
      overflowMinutes: s.computed.arrivalMinutes - 1440,
    }));
}
