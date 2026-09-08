export type StopStatus = 'pending' | 'visited' | 'skipped';
export type TripStatus = 'planning' | 'active' | 'archived';
export type MemberRole = 'owner' | 'editor' | 'viewer';
export type TransportMode = 'scooter' | 'car' | 'transit';
export type StopCategory = 'sightseeing' | 'food' | 'activity' | 'transit';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null;
  avatar_url: string | null;
  bio: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stop {
  id: string;
  day_id: string;
  order_rank: number;
  name: string;
  location_query: string;
  category: StopCategory;
  duration_minutes: number;
  transit_to_next_minutes: number;
  status: StopStatus;
  highlights: string | null;
  what_to_do: string | null;
  notes: string | null;
  is_what_to_do_open: boolean;
  is_notes_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  title: string;
  description: string | null;
  start_time_minutes: number;
  created_at: string;
  stops: Stop[];
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  assigned_to: string | null;
  item_name: string;
  category: string;
  is_checked: boolean;
  is_shared: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  created_by: string | null;
  title: string;
  destination: string;
  transport_mode: TransportMode;
  start_date: string;
  end_date: string;
  status: TripStatus;
  invite_code: string;
  default_invite_role: 'viewer' | 'editor';
  created_at: string;
  updated_at: string;
  days: ItineraryDay[];
  members: TripMember[];
  packingItems: PackingItem[];
}

export interface ComputedStop extends Stop {
  computed: {
    arrivalMinutes: number;
    departureMinutes: number;
    nextArrivalMinutes: number;
    arrivalTimeStr: string;
    departureTimeStr: string;
    isNextDay: boolean;
    effectiveDuration: number;
    effectiveTransit: number;
  };
}

export interface DriftWarning {
  stopId: string;
  stopName: string;
  overflowMinutes: number;
}
