import type { ItineraryDay, ComputedStop } from '../types';

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
}

export function formatMinutesToTime(totalMinutes: number): { timeStr: string; isNextDay: boolean } {
  const isNextDay = totalMinutes >= 1440;
  let normalized = totalMinutes % 1440;
  if (normalized < 0) normalized += 1440;

  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return { timeStr: `${displayHours}:${displayMinutes} ${period}`, isNextDay };
}

export function computeDynamicSchedule(day: ItineraryDay): ComputedStop[] {
  let currentMinutes = day.start_time_minutes;

  return day.stops.map((stop) => {
    const isSkipped = stop.status === 'skipped';
    const effectiveDuration = isSkipped ? 0 : Math.max(0, stop.duration_minutes);
    const effectiveTransit = isSkipped ? 0 : Math.max(0, stop.transit_to_next_minutes);

    const arrivalMinutes = currentMinutes;
    const departureMinutes = arrivalMinutes + effectiveDuration;
    currentMinutes = departureMinutes + effectiveTransit;

    return {
      ...stop,
      computed: {
        arrivalMinutes,
        departureMinutes,
        nextArrivalMinutes: currentMinutes,
        arrivalTimeStr: formatMinutesToTime(arrivalMinutes).timeStr,
        departureTimeStr: formatMinutesToTime(departureMinutes).timeStr,
        isNextDay: formatMinutesToTime(arrivalMinutes).isNextDay,
        effectiveDuration,
        effectiveTransit,
      },
    };
  });
}
