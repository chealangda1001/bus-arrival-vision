# TTS cost review + Khmer speed control

## What the logs actually show (2 Aug – 9 Sep 2026)

Totals by provider and result:

| Provider | Played from device cache | Played from our server | Newly generated (billed) | Errors |
|---|---|---|---|---|
| KiriTTS | 2,367 | 283 | 985 | 107 |
| Google multispeaker | 4,864 | 843 | 1,366 | 0 |

Findings:

1. **Caching is working.** Roughly 3 out of 4 plays cost nothing. Every single generated KiriTTS file (979 distinct files) is present in our `tts-audio` storage — nothing is lost, and no file was ever generated twice for the same wording.
2. **The real cost driver is the wording changing, not a broken cache.** Almost every repeat charge on the busiest trips is a *different* announcement text. For plate 2AP 15-73 the departure time inside the sentence changed each time (3:30 រសៀល, 7:30 ព្រឹក, 4:00 រសៀល …), so each one is a genuinely new sentence and must be generated once. The heaviest users are Kampot trips at **Main Terminal** (top rows: 16, 16, 15, 14, 14 new generations each over five weeks).
3. **KiriTTS is currently failing.** 90 requests returned `KiriTTS API error: 404` (most recent today, 9 Sep 05:36). All three speech endpoints we try are returning 404, so Khmer KiriTTS audio is not generating at all right now. Each failed attempt is also retried by the user, adding noise.

So there is no cache leak to fix — the savings must come from generating fewer distinct sentences and from not repeating failed calls.

## What I propose to build

### 1. Fix the KiriTTS 404 (highest priority)
Verify the current KiriTTS speech endpoint and model name against their live API, correct the request, and stop retrying dead endpoints on every call.

### 2. Khmer speed control for admins
Add a speed setting for KiriTTS Khmer (slider from 0.7 to 1.2, default 0.9 — slightly slower than today) in the system TTS settings screen, alongside the existing provider and voice pickers. The speed is sent to KiriTTS and becomes part of the audio's identity, so changing it regenerates once and then caches permanently at the new speed.

### 3. Split each announcement into reusable pieces (the big saving)

Instead of sending one long paragraph to KiriTTS every time, the announcement is built from separate small recordings that are stitched together at play time:

- **Fixed part** — the welcome and safety wording, identical for every trip. Generated once, reused forever.
- **Changing parts** — destination, plate number, departure time, countdown. Each value gets its own tiny recording (for example "3:30 រសៀល" or "2AP 15-73"), generated once the first time that value ever appears and reused by every trip afterwards.

Playing an announcement then means playing several cached clips back to back, with no gap between them. Only a value never spoken before costs anything, and after the first week almost every piece is already on hand: there are only 48 possible half-hour times, a fixed set of plates, and a fixed set of destinations.

Expected effect on the numbers above: the ~985 KiriTTS generations over five weeks drop to a few hundred one-off fragments, then to near zero.

Practical notes on this approach:
- Fragments are recorded with the same voice and speed, and the joins land on natural comma pauses, so it still sounds like one announcement. If any join sounds wrong in review, that phrase becomes part of the fixed block instead.
- A small silence is inserted between clips so words don't run together.
- If a fragment is somehow missing and can't be generated, the system falls back to generating the whole paragraph as it does today, so an announcement never fails to play.
- The old whole-paragraph recordings stay in storage and keep working during the switchover.

Alongside this:
- Reuse audio across trips and branches: a fragment is stored by its wording, so every branch shares the same recordings.
- Do not call the provider again after a failure within a short window for the same wording; show the error instead of silently re-billing.


### 4. Cost visibility
Add to the TTS Usage screen: new generations per branch, top 20 most-generated trips, and an estimated character count so you can see where money goes without asking me to query.

## Technical notes

- `system_tts_settings`: add `kiritts_khmer_speed numeric not null default 0.9` (migration).
- `useSystemTtsSettings` + `TtsProviderSettings.tsx`: expose and persist the speed value.
- `kiritts-tts` edge function: accept `speed`, pass it in the speech request body, include it in `cacheKey`/`storagePath` hash so old and new speeds don't collide; verify endpoint/model; short-circuit repeated failures.
- Script builder: tokenise the template into an ordered list of segments (`static` text vs `var:<name>=<value>`); each segment hashes to its own cache key `kiritts_<lang>_<voice>_<speed>_<sha256(text)>` — operator-independent so fragments are shared globally.
- Playback: resolve every segment from IndexedDB, then storage, then generate; play sequentially via a queued `Audio` chain (or Web Audio concat) with ~120ms silence between segments. Single-paragraph generation kept as fallback.
- `kiritts-tts`: accept a `segments[]` batch so one round trip can fill several missing fragments; log each fragment in `tts_request_logs` with its own `script_hash`.
- `TtsUsageLogs.tsx`: add branch and per-trip generation aggregates over `tts_request_logs`.
- No change to the permanent client cache (no TTL, per existing rule).
