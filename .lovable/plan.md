

## Fix Driver Mobile UI and Add Per-Language Playback

### Problem
The driver announcement buttons overflow on mobile screens. The emoji icons and text don't fit properly, and the current "playing" state shows the full AnnouncementSystem card (designed for admin, not mobile drivers).

### Changes

#### 1. Fix the driver play buttons in `DriverDashboard.tsx`
- Replace the current large buttons with a mobile-friendly layout:
  - Left side: emoji icon + type name (with `truncate` / `overflow-hidden` to prevent overflow)
  - Right side: duration badge + Play icon (triangle) button
- Reduce font sizes and ensure `overflow-hidden` on the button container
- When playing, instead of rendering the full `AnnouncementSystem` component (which has admin controls like Clear Cache, Regenerate), render a simplified driver-specific playing UI

#### 2. Add per-language playback UI when announcement is active
- When a driver taps the play button, show a card with:
  - A stop button at the top
  - Current playback status (repeat X of Y, generating, etc.)
  - Three language rows (Khmer, English, Chinese) each with a small play button
  - Tapping a language play button plays ONLY that language, ONE time, no repeat, no auto-next
- This requires adding a new prop or mode to `AnnouncementSystem` or building a lightweight driver-specific player

#### 3. Build a `DriverAnnouncementPlayer` component (new file)
Rather than overloading `AnnouncementSystem` with driver-specific logic, create a new lightweight component `src/components/DriverAnnouncementPlayer.tsx` that:
- Reuses the same TTS generation functions (extracted or called via supabase functions directly)
- Has a "full play" mode (all languages, with repeats) triggered by the main play button
- Has individual language play buttons that play a single language once
- Shows a collapsible/expandable view per language
- Is mobile-optimized with no admin controls

### Technical Details

**New file: `src/components/DriverAnnouncementPlayer.tsx`**
- Props: `departure`, `operatorId`, `announcementTypeKey`, `breakDurationOverride`, `onClose`
- Internally manages audio generation and playback using the same `supabase.functions.invoke` calls and `AudioQueue` from `audioCache.ts`
- Two playback modes:
  - `playAll()`: plays Khmer -> English -> Chinese with repeat count from announcement type config
  - `playSingleLanguage(lang)`: plays just one language, once, no repeat
- UI: compact card with stop button, language rows with individual play buttons

**Modified file: `src/pages/DriverDashboard.tsx`**
- Fix button layout: use `flex items-center justify-between` with `min-w-0` and `truncate` on the text
- Move play icon (lucide `Play`) to right side next to duration
- When `isPlaying`, render `DriverAnnouncementPlayer` instead of `AnnouncementSystem`
- Remove dependency on `AnnouncementSystem` import

**File: `src/components/AnnouncementSystem.tsx`**
- No changes needed (admin UI stays as-is)

### UI Layout for Driver Buttons (not playing)

```text
+------------------------------------------+
| [emoji] Type Name        (15min) [> Play] |
+------------------------------------------+
```

### UI Layout when playing (expanded)

```text
+------------------------------------------+
| [Stop]  Break/Rest Stop   Playing 1/3    |
|------------------------------------------|
| [KH] Khmer announcement...    [> Play]   |
| [EN] English announcement...  [> Play]   |
| [CN] Chinese announcement...  [> Play]   |
+------------------------------------------+
```

