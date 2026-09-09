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

### 3. Cut the number of distinct sentences (cost savings)
- Round the spoken time and drop the "in N minutes" countdown from the generated audio where it forces a new file, so the same trip at the same scheduled time reuses one recording forever.
- Reuse audio across trips with identical wording: the stored file is keyed by the sentence itself, not by trip, so two branches announcing the same thing share one recording.
- Do not call the provider again after a failure within a short window for the same sentence; show the error instead of silently re-billing.

### 4. Cost visibility
Add to the TTS Usage screen: new generations per branch, top 20 most-generated trips, and an estimated character count so you can see where money goes without asking me to query.

## Technical notes

- `system_tts_settings`: add `kiritts_khmer_speed numeric not null default 0.9` (migration).
- `useSystemTtsSettings` + `TtsProviderSettings.tsx`: expose and persist the speed value.
- `kiritts-tts` edge function: accept `speed`, pass it in the speech request body, include it in `cacheKey`/`storagePath` hash so old and new speeds don't collide; verify endpoint/model; short-circuit repeated failures.
- Announcement script builder: make the time/countdown token stable so the same scheduled departure yields a byte-identical script.
- `TtsUsageLogs.tsx`: add branch and per-trip generation aggregates over `tts_request_logs`.
- No change to the permanent client cache (no TTL, per existing rule).
