import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { logTtsRequest, recordClip, clipStoragePath } from '../_shared/ttsLog.ts'

// ---- Shared TTS storage helpers (serve audio from a public bucket to cut egress) ----
const TTS_BUCKET = 'tts-audio';
// Official KiriTTS speech endpoint (OpenAI-compatible). model 'kiritts' = TTS ('kiristt' is STT).
const KIRITTS_SPEECH_URL = 'https://api.kiritts.com/v1/audio/speech';
const KIRITTS_MODEL = 'kiritts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function ttsPublicUrl(path: string): string {
  const url = Deno.env.get('SUPABASE_URL')!;
  return `${url}/storage/v1/object/public/${TTS_BUCKET}/${path}`;
}

async function findCachedAudioUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(ttsPublicUrl(path), { method: 'HEAD' });
    if (res.ok) return ttsPublicUrl(path);
  } catch (_) { /* treat as miss */ }
  return null;
}

async function uploadAudioToStorage(path: string, bytes: Uint8Array, contentType: string): Promise<string | null> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await supabase.storage.from(TTS_BUCKET).upload(path, bytes, {
      contentType,
      upsert: true,
      cacheControl: '31536000',
    });
    if (error) {
      console.error('TTS storage upload error:', error.message);
      return null;
    }
    return ttsPublicUrl(path);
  } catch (e) {
    console.error('uploadAudioToStorage failed:', e);
    return null;
  }
}

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  const chunkSize = 8192;
  let result = '';
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(result);
}

// Recent failures per cache key, so a retry storm cannot re-bill the provider.
const recentFailures = new Map<string, number>();
const FAILURE_COOLDOWN_MS = 60_000;

function isCoolingDown(key: string): boolean {
  const at = recentFailures.get(key);
  if (!at) return false;
  if (Date.now() - at > FAILURE_COOLDOWN_MS) {
    recentFailures.delete(key);
    return false;
  }
  return true;
}

interface SegmentRequest {
  text: string;
  cacheKey: string;
  kind?: string;
}

interface KiriTTSRequest {
  text?: string;
  segments?: SegmentRequest[];
  operatorId: string;
  voice?: string;
  speed?: number;
  language?: string; // 'khmer' | 'english' | 'chinese'
  cacheKey?: string;
  // Optional logging context
  branchId?: string;
  departureId?: string;
  destination?: string;
  plateNumber?: string;
  departureTime?: string;
  announcementType?: string;
  scriptHash?: string;
  segmentKind?: string;
}

async function callKiriTTS(apiKey: string, text: string, voice: string, speed: number): Promise<Uint8Array> {
  const res = await fetch(KIRITTS_SPEECH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: KIRITTS_MODEL,
      voice,
      input: text,
      response_format: 'mp3',
      speed,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`KiriTTS API error: ${res.status} - ${body || '(empty body)'}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  let logBase: any = { provider: 'kiritts', language: 'khmer' };

  try {
    const request: KiriTTSRequest = await req.json();

    if (!request.operatorId) throw new Error('Operator ID is required');
    const hasSegments = Array.isArray(request.segments) && request.segments.length > 0;
    if (!request.text && !hasSegments) throw new Error('Text parameter is required');

    const rawApiKey = Deno.env.get('KIRITTS_API_KEY');
    if (!rawApiKey) throw new Error('KIRITTS_API_KEY not configured');
    const apiKey = rawApiKey.trim().replace(/^Bearer\s+/i, '');

    const voice = request.voice || 'Kiri';
    const language = request.language || 'khmer';
    // KiriTTS accepts 0.7 - 1.2 only.
    const speed = Math.min(1.2, Math.max(0.7, Number(request.speed) || 1.0));

    // ---- Batch mode: fill several announcement fragments in one round trip ----
    if (hasSegments) {
      const results: Array<{ cacheKey: string; audioUrl?: string; audioContent?: string; cached: boolean; error?: string }> = [];

      for (const segment of request.segments!) {
        const segStarted = Date.now();
        const storagePath = clipStoragePath(language, voice, await hashKey(segment.cacheKey), 'mp3');
        const segLog = {
          provider: 'kiritts',
          operatorId: request.operatorId,
          branchId: request.branchId,
          departureId: request.departureId,
          destination: request.destination,
          plateNumber: request.plateNumber,
          departureTime: request.departureTime,
          announcementType: request.announcementType,
          language,
          voice,
          scriptText: segment.text,
          scriptHash: request.scriptHash,
          cacheKey: segment.cacheKey,
          storagePath,
        };

        const cachedUrl = await findCachedAudioUrl(storagePath);
        if (cachedUrl) {
          await logTtsRequest(req, { ...segLog, cacheResult: 'storage_hit', durationMs: Date.now() - segStarted });
          await recordClip({ cacheKey: segment.cacheKey, language, provider: 'kiritts', voice, speed, text: segment.text, segmentKind: segment.kind, storagePath, generated: false });
          results.push({ cacheKey: segment.cacheKey, audioUrl: cachedUrl, cached: true });
          continue;
        }

        if (isCoolingDown(segment.cacheKey)) {
          results.push({ cacheKey: segment.cacheKey, cached: false, error: 'Recently failed; not retrying yet.' });
          continue;
        }

        try {
          const bytes = await callKiriTTS(apiKey, segment.text, voice, speed);
          const url = await uploadAudioToStorage(storagePath, bytes, 'audio/mpeg');
          await logTtsRequest(req, { ...segLog, cacheResult: 'generated', durationMs: Date.now() - segStarted });
          await recordClip({ cacheKey: segment.cacheKey, language, provider: 'kiritts', voice, speed, text: segment.text, segmentKind: segment.kind, storagePath, generated: true });
          results.push({
            cacheKey: segment.cacheKey,
            cached: false,
            ...(url ? { audioUrl: url } : { audioContent: uint8ArrayToBase64(bytes) }),
          });
        } catch (segErr) {
          recentFailures.set(segment.cacheKey, Date.now());
          await logTtsRequest(req, {
            ...segLog,
            cacheResult: 'error',
            errorMessage: (segErr as Error).message,
            durationMs: Date.now() - segStarted,
          });
          results.push({ cacheKey: segment.cacheKey, cached: false, error: (segErr as Error).message });
        }
      }

      return new Response(JSON.stringify({ success: true, method: 'kiritts', language, voice, speed, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Single-text mode ----
    const text = request.text!;
    const cacheKey = request.cacheKey || `kiritts_${language}_${voice}_${speed}_${await hashKey(text)}_${request.operatorId}`;
    const storagePath = clipStoragePath(language, voice, await hashKey(cacheKey), 'mp3');

    logBase = {
      provider: 'kiritts',
      operatorId: request.operatorId,
      branchId: request.branchId,
      departureId: request.departureId,
      destination: request.destination,
      plateNumber: request.plateNumber,
      departureTime: request.departureTime,
      announcementType: request.announcementType,
      language,
      voice,
      scriptText: text,
      scriptHash: request.scriptHash,
      cacheKey,
      storagePath,
    };

    // 1) Storage hit? Serve the existing file directly.
    const cachedUrl = await findCachedAudioUrl(storagePath);
    if (cachedUrl) {
      console.log('✅ Serving cached KiriTTS audio from storage:', storagePath);
      await logTtsRequest(req, { ...logBase, cacheResult: 'storage_hit', durationMs: Date.now() - startedAt });
      await recordClip({ cacheKey, language, provider: 'kiritts', voice, speed, text, segmentKind: request.segmentKind, storagePath, generated: false });
      return new Response(JSON.stringify({
        audioUrl: cachedUrl,
        cached: true,
        cacheKey,
        method: 'kiritts',
        success: true,
        language,
        voice,
        speed,
        textLength: text.length,
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (isCoolingDown(cacheKey)) {
      throw new Error('KiriTTS recently failed for this text; not retrying yet.');
    }

    // 2) Generate via KiriTTS.
    console.log(`Generating KiriTTS ${language} audio with voice ${voice}, speed ${speed}, length ${text.length}`);
    let audioBytes: Uint8Array;
    try {
      audioBytes = await callKiriTTS(apiKey, text, voice, speed);
    } catch (genErr) {
      recentFailures.set(cacheKey, Date.now());
      throw genErr;
    }

    const audioUrl = await uploadAudioToStorage(storagePath, audioBytes, 'audio/mpeg');

    const response = {
      audioUrl,
      // base64 fallback only if the upload failed, so playback never fully breaks.
      ...(audioUrl ? {} : { audioContent: uint8ArrayToBase64(audioBytes) }),
      cached: false,
      cacheKey,
      method: 'kiritts',
      success: true,
      language,
      voice,
      speed,
      textLength: text.length,
      timestamp: new Date().toISOString(),
    };

    await logTtsRequest(req, { ...logBase, cacheResult: 'generated', durationMs: Date.now() - startedAt });
    await recordClip({ cacheKey, language, provider: 'kiritts', voice, speed, text, segmentKind: request.segmentKind, storagePath, generated: true });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in kiritts-tts function:', error);
    await logTtsRequest(req, { ...logBase, cacheResult: 'error', errorMessage: error.message, durationMs: Date.now() - startedAt });
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      method: 'kiritts',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
