import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, Alert, Linking, Modal } from 'react-native';
import {
  MapPin, ExternalLink, Pencil, Trash2,
  ChevronDown, ChevronUp, Sparkles, GripVertical,
} from 'lucide-react-native';
import { useScheduleStore } from '../stores/useScheduleStore';
import { useThemeColors } from '../utils/theme';
import type { ComputedStop, MemberRole } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: '#8b5cf6', food: '#f59e0b', activity: '#3b82f6', transit: '#64748b',
};

const CATEGORY_LABELS: Record<string, string> = {
  sightseeing: 'Sightseeing', food: 'Food & Drink', activity: 'Activity', transit: 'Transit',
};

interface Props {
  stop: ComputedStop;
  index: number;
  role: MemberRole;
  onEdit: (stop: ComputedStop) => void;
  drag?: () => void;
  isActive?: boolean;
}

export function StopCard({ stop, index, role, onEdit, drag, isActive }: Props) {
  const c = useThemeColors();
  const setStopStatus = useScheduleStore((s) => s.setStopStatus);
  const updateStopDuration = useScheduleStore((s) => s.updateStopDuration);
  const updateStopTransit = useScheduleStore((s) => s.updateStopTransit);
  const updateStopNotes = useScheduleStore((s) => s.updateStopNotes);
  const toggleAccordion = useScheduleStore((s) => s.toggleAccordion);
  const deleteStop = useScheduleStore((s) => s.deleteStop);
  const [localNotes, setLocalNotes] = useState(stop.notes ?? '');

  const [statusOpen, setStatusOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const statusTriggerRef = useRef<View>(null);

  const openStatusDropdown = () => {
    statusTriggerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setDropdownPos({ top: pageY + height + 4, left: pageX, width });
      setStatusOpen(true);
    });
  };

  useEffect(() => {
    setLocalNotes(stop.notes ?? '');
  }, [stop.notes]);

  const canEdit = role !== 'viewer';
  const canChangeStatus = true; // all members can mark stops visited/skipped
  const { arrivalTimeStr, departureTimeStr, isNextDay } = stop.computed;
  const categoryColor = CATEGORY_COLORS[stop.category] ?? '#64748b';

  const openMaps = () => {
    const url = stop.location_query.startsWith('http')
      ? stop.location_query
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.location_query)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Maps'));
  };

  const handleDelete = () =>
    Alert.alert('Delete stop', `Remove "${stop.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteStop(stop.id) },
    ]);

  return (
    <View
      style={{
        marginHorizontal: 16, marginBottom: 10,
        backgroundColor: c.card, borderRadius: 16,
        borderWidth: 1, borderColor: c.borderSubtle,
        flexDirection: 'row', overflow: 'hidden',
        opacity: stop.status === 'skipped' ? 0.5 : 1,
        elevation: isActive ? 8 : 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: isActive ? 4 : 1 },
        shadowOpacity: isActive ? 0.12 : 0.06, shadowRadius: isActive ? 8 : 3,
      }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          {canEdit && (
            <Pressable onPressIn={drag} disabled={!drag || isActive} style={{ marginTop: 2 }}>
              <GripVertical color={isActive ? c.brand : '#d1d5db'} size={16} />
            </Pressable>
          )}

          {/* Index badge */}
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: `${categoryColor}18`, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: categoryColor }}>{index + 1}</Text>
          </View>

          {/* Name + time + tag */}
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, lineHeight: 18 }} numberOfLines={1}>{stop.name}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.brandText }}>
              {arrivalTimeStr}{isNextDay ? ' +1' : ''} → {departureTimeStr}
            </Text>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: `${categoryColor}15`, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: categoryColor }}>{CATEGORY_LABELS[stop.category] ?? stop.category}</Text>
            </View>
          </View>

          {canEdit && (
            <View style={{ flexDirection: 'row', gap: 2, marginTop: -2 }}>
              <Pressable onPress={() => onEdit(stop)} style={{ padding: 6, borderRadius: 8 }}>
                <Pencil color={c.textHint} size={14} />
              </Pressable>
              <Pressable onPress={handleDelete} style={{ padding: 6, borderRadius: 8 }}>
                <Trash2 color="#fca5a5" size={14} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Status — visible to all, editable by all members */}
        <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
          <View ref={statusTriggerRef}>
            <Pressable
              onPress={canChangeStatus ? openStatusDropdown : undefined}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.input, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', textTransform: 'capitalize', color: stop.status === 'visited' ? '#059669' : stop.status === 'skipped' ? '#64748b' : '#d97706' }}>
                {stop.status}
              </Text>
              {canChangeStatus && <ChevronDown color={c.textHint} size={14} />}
            </Pressable>
          </View>

          {/* Dropdown via Modal so tapping outside closes it */}
          {canChangeStatus && (
            <Modal transparent visible={statusOpen} animationType="none" onRequestClose={() => setStatusOpen(false)}>
              <Pressable style={{ flex: 1 }} onPress={() => setStatusOpen(false)}>
                <View style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 }}>
                  {(['pending', 'visited', 'skipped'] as const).map((s, i) => {
                    const color = s === 'visited' ? '#059669' : s === 'skipped' ? '#64748b' : '#d97706';
                    const active = stop.status === s;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => { setStopStatus(stop.id, s); setStatusOpen(false); }}
                        style={{ paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: active ? c.input : c.card, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.borderSubtle }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'capitalize', color }}>{s}</Text>
                        {active && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
                      </Pressable>
                    );
                  })}
                </View>
              </Pressable>
            </Modal>
          )}
        </View>

        {/* Highlights */}
        {stop.highlights ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Sparkles color="#f59e0b" size={12} style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: c.textSecondary, flex: 1, lineHeight: 17 }}>{stop.highlights}</Text>
          </View>
        ) : null}

        {/* What to do */}
        {stop.what_to_do ? (
          <View style={{ borderTopWidth: 1, borderTopColor: c.borderSubtle }}>
            <Pressable onPress={() => toggleAccordion(stop.id, 'is_what_to_do_open')} style={{ paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>What to do</Text>
              {stop.is_what_to_do_open ? <ChevronUp color={c.textHint} size={13} /> : <ChevronDown color={c.textHint} size={13} />}
            </Pressable>
            {stop.is_what_to_do_open ? (
              <Text style={{ paddingHorizontal: 12, paddingBottom: 10, fontSize: 12, color: c.textSecondary, lineHeight: 18 }}>{stop.what_to_do}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Duration / Transit steppers */}
        {canEdit && (
          <View style={{ borderTopWidth: 1, borderTopColor: c.borderSubtle, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Duration', value: stop.duration_minutes, dec: () => updateStopDuration(stop.id, Math.max(5, stop.duration_minutes - 5)), inc: () => updateStopDuration(stop.id, stop.duration_minutes + 5) },
              { label: 'Transit', value: stop.transit_to_next_minutes, dec: () => updateStopTransit(stop.id, Math.max(0, stop.transit_to_next_minutes - 5)), inc: () => updateStopTransit(stop.id, stop.transit_to_next_minutes + 5) },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.input, borderRadius: 10, borderWidth: 1, borderColor: c.border }}>
                <Pressable onPress={item.dec} style={{ width: 34, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '500', color: c.textHint, lineHeight: 20 }}>−</Text>
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
                  <Text style={{ fontSize: 10, color: c.textHint }}>{item.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{item.value}m</Text>
                </View>
                <Pressable onPress={item.inc} style={{ width: 34, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '500', color: c.brandText, lineHeight: 20 }}>+</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Notes accordion */}
        <View style={{ borderTopWidth: 1, borderTopColor: c.borderSubtle }}>
          <Pressable onPress={() => toggleAccordion(stop.id, 'is_notes_open')} style={{ paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>Notes</Text>
            {stop.is_notes_open ? <ChevronUp color={c.textHint} size={13} /> : <ChevronDown color={c.textHint} size={13} />}
          </Pressable>
          {stop.is_notes_open && canEdit ? (
            <TextInput
              style={{ marginHorizontal: 12, marginBottom: 10, backgroundColor: c.input, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: c.text, borderWidth: 1, borderColor: c.border }}
              value={localNotes}
              onChangeText={setLocalNotes}
              onBlur={() => updateStopNotes(stop.id, localNotes)}
              placeholder="Add a note..."
              placeholderTextColor={c.textHint}
              multiline
              numberOfLines={3}
            />
          ) : stop.is_notes_open && stop.notes ? (
            <Text style={{ marginHorizontal: 12, marginBottom: 10, fontSize: 12, color: c.textSecondary, lineHeight: 18 }}>{stop.notes}</Text>
          ) : null}
        </View>

        {/* Maps link */}
        <View style={{ borderTopWidth: 1, borderTopColor: c.borderSubtle, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Pressable onPress={openMaps} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
            <MapPin color={c.brand} size={12} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: c.brandText }}>View on Maps</Text>
            <ExternalLink color={c.brand} size={10} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
