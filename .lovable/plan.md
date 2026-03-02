

## Fix Driver Announcement Player Behavior

### Problem
Currently:
1. Clicking the announcement type button (e.g., "Break/Rest Stop") immediately starts auto-playing all voices
2. Clicking "Stop" closes/collapses the language options panel entirely
3. The user wants the type button to just toggle open/close the language panel, and voice only plays when explicitly hitting a Play button

### Changes

#### 1. `src/pages/DriverDashboard.tsx` -- Toggle expand/collapse instead of "play"
- Rename state from `playingAnnouncements` to `expandedAnnouncements` (tracks which type panels are open)
- Clicking the type button toggles the expanded state (show/hide language rows) without triggering any audio
- Add a "Play All" button inside the expanded panel header to trigger the full sequence playback
- Remove the `onClose` callback that collapses the panel when Stop is hit

#### 2. `src/components/DriverAnnouncementPlayer.tsx` -- Remove auto-play, keep panel on stop
- Remove the `useEffect` that auto-starts `playAll()` on mount (lines 205-210)
- Add a "Play All" button in the header that triggers `playAll()` manually
- Change the "Stop" button to only stop audio playback without calling `onClose()` -- the panel stays visible
- Keep individual per-language play buttons as they are (single play, no repeat)
- The `onClose` prop is no longer called from Stop -- it will only be triggered from the parent when the type button is clicked again to collapse

### UI Behavior Summary

```text
Click "Break/Rest Stop" --> expands language panel (no audio plays)
Click "Play All" button --> plays all languages with repeats
Click "Stop" --> stops audio, panel stays open
Click "Break/Rest Stop" again --> collapses language panel
```

### Technical Details

**`DriverDashboard.tsx`**:
- State: `expandedAnnouncements` (Record of string to boolean) replaces `playingAnnouncements`
- Type button click: toggles `expandedAnnouncements[key]`
- Always render `DriverAnnouncementPlayer` when expanded (not conditional on playing)

**`DriverAnnouncementPlayer.tsx`**:
- Remove auto-play `useEffect`
- Header shows: type name + "Play All" button (plays full sequence) + "Stop" button (only visible during playback)
- Stop button calls `stopAll()` only -- does NOT call `onClose()`
- `onClose` prop can be removed or kept unused
