# Reduce TTS Egress with Storage-Backed Audio Caching

## The Problem

Today every TTS call returns the full audio as a **base64 JSON payload** (`audioContent`). The only persistence is each browser's IndexedDB cache. So:

- Every client cache miss (new device, cleared cache, public board screens, drivers) re-runs Gemini **and** re-sends a large base64 blob through the edge function — heavy egress and wasted Gemini quota.
- The same announcement is regenerated and re-downloaded independently by every device.
- base64 inflates payload size ~33% over the raw audio.

## The Fix

Generate each announcement **once**, store the audio file in a **public Supabase Storage bucket**, and have clients play it from the **CDN URL**. The edge function returns a small JSON `{ audioUrl }` instead of a big base64 string. The browser and CDN cache the file, and all devices share the same stored file.

```text
Before:  client → edge fn → Gemini → base64 (big) → client (every miss, per device)
After:   client → edge fn → [storage hit? return URL] else Gemini→upload→URL
         client plays <audio src=CDN URL>  (browser + CDN cached, shared)
```

## Implementation

### 1. Storage bucket
- Create a public bucket `tts-audio` (read-only public; writes only via edge functions using the service role).
- Files keyed by a deterministic hash of `operatorId + language + text + scriptHash`, e.g. `tts-audio/<operatorId>/<hash>.wav`. Same input → same path → automatic dedupe.

### 2. Edge functions (`gemini-khmer-tts`, `direct-khmer-tts`, `gemini-multispeaker-tts`)
- Compute the storage object path from the incoming cache key/hash.
- **Check storage first**: if the object already exists, return its public URL immediately — no Gemini call, no base64.
- On miss: generate audio (existing Gemini logic), **upload the bytes to the bucket** (service role), then return `{ audioUrl, cached:false }`.
- Stop returning the large `audioContent` base64 field by default (keep a small flag/fallback only if upload fails, so playback never fully breaks).
- Set long `cacheControl` (e.g. 1 year) on upload so the CDN/browser caches aggressively.

### 3. Frontend (`AnnouncementSystem.tsx`, `audioCache.ts`, driver player)
- `generateDirectKhmerTTS` / `generateDirectTTS` / multispeaker path: read `audioUrl` from the response instead of `audioContent`.
- Replace IndexedDB-of-base64 with a lightweight **URL map** in IndexedDB (cache key → audioUrl). URLs are tiny, so this still avoids edge-function round-trips, and the actual audio bytes are served/cached by the CDN.
- `AudioQueue`: add a `addUrlToQueue(url)` method that does `new Audio(url)` (alongside the existing base64 method for any uploaded-file fallback).
- Cache-status indicators (`cached` / `generating` / `missing`) stay, now driven by presence of a stored URL.
- "Clear cache" / "Regenerate": clear the local URL map and pass a force flag so the edge function regenerates and re-uploads (overwrites the storage object).

### 4. Backfill / compatibility
- No migration of existing IndexedDB needed — first play after deploy regenerates into storage, then all subsequent plays/devices are served from the CDN.
- Uploaded custom audio (`*_audio_url` on departures) is unchanged.

## Result
- Audio bytes leave the edge function **once per unique announcement** instead of on every cache miss.
- Repeat plays and multi-device/public-board playback are served from CDN cache (near-zero app egress).
- Bonus: fewer Gemini calls (shared server-side cache), lower cost and fewer quota errors.

## Files
- New Supabase migration: create `tts-audio` public bucket + `storage.objects` policies (public read, service-role write).
- `supabase/functions/gemini-khmer-tts/index.ts`
- `supabase/functions/direct-khmer-tts/index.ts`
- `supabase/functions/gemini-multispeaker-tts/index.ts`
- `src/utils/audioCache.ts`
- `src/components/AnnouncementSystem.tsx`
- `src/components/DriverAnnouncementPlayer.tsx` (align with URL-based playback)
