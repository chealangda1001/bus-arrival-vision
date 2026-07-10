## Goal

Add **KiriTTS** as a second text-to-speech provider alongside Gemini. As super admin, you can mark KiriTTS as the **primary** provider system-wide. When primary, KiriTTS generates the **Khmer** audio; English and Chinese continue to use Gemini. The KiriTTS API key is stored securely as a secret.

## How it works

KiriTTS is OpenAI-compatible. We call `POST https://api.kiritts.com/v1/audio/speech` with `{ model: "kiritts", voice, input }` and a `Bearer` API key, which returns `audio/mpeg`. All calls happen server-side in an edge function so the key is never exposed.

## What gets built

### 1. Secret
- Add a `KIRITTS_API_KEY` secret so you can paste the key you got from KiriTTS. (Requested via the secure secret form — I never see the value.)

### 2. Database: global TTS provider settings
A new singleton table `system_tts_settings` (super-admin controlled, applies to all operators):

```text
system_tts_settings
- id (uuid, pk)
- khmer_provider    text   default 'gemini'   -- 'gemini' | 'kiritts'
- kiritts_khmer_voice   text   default 'Kiri'
- kiritts_english_voice text   default 'Maly'   -- reserved for future use
- kiritts_chinese_voice text   default 'Kiri'   -- reserved for future use
- updated_at timestamptz default now()
```

- Seeded with one default row (`khmer_provider = 'gemini'`).
- RLS: readable by authenticated users (announcement system needs it); writable only by super admins via the existing `has_role`/role helper.
- Proper `GRANT`s included.

### 3. Edge function `kiritts-tts`
- Accepts `{ text, voice, operatorId, cacheKey }`.
- Calls KiriTTS `/v1/audio/speech`, receives MP3 bytes.
- Reuses the existing `tts-audio` storage bucket + hashing helpers so audio is cached/served by URL (same pattern as `gemini-khmer-tts`).
- Returns `{ audioUrl }` (base64 fallback), matching the shape `AnnouncementSystem` already expects.

### 4. Frontend routing (`src/components/AnnouncementSystem.tsx`)
- Load the global `system_tts_settings` (new lightweight hook `useSystemTtsSettings`).
- In `generateDirectKhmerTTS`, if `khmer_provider === 'kiritts'`, invoke `kiritts-tts` (with the configured Khmer voice) instead of `gemini-khmer-tts`. English/Chinese paths unchanged.
- Cache key includes the provider so switching providers doesn't serve stale audio.

### 5. Super-admin UI (`src/components/SuperAdminPanel.tsx`)
- New "TTS Provider" section (visible to super admin):
  - Toggle/select **Primary Khmer provider**: Gemini or KiriTTS.
  - **KiriTTS Khmer voice** picker — populated live from KiriTTS `GET /v1/audio/voices` (via a small edge function passthrough `kiritts-voices`, so the key stays server-side), with a text fallback.
  - Save button writes to `system_tts_settings`.

## Notes / limitations
- KiriTTS max input is 5000 characters — Khmer announcements are well under this.
- Only Khmer is routed to KiriTTS now; the English/Chinese voice fields are stored for easy future expansion but unused.
- Auth/roles already exist, so the super-admin gating works immediately.

After you approve, the first step will open a secure form for you to paste the `KIRITTS_API_KEY`.
