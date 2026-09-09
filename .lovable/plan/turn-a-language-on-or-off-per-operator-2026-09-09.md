# Turn a language on or off per operator

Right now there is no way to switch off one language. Every announcement always plays Khmer, English and Chinese, and all three are sent to the voice service. This plan adds a simple on/off switch so the operator can pause Chinese and keep only Khmer and English.

## What the operator will see

In the admin settings, in the Voice Configuration area, each language tab (Khmer / English / Chinese) gets an "Enabled" switch at the top. Turning Chinese off means:

- The departure board and driver page no longer play the Chinese clip.
- No Chinese text is ever sent to the voice service, so no new cost for Chinese.
- The Chinese language badge and cache status disappear from the announcement panel.
- The Chinese script box stays in settings, so the wording is kept and nothing is lost.
- Turning it back on later restores playback, reusing the clips already stored.

Also add a small note on the disabled tab: "This language is paused. No audio will be played or generated."

A safeguard: at least one language must stay enabled.

## Technical notes

- Extend `VoiceSettings` in `src/hooks/useOperatorSettings.tsx` with `enabled?: boolean`, defaulting to `true` in `normalizeSettings` and in `createDefaultSettings`. Stored inside the existing `voice_settings` JSON column, so no database migration is required.
- `src/components/OperatorSettings.tsx`: add a `Switch` per language tab wired through the existing `handleVoiceSettingUpdate(language, 'enabled', value)` path; block turning off the last enabled language with a toast.
- `src/components/AnnouncementSystem.tsx`: derive `enabledLanguages` from settings and use it in place of the hard-coded `['khmer','english','chinese']` lists — cache-status check, pre-generation/caching loop, multi-language playback sequence, per-language badges, and the language selector tabs. If the currently selected language becomes disabled, fall back to `multi`.
- `src/components/DriverAnnouncementPlayer.tsx`: same filtering for its `languages` array and its language chips.
- Uploaded per-departure audio (e.g. `chinese_audio_url`) is also skipped when the language is disabled.
- No change to storage, `tts_clips`, or cache keys; disabled languages are simply never requested.
