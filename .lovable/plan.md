

## Plan: Extensible Announcement Types System

### Overview
Add support for multiple announcement types (starting with "Departure" and "Break/Rest Stop") where each type has its own scripts and voice settings. Admins can create new types in the future and configure them independently.

### Database Changes

**New table: `announcement_types`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| operator_id | uuid (FK) | References operators |
| type_key | text | Unique slug like `departure`, `break_stop` |
| type_name | text | Display name like "Departure Announcement" |
| description | text | Optional description |
| announcement_scripts | jsonb | `{english, khmer, chinese}` templates |
| voice_settings | jsonb | Per-language voice config (same structure as current) |
| repeat_count | integer | Default 3 |
| is_active | boolean | Default true |
| is_default | boolean | Whether this is a system-provided default type |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint on `(operator_id, type_key)`.

**RLS Policies**: Same pattern as `operator_settings` - operator admins manage their own, super admins manage all.

**Seed data migration**: For every existing operator, insert two default announcement types:
1. `departure` - copies scripts/voice_settings from existing `operator_settings`
2. `break_stop` - new default break announcement scripts

### Default Break/Rest Stop Scripts

- **English**: "Attention passengers. We are now taking a short break of approximately {break_duration} minutes. Please feel free to use the restroom or grab a snack. The bus will depart again shortly. Please return to the bus on time. Thank you for your cooperation."
- **Khmer**: "សូមអ្នកដំណើរទាំងអស់ យើងកំពុងឈប់សម្រាកបន្តិច ប្រមាណ {break_duration} នាទី សូមអញ្ជើញទៅបន្ទប់ទឹក ឬទិញអាហារតិចតួច រថយន្តនឹងចេញដំណើរវិញក្នុងពេលបន្តិចទៀត សូមត្រលប់មកវិញឱ្យទាន់ពេល សូមអរគុណ"
- **Chinese**: "各位旅客请注意，我们现在短暂休息约 {break_duration} 分钟。请大家可以使用洗手间或购买小吃。巴士将很快再次出发，请按时返回车上。谢谢大家的配合。"

### Available Placeholders per Type

Break/rest stop scripts use a subset of placeholders: `{break_duration}`, `{operator_name}`, `{destination}`.

### Frontend Changes

#### 1. New hook: `src/hooks/useAnnouncementTypes.tsx`
- Fetches all announcement types for an operator
- CRUD operations: create, update, delete types
- Returns `{ types, loading, createType, updateType, deleteType }`

#### 2. Update `OperatorSettings.tsx` - Add "Announcement Types" tab/section
- Show a list/accordion of all announcement types for the operator
- Each type expandable to show:
  - Type name (editable)
  - Scripts for English/Khmer/Chinese (editable with save buttons, same pattern as current)
  - Voice settings per language (same UI as current voice config)
  - Repeat count
  - Active toggle
- "Add New Announcement Type" button at the top to create custom types
- The "departure" type is marked as default and cannot be deleted

#### 3. Update `AnnouncementSystem.tsx`
- Accept an optional `announcementType` prop (defaults to `'departure'`)
- Fetch the matching announcement type config from the new table
- Use that type's scripts and voice settings instead of the global `operator_settings` scripts
- Falls back to `operator_settings` scripts if no matching type found (backward compatibility)

#### 4. Update `AdminPanel.tsx` - Add Break Announcement Button
- Add a "Break Announcement" play button on each departure row (or a standalone button)
- When clicked, plays the `break_stop` announcement type for that departure context
- This is the button drivers use during transit stops

### Backward Compatibility
- The existing `operator_settings.announcement_scripts` and `voice_settings` remain untouched
- The migration seeds `announcement_types` from existing `operator_settings` data
- `AnnouncementSystem` defaults to `departure` type, so all current behavior is preserved
- The `operator_settings` page restructures scripts into the new types UI

### Technical Details

```text
+-------------------+       +--------------------+
| operator_settings |       | announcement_types |
|-------------------|       |--------------------|
| operator_id       |       | operator_id        |
| voice_enabled     |       | type_key           |
| auto_announcement |       | type_name          |
| style_instructions|       | announcement_scripts|
| temperature       |       | voice_settings     |
| operator_name     |       | repeat_count       |
+-------------------+       | is_active          |
                            +--------------------+
```

Global settings (voice_enabled, auto_announcement, style_instructions, temperature, operator_name) stay in `operator_settings`. Per-type settings (scripts, voice config, repeat count) move to `announcement_types`.

### Implementation Order
1. Create `announcement_types` table with migration + seed existing operators
2. Create `useAnnouncementTypes` hook
3. Update `OperatorSettings.tsx` to manage announcement types
4. Update `AnnouncementSystem.tsx` to accept and use announcement type
5. Add break announcement button to `AdminPanel.tsx`

