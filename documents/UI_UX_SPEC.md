---

### `UI_UX_SPEC.md`

```markdown
# UI / UX Component & Screen Architecture

## 1. Design System & Tokens
- **Palette:** Emerald (`brand-600: #059669`, `brand-500: #10b981`), Slate (`slate-900: #0f172a`, `slate-50: #f8fafc`), Amber (Warnings/Food), Rose (Deletions/Skips).
- **Typography:** Inter / System Font with monospace font weights for mathematical time strings.
- **Haptics:** Light haptic feedback on card grab, success feedback on status toggles (`expo-haptics`).

## 2. Screen & Component Hierarchy

### Screen 1: Trip Dashboard (`/trips/index`)
- Top Bar: App Logo, User Avatar, Add Trip FAB (`+`).
- Tab Selector: `Active Trips` | `Upcoming` | `Archived`.
- Trip Card: Destination cover image, title, dates, role badge (`Owner`/`Editor`), member avatar stack.

### Screen 2: Day Itinerary View (`/trips/[id]/day`)
- **Sticky Header:** Day Tabs (`Day 1`, `Day 2`, `Gear Checklist`), Undo & Redo buttons, Trip Reset button.
- **Day Meta Card:** Start Time Picker (`input type="time"`), Add Place Modal Trigger, Progress Percentage Bar.
- **Draggable Timeline Cards (`<StopCard />`):**
  - Drag Grip Handle + Order Index Badge.
  - Computed Arrival & Departure Times (e.g., `06:30 AM → 08:30 AM`).
  - Category Badge (`Sightseeing`, `Food`, `Activity`, `Transit`).
  - Status Action Buttons (`Pending`, `Visited`, `Skip`).
  - **Edit Place Button** (Pencil icon launching Edit Modal).
  - **Delete Place Button** (Trash icon with confirmation prompt).
  - Location Title & Highlight string with sparkle icon.
  - **Collapsible "What to do" Accordion:** Defaults closed; reveals detailed visit recommendations on tap.
  - **Duration & Transit Inputs:** Inline numeric steppers (in 5-min increments).
  - **Collapsible Notes Accordion:** Multiline text field for ticket numbers, URLs, and reminders.
  - Google Maps & Directions Action Pills.
- **Transit Connecting Dividers:** Dashed vertical line displaying `<N> min scenic ride` with scooter icon.

### Screen 3: Add / Edit Place Modals (`<PlaceModal />`)
- Inputs: Name, Location Query, Category, Duration (mins), Transit to Next (mins), Highlights, What to do, Notes.

### Screen 4: Master Packing Checklist (`/trips/[id]/packing`)
- Overall Progress Bar and completion counter (`12/20 Packed`).
- Quick Add Gear Form with category dropdown.
- Category Accordions (Documents, Monsoon Gear, Electronics, Clothing, Medical) with checkbox toggles and delete icons.

### Screen 5: Extended Profile & Settings (`/profile`)
- User details editor: Name, Username (`@handle`), Email, Phone Number, Gender, Bio, Emergency Contacts.