-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view usernames for friend search; users can only update own profile
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trips: Visible only to joined trip members
CREATE POLICY "Trip members can view trips" ON public.trips FOR SELECT
USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_members.trip_id = trips.id AND trip_members.user_id = auth.uid()));

CREATE POLICY "Owners can update trips" ON public.trips FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_members.trip_id = trips.id AND trip_members.user_id = auth.uid() AND trip_members.role = 'owner'));

CREATE POLICY "Owners can delete trips" ON public.trips FOR DELETE
USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_members.trip_id = trips.id AND trip_members.user_id = auth.uid() AND trip_members.role = 'owner'));

-- Stops: Owners & Editors can insert/update/delete; Viewers can only select
CREATE POLICY "Members can view stops" ON public.stops FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.itinerary_days d
    JOIN public.trip_members tm ON tm.trip_id = d.trip_id
    WHERE d.id = stops.day_id AND tm.user_id = auth.uid()
));

CREATE POLICY "Owners and Editors can mutate stops" ON public.stops FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.itinerary_days d
    JOIN public.trip_members tm ON tm.trip_id = d.trip_id
    WHERE d.id = stops.day_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'editor')
));

-- Viewers can update notes and accordion states on stops
CREATE POLICY "Viewers can update stop notes" ON public.stops FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.itinerary_days d
    JOIN public.trip_members tm ON tm.trip_id = d.trip_id
    WHERE d.id = stops.day_id AND tm.user_id = auth.uid()
))
WITH CHECK (true);