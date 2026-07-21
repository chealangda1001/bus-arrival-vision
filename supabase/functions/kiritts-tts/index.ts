import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

// ---- Shared TTS storage helpers (serve audio from a public bucket to cut egress) ----
const TTS_BUCKET = 'tts-audio';

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
    await supabase.storage.createBucket(TTS_BUCKET, { public: true }).catch(() => {});
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

interface KiriTTSRequest {
  text: string;
  operatorId: string;
  voice?: string;
  language?: string; // 'khmer' | 'english' | 'chinese'
  cacheKey?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: KiriTTSRequest = await req.json();

    if (!request.text) throw new Error('Text parameter is required');
    if (!request.operatorId) throw new Error('Operator ID is required');

    const apiKey = Deno.env.get('KIRITTS_API_KEY');
    if (!apiKey) throw new Error('KIRITTS_API_KEY not configured');

    const voice = request.voice || 'Kiri';
    const language = request.language || 'khmer';
    const cacheKey = request.cacheKey || `kiritts_${language}_${voice}_${btoa(unescape(encodeURIComponent(request.text)))}_${request.operatorId}`;
    const storagePath = `${request.operatorId}/kiritts_${language}_${await hashKey(cacheKey)}.mp3`;

    // 1) Storage hit? Serve the existing file directly.
    const cachedUrl = await findCachedAudioUrl(storagePath);
    if (cachedUrl) {
      console.log('✅ Serving cached KiriTTS audio from storage:', storagePath);
      return new Response(JSON.stringify({
        audioUrl: cachedUrl,
        cached: true,
        cacheKey,
        method: 'kiritts',
        success: true,
        language,
        voice,
        textLength: request.text.length,
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2) Generate via KiriTTS (OpenAI-compatible speech endpoint), returns audio/mpeg.
    console.log(`Generating KiriTTS ${language} audio with voice ${voice}, length ${request.text.length}`);
    const speechEndpoints = [
      'https://api.kiritts.com/v1/audio/speech',
      'https://www.kiritts.com/api/v1/audio/speech',
      'https://api.kiritts.com/api/v1/audio/speech',
    ];

    let ttsResponse: Response | null = null;
    let lastErrorText = '';

    for (const endpoint of speechEndpoints) {
      ttsResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'kiritts',
          voice,
          input: request.text,
        }),
      });

      if (ttsResponse.ok) break;
      lastErrorText = await ttsResponse.text().catch(() => '');
      console.warn(`KiriTTS speech endpoint failed: ${endpoint} (${ttsResponse.status}) - ${lastErrorText}`);
    }

    if (!ttsResponse || !ttsResponse.ok) {
      console.error(`KiriTTS API error: ${ttsResponse?.status || 'no response'} - ${lastErrorText}`);
      throw new Error(`KiriTTS API error: ${ttsResponse?.status || 'no response'} - ${lastErrorText}`);
    }

    const audioBytes = new Uint8Array(await ttsResponse.arrayBuffer());
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
      textLength: request.text.length,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in kiritts-tts function:', error);
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
