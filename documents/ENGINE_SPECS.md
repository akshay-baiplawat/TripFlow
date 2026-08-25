---

### `ENGINE_SPECS.md`

```markdown
# Dynamic Cascading Engine & Undo/Redo Specifications

## 1. Cascading Time Calculation Engine

All calculations are performed strictly with integer minutes starting from midnight ([0, 1439]).

### Mathematical Rules:
Let S_i represent stop i in a scheduled day:
- StartOfDay = day.start_time_minutes
- For the first stop (i = 0):
  Arrival_0 = StartOfDay
- For subsequent stops (i > 0):
  Arrival_i = Departure_{i-1} + EffectiveTransit_{i-1}
- For all stops:
  EffectiveDuration_i = (status_i == 'skipped') ? 0 : duration_minutes_i
  EffectiveTransit_i = (status_i == 'skipped') ? 0 : transit_to_next_minutes_i
  Departure_i = Arrival_i + EffectiveDuration_i

### Time Formatting Algorithm:
```typescript
export function formatMinutesToTime(totalMinutes: number): { timeStr: string; isNextDay: boolean } {
  const isNextDay = totalMinutes >= 1440;
  let normalized = totalMinutes % 1440;
  if (normalized < 0) normalized += 1440;

  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return {
    timeStr: `${displayHours}:${displayMinutes} ${period}`,
    isNextDay
  };
}
---