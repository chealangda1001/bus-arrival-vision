## Problem

The Chinese voice never plays. Console logs show that once the announcement‑type config loads, the Chinese script template is an empty string (`""`), so playback logs "Skipping Chinese - empty template" and the audio is never generated or cached (badge stays "Not Cached").

The backend is healthy: the `gemini-multispeaker-tts` edge function returns a valid Chinese MP3 when given Chinese text (verified directly). The issue is that the Chinese **script text** is blank for this operator's "departure" announcement type.

Root cause in `src/components/AnnouncementSystem.tsx`:

```tsx
const script = announcementTypeConfig?.announcement_scripts
  || settings?.announcement_scripts
  || { …defaults };
```

The fallback is all-or-nothing at the object level. The announcement type has Khmer + English filled but an empty Chinese field, so the whole type object is used and the empty Chinese string wins — the settings/default Chinese text is never substituted.

## Fix

Make the script fallback work **per language** so a blank field for any language falls back to operator settings, then to the built‑in default.

In `AnnouncementSystem.tsx`, replace the single object-level fallback with a merged object that picks the first non-empty value for each of `khmer`, `english`, `chinese`:

```text
for each lang in (khmer, english, chinese):
  script[lang] =
    announcementTypeConfig?.announcement_scripts?[lang]?.trim()
    || settings?.announcement_scripts?[lang]?.trim()
    || DEFAULT_SCRIPTS[lang]
```

This keeps the type-specific Khmer/English text while filling the missing Chinese from settings or the default, so Chinese generates, plays, and caches like the others. Languages the operator intentionally leaves blank everywhere (type + settings + no default) still skip correctly.

## Also worth noting (optional, not required for the fix)

- Server-side storage caching is currently failing for every language: `gemini-multispeaker-tts` returns `audioUrl: null` and falls back to base64, because the `tts-audio` bucket upload isn't succeeding. Playback still works via the base64 fallback, but this defeats the earlier egress-reduction work. Can be investigated separately if desired.

## Alternative (no code change)

If Chinese should differ per announcement type, the operator can simply fill in the Chinese script in the Translations / Announcement Type editor for the "departure" type. The per-language fallback above is the more robust fix and prevents the class of bug for all languages.

## Verification

- Reload the Departures view; the Chinese badge should generate and show "Cached" after a Play.
- Click "Play Announcement" — Khmer, English, then Chinese should all play in sequence.
- Confirm an announcement type that intentionally has an empty Khmer/English/Chinese everywhere still skips that language without error.

## Technical details

Single file changes: `src/components/AnnouncementSystem.tsx` — replace the `script` derivation (around lines 61–65) with a per-language merged object; no other logic, edge function, or DB changes needed.
