# Database Schema & Security Specification (Supabase / PostgreSQL)

## 1. Schema Definitions

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
    avatar_url TEXT,
    bio TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant friend search
CREATE INDEX idx_profiles_username_search ON public.profiles USING gin (username gin_trgm_ops);

-- 2. Trips Table
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    transport_mode TEXT DEFAULT 'scooter',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('planning', 'active', 'archived')) DEFAULT 'planning',
    invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trip Members (Junction Table for RBAC)
CREATE TABLE public.trip_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'editor',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (trip_id, user_id)
);

-- 4. Itinerary Days Table
CREATE TABLE public.itinerary_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time_minutes INT DEFAULT 390, -- 06:30 AM default (minutes from midnight)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (trip_id, day_number)
);

-- 5. Stops Table (Using Fractional Indexing for order_rank)
CREATE TABLE public.stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_id UUID REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
    order_rank DOUBLE PRECISION NOT NULL,
    name TEXT NOT NULL,
    location_query TEXT NOT NULL,
    category TEXT CHECK (category IN ('sightseeing', 'food', 'activity', 'transit')) DEFAULT 'sightseeing',
    duration_minutes INT DEFAULT 60,
    transit_to_next_minutes INT DEFAULT 20,
    status TEXT CHECK (status IN ('pending', 'visited', 'skipped')) DEFAULT 'pending',
    highlights TEXT,
    what_to_do TEXT,
    notes TEXT,
    is_what_to_do_open BOOLEAN DEFAULT FALSE,
    is_notes_open BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stops_day_order ON public.stops (day_id, order_rank ASC);

-- 6. Packing Items Table
CREATE TABLE public.packing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);