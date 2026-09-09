# Language-scoped voice clips + clip library for admins

## Goal

1. Make sure every small reusable voice clip belongs to one language only, so a Chinese announcement never plays a Khmer or English recording of the same place name.
2. Give admins a page that lists the saved clips, what they say, which language and voice they use, and how often they have been reused.

## What is already correct, and what is not

The clip identity used on the device already includes the language, provider, voice and speed, so on-device reuse is language-safe today.

The gap is on the server: the Google multi-speaker function (used for English and Chinese) builds its stored file name from the spoken text and voice only — it ignores the language the app sends. Two languages that share the same wording and the same voice name would therefore point at the same stored file. The Khmer functions already include the language in the file name.

## Changes

### 1. Language-scoped storage for every clip

- In the Google multi-speaker function, build the stored file path from the clip identity the app sends (which already carries language, voice and speed) instead of re-deriving it from the script text. Keep the existing behaviour when no identity is sent.
- Confirm the same for the Khmer and KiriTTS functions, and store clips under a per-language folder: `clips/<language>/<voice>/<hash>.mp3`.
- Existing files stay where they are; new clips use the new naming. No deletion of current audio.

### 2. Clip registry

New table `public.tts_clips`, one row per stored clip:

- `cache_key` (unique), `language`, `provider`, `voice`, `speed`
- `text` (the exact wording spoken), `segment_kind` (fixed wording vs. a value such as a time or plate)
- `storage_path`, `char_count`
- `reuse_count`, `last_used_at`, `created_at`

Every TTS function writes/updates its row: insert on generation, bump `reuse_count` and `last_used_at` on a stored-file hit. The app also bumps the counter (via the existing usage log path) when it replays a clip from the device, so the numbers reflect real reuse.

Access: readable by signed-in admin users of the operator and by service role; only edge functions write.

### 3. Admin "Voice clips" view

A new tab next to TTS Usage showing the clip library:

- Filters: language, provider, voice, and a text search.
- Columns: wording, language, voice, kind, times reused, characters, created, last used, and a small play button to listen to the stored file.
- Summary line: total clips, total characters generated, and characters saved by reuse.
- Sorted by most reused by default.

### 4. Backfill

One-off fill of `tts_clips` from the existing usage logs so the list is not empty on day one: distinct stored paths with their language, voice and observed hit counts.

## Technical notes

- Files: `supabase/functions/gemini-multispeaker-tts/index.ts`, `gemini-khmer-tts/index.ts`, `kiritts-tts/index.ts`, `supabase/functions/_shared/ttsLog.ts` (add a `recordClip` helper), `src/utils/announcementSegments.ts` (send `segmentKind` and text with each request), new `src/components/TtsClipLibrary.tsx`, and the admin/super-admin tab hosts.
- Clip identity stays `seg1_<language>_<provider>_<voice>_<speed>_<sha256(text)>`; only the server-side path derivation and the registry are added.
- Client cache remains permanent; nothing here introduces an expiry.
- Add tests: same wording in two languages must produce different clip keys and different storage paths.
