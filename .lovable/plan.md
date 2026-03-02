

## Plan: Add Meal Break Announcement Type + Break Duration Config + Driver Playback Controls

### 1. Database Migration

**Seed a new `meal_break` announcement type** for all existing operators, with default 30-minute break duration embedded in scripts:

- **English**: "Attention passengers. We are now stopping for a meal break of approximately 30 minutes. Please enjoy your meal at the restaurant area. The bus will depart again after the break. Please return to the bus on time. Thank you."
- **Khmer**: "សូមអ្នកដំណើរទាំងអស់ យើងកំពុងឈប់សម្រាកញ៉ាំអាហារ ប្រមាណ 30 នាទី។ សូមអញ្ជើញរីករាយជាមួយអាហារ។ រថយន្តនឹងចេញដំណើរវិញបន្ទាប់ពីសម្រាក។ សូមត្រលប់មកវិញឱ្យទាន់ពេល។ សូមអរគុណ។"
- **Chinese**: "各位旅客请注意，我们现在停车用餐，休息时间约30分钟。请大家到餐厅区域享用餐点。休息结束后巴士将继续出发，请按时返回车上。谢谢大家。"

Also **add a `default_break_duration` column** (integer, nullable, in minutes) to the `announcement_types` table so each type can store its own default break duration (e.g., 15 for short break, 30 for meal break).

**Add a `driver_playable` column** (boolean, default false) to `announcement_types` to control which types drivers can play. Set `break_stop` and `meal_break` to `true`, `departure` stays `false`.

### 2. Update `AnnouncementTypeManager.tsx`

- Add a **"Default Break Duration"** input field (in minutes) for each announcement type, saved to the new `default_break_duration` column.
- Add a **"Driver Playable"** toggle so admins can configure which announcement types appear in the driver's play menu.
- Update the available placeholders section to also show `{break_duration}` for `meal_break` type.

### 3. Update `useAnnouncementTypes.tsx`

- Add `default_break_duration` and `driver_playable` fields to the `AnnouncementType` interface.

### 4. Update `AdminPanel.tsx`

- Replace the hardcoded "Play Break Announcement" dropdown item with a **dynamic list** of driver-playable announcement types fetched via `useAnnouncementTypes`.
- Each playable type gets its own dropdown menu item with appropriate icon.
- Track active announcements per type+departure instead of just break announcements.
- When playing a break-type announcement, use that type's `default_break_duration` to override the departure's `break_duration` placeholder if needed.

### Technical Details

**Migration SQL:**
```sql
-- Add columns
ALTER TABLE announcement_types 
  ADD COLUMN default_break_duration integer,
  ADD COLUMN driver_playable boolean NOT NULL DEFAULT false;

-- Mark existing break_stop as driver-playable with 15min default
UPDATE announcement_types SET driver_playable = true, default_break_duration = 15 WHERE type_key = 'break_stop';

-- Seed meal_break for all operators
INSERT INTO announcement_types (operator_id, type_key, type_name, description, default_break_duration, driver_playable, is_default, announcement_scripts)
SELECT 
  id, 'meal_break', 'Meal Break Announcement', 'Longer break for meal time during transit', 30, true, true,
  '{"english": "...", "khmer": "...", "chinese": "..."}'::jsonb
FROM operators
WHERE NOT EXISTS (SELECT 1 FROM announcement_types WHERE announcement_types.operator_id = operators.id AND type_key = 'meal_break');
```

**Files to modify:**
- New migration SQL file
- `src/hooks/useAnnouncementTypes.tsx` -- add new fields to interface
- `src/components/AnnouncementTypeManager.tsx` -- add break duration input + driver playable toggle
- `src/components/AdminPanel.tsx` -- dynamic driver-playable announcement buttons
- `src/components/AnnouncementSystem.tsx` -- accept optional `breakDurationOverride` prop to substitute `{break_duration}` placeholder

