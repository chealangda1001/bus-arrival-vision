

## Plan: Driver Accounts, Departure Assignment, and Mobile-Friendly Driver UI

### Overview
Create a new `driver` role with a simplified, mobile-first UI where drivers see only their assigned departures and large play buttons for each announcement type. Operator admins can create driver accounts and assign departures to them.

---

### 1. Database Changes

**A. Add `driver` to the `user_role` enum**
```sql
ALTER TYPE public.user_role ADD VALUE 'driver';
```

**B. Create `driver_departures` junction table**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| driver_id | uuid (FK) | References profiles.id |
| departure_id | uuid (FK) | References departures.id |
| created_at | timestamptz | Default now() |

Unique constraint on `(driver_id, departure_id)`.

RLS policies:
- Drivers can SELECT their own assignments
- Operator admins can manage assignments for their operator's departures
- Super admins can manage all

**C. Update RLS on `departures`**: Add a SELECT policy allowing drivers to view departures assigned to them via `driver_departures`.

**D. Update RLS on `announcement_types`**: Drivers need to read active, driver-playable announcement types for their operator.

---

### 2. Update Edge Function: `create-admin-user`

- Accept `driver` as a valid role (in addition to `super_admin` and `operator_admin`)
- Allow **operator_admin** users (not just super_admin) to create driver accounts within their own operator
- For driver role: require `operator_id` and `branch_id`

---

### 3. Admin UI: Driver Management (in `AdminPanel.tsx`)

Add a new **"Drivers"** tab in the admin panel with:
- **Create Driver Account** form: email, password, display name
- **Driver list**: shows all driver accounts for this operator/branch
- **Assign Departures**: for each driver, a multi-select to assign departures
- **Delete/deactivate** driver accounts

---

### 4. New Page: Driver Dashboard (`src/pages/DriverDashboard.tsx`)

**Route**: `/driver` (driver logs in via `/auth`, gets redirected here)

**Design principles** (mobile-first, minimal):
- Full-width cards, large text (text-xl/text-2xl), large buttons
- No dropdowns, no hidden menus
- Each assigned departure shown as a card with:
  - Destination (large, bold)
  - Departure time, plate number (medium text)
  - One large, colored play button per driver-playable announcement type (e.g., "Short Break" in blue, "Meal Break" in orange)
  - Stop button when playing
- Simple header: driver name + logout button
- No admin features, no edit capabilities

**Visual layout per departure card:**
```text
+------------------------------------------+
|  Phnom Penh -> Siem Reap                 |
|  08:30 AM  |  Plate: 2A-1234            |
|                                          |
|  [  Short Break (15min)  ]   <- big btn  |
|  [  Meal Break  (30min)  ]   <- big btn  |
+------------------------------------------+
```

---

### 5. Update Auth Flow (`AuthPage.tsx` + `useSupabaseAuth`)

- Add redirect logic: if `profile.role === 'driver'`, navigate to `/driver`
- The driver uses the same `/auth` login page

---

### 6. Update Routing (`App.tsx`)

- Add route: `/driver` -> `DriverDashboard` component

---

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create: enum update, `driver_departures` table, RLS policies |
| `supabase/functions/create-admin-user/index.ts` | Edit: accept `driver` role, allow operator_admin callers |
| `src/pages/DriverDashboard.tsx` | Create: mobile-first driver UI |
| `src/hooks/useDriverDepartures.tsx` | Create: fetch driver's assigned departures |
| `src/components/DriverManagement.tsx` | Create: admin UI for managing drivers and assignments |
| `src/components/AdminPanel.tsx` | Edit: add "Drivers" tab |
| `src/components/AuthPage.tsx` | Edit: add driver redirect |
| `src/App.tsx` | Edit: add `/driver` route |

---

### Training Instructions (included in implementation)

**For Operator Admins:**
1. Go to Admin Panel > "Drivers" tab
2. Click "Create Driver Account" -- enter driver's email, password, name
3. Assign departures to the driver from the list
4. Share the login URL with the driver: `https://bus-arrival-vision.lovable.app/auth`
5. To configure which announcement types drivers can play, go to Settings > Announcement Types > toggle "Driver Playable"

**For Drivers:**
1. Open the link on your phone: `https://bus-arrival-vision.lovable.app/auth`
2. Log in with the email and password given by your admin
3. You will see your assigned departures with large play buttons
4. Tap "Short Break" or "Meal Break" to play the announcement
5. Tap the stop button to stop playback

