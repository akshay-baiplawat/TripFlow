# Row-Level Security (RLS) Policies

> **⚠️ IMPORTANT — Read before applying**
>
> The original design contained self-referential policies on `trip_members` that cause
> **infinite recursion** in PostgreSQL. A policy containing
> `EXISTS (SELECT 1 FROM public.trip_members ...)` on `trip_members` itself will loop
> indefinitely. The corrected policies below use two strategies to avoid this:
>
> 1. **SELECT on `trip_members`** — uses a `SECURITY DEFINER` helper function that bypasses RLS.
> 2. **UPDATE/DELETE on `trip_members`** — checks `public.trips.created_by` instead of re-querying `trip_members`.

---

## Step 1: Enable RLS on all tables

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;
```

## Step 2: Create SECURITY DEFINER helpers (run first)

These functions execute as the DB owner, bypassing RLS, so they can safely query `trip_members` without recursion.

```sql
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(p_trip_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;
```

## Step 3: Profiles

```sql
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

## Step 4: Trips

```sql
CREATE POLICY "Trip members can view trips"
  ON public.trips FOR SELECT USING (public.is_trip_member(id));

CREATE POLICY "Authenticated users can create trips"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update trips"
  ON public.trips FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Owners can delete trips"
  ON public.trips FOR DELETE USING (created_by = auth.uid());
```

## Step 5: Trip Members (self-referential recursion avoided)

```sql
-- Any authenticated user can be inserted (invite flow)
CREATE POLICY "Members can be inserted"
  ON public.trip_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT uses SECURITY DEFINER helper — avoids infinite recursion
CREATE POLICY "Members can select"
  ON public.trip_members FOR SELECT USING (public.is_trip_member(trip_id));

-- UPDATE checks trips.created_by — NOT trip_members (avoids recursion)
CREATE POLICY "Owners can update members"
  ON public.trip_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND created_by = auth.uid()));

-- Owner can remove anyone; member can remove themselves
CREATE POLICY "Owners can delete members"
  ON public.trip_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND created_by = auth.uid())
    OR user_id = auth.uid()
  );
```

## Step 6: Itinerary Days

```sql
CREATE POLICY "Trip members can view days"
  ON public.itinerary_days FOR SELECT USING (public.is_trip_member(trip_id));

CREATE POLICY "Owners and editors can mutate days"
  ON public.itinerary_days FOR ALL USING (public.is_trip_owner(trip_id));
```

## Step 7: Stops

```sql
CREATE POLICY "Members can view stops"
  ON public.stops FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.itinerary_days d
    JOIN public.trip_members tm ON tm.trip_id = d.trip_id
    WHERE d.id = stops.day_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Owners and Editors can mutate stops"
  ON public.stops FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.itinerary_days d
    JOIN public.trip_members tm ON tm.trip_id = d.trip_id
    WHERE d.id = stops.day_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'editor')
  ));
```

## Step 8: Packing Items

```sql
CREATE POLICY "Trip members can view packing items"
  ON public.packing_items FOR SELECT USING (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can mutate packing items"
  ON public.packing_items FOR ALL USING (public.is_trip_member(trip_id));
```
