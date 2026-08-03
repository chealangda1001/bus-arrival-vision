# TTS cache verification + full TTS call logging

## What I found while checking the current code

- `AnnouncementSystem.tsx` builds provider-aware Khmer cache keys (`kiritts_khmer_...` / `gemini_khmer_...`) and stores audio in IndexedDB with a **24-hour TTL** (`audioCache.set(key, value, 24)`).
- `DriverAnnouncementPlayer.tsx` (lines 86-95) always uses the **hardcoded `gemini_khmer_...` key and always calls `gemini-khmer-tts`**, ignoring the KiriTTS provider setting. Every driver playback of a Khmer announcement therefore misses the cache written by the admin board and triggers a fresh provider call. This is a likely contributor to the rising cost.
- Edge functions do cache in the `tts-audio` storage bucket (HEAD probe before generating), but nothing records **who** called, for **which departure**, or whether the call was a hit or a miss — so cost cannot be attributed today.

## 1. TTS call log (new table + edge function logging)

New table `public.tts_request_logs`:

| column | purpose |
| --- | --- |
| `id`, `created_at` | identity |
| `operator_id`, `branch_id` | scoping |
| `user_id`, `user_email`, `user_role` | who requested |
| `departure_id`, `destination`, `plate_number`, `departure_time` | which trip |
| `announcement_type`, `language`, `provider`, `voice` | what was generated |
| `script_text`, `script_hash`, `cache_key`, `storage_path` | transcript + dedup identity |
| `cache_result` | `client_hit` / `storage_hit` / `generated` / `error` |
| `char_count`, `duration_ms`, `error_message` | cost + debugging |

RLS: super admins read all; operator admins read rows for their operator; inserts done by the edge functions via service role. Grants included.

Each TTS edge function (`kiritts-tts`, `gemini-khmer-tts`, `gemini-multispeaker-tts`, `direct-khmer-tts`) will:
- accept optional context from the client (`departureId`, `destination`, `plateNumber`, `departureTime`, `announcementType`, `language`, `branchId`, `scriptHash`),
- resolve the caller from the `Authorization` JWT for `user_id` / email / role,
- write one log row per request marked `storage_hit` or `generated` (and `error` on failure), never blocking the audio response.

Callers (`AnnouncementSystem.tsx`, `DriverAnnouncementPlayer.tsx`) pass that context, and also log **client cache hits** (`client_hit`) through a tiny `logTtsEvent` helper so the log shows the full picture: how many plays were served from cache vs. re-generated for an unchanged script.

## 2. TTS Usage log UI

New "TTS Logs" tab (Super Admin panel, and a filtered operator-scoped view in the operator admin panel) showing:
- a table of every call: time, user, branch, trip (destination / plate / time), language, provider, cache result, characters, transcript (expandable),
- filters by date range, language, provider, cache result, user,
- a summary strip: total calls, % served from cache, **repeat generations for an identical `script_hash`** (the number that answers "is the cache working"), and generated characters per provider.

## 3. Fix the driver-side cache miss

`DriverAnnouncementPlayer.tsx` will use the same provider-aware Khmer key and route to `kiritts-tts` when KiriTTS is primary (via `useSystemTtsSettings`), so driver playback reuses the same cache entries as the board.

## 4. Automated offline cache test

Add the Vitest setup this project does not have yet (`vitest.config.ts`, `src/test/setup.ts`, testing-library + jsdom + fake-indexeddb dev deps), then `src/components/__tests__/khmerTtsCache.test.tsx`:

- mock `supabase.functions.invoke` with a counter and IndexedDB with `fake-indexeddb`,
- first playback: expect exactly one `kiritts-tts` (or `gemini-khmer-tts`) invocation and an IndexedDB entry under the provider-aware key,
- second playback with the invoke mock set to reject (simulating offline): expect **zero further invocations** and audio still resolved from cache,
- same assertion for the driver player path,
- a regression test asserting the admin board and driver player produce the **identical** Khmer cache key for the same script and provider.

## 5. Make the cached audio permanent

Today the browser copy expires after 24 hours (`audioCache.set(key, value, 24)`), so the day after a generation the client re-requests the audio. This will be removed:

- `src/utils/audioCache.ts` gets a "no expiry" mode (entries stored without an `expires` cut-off; the periodic `clearExpired` sweep skips them).
- All `audioCache.set(...)` calls in `AnnouncementSystem.tsx` and `DriverAnnouncementPlayer.tsx` drop the 24-hour TTL, so audio is kept indefinitely.
- Regeneration then happens only when the cache key changes — and the key already contains the script hash, provider and voice, so it changes only if the script text, provider or voice changes.
- The server-side `tts-audio` storage copy is already permanent, so even a cleared browser cache results in a storage hit, not a new KiriTTS call.

## Technical notes

- Logging failures are swallowed — audio playback is never blocked by the log write.
- The offline test also asserts that a cached entry is still returned after simulating a clock advance well beyond 24 hours.


## Files touched

- migration: `tts_request_logs` table, grants, RLS
- `supabase/functions/_shared/ttsLog.ts` (new), and the four TTS functions
- `src/utils/audioCache.ts` (permanent entries), `src/components/AnnouncementSystem.tsx`, `src/components/DriverAnnouncementPlayer.tsx`
- `src/components/TtsUsageLogs.tsx` (new), `src/components/SuperAdminPanel.tsx`, `src/components/AdminPanel.tsx`
- `vitest.config.ts`, `src/test/setup.ts`, `src/components/__tests__/khmerTtsCache.test.tsx`
