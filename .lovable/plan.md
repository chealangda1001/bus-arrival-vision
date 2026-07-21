## Problem

After switching the Khmer TTS provider to KiriTTS, the "Ready for Departure" panel keeps showing Khmer as ❌ Not Cached even right after a successful generation. English and Chinese show ✅ Cached correctly.

## Root cause

`generateDirectKhmerTTS` in `src/components/AnnouncementSystem.tsx` correctly switches the cache key based on the provider:
- Gemini: `gemini_khmer_{operatorId}_{b64}_{hash}`
- KiriTTS: `kiritts_khmer_{voice}_{operatorId}_{b64}_{hash}`

But `checkAllCacheStatus` (same file) always looks up the Khmer entry with the hardcoded Gemini key:
```
`gemini_khmer_${operatorId}_${btoa(...)}_${scriptHash}`
```
So when the active provider is KiriTTS, the audio is actually stored under the `kiritts_khmer_...` key, and the status probe misses it — hence the "Not Cached" badge even though the client-side IndexedDB entry exists (matching the console screenshot showing `khmer: 'missing'`).

## Fix

In `src/components/AnnouncementSystem.tsx`, make `checkAllCacheStatus` build the Khmer cache key the same way `generateDirectKhmerTTS` does:

- Read `useKiriTTS = ttsSettings?.khmer_provider === 'kiritts'` and `kiriVoice = ttsSettings?.kiritts_khmer_voice || 'Kiri'`.
- Compute the Khmer key as `kiritts_khmer_{voice}_{operatorId}_{b64}_{hash}` when KiriTTS is primary, otherwise the existing `gemini_khmer_...` key.
- Use that key in the `checkCacheStatus(...)` call for Khmer.

No other changes: English/Chinese keys, generation flow, and edge functions stay as-is.

## Files touched

- `src/components/AnnouncementSystem.tsx` — update `checkAllCacheStatus` (single function).
