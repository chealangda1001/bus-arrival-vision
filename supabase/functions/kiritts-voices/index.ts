import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Passthrough that lists KiriTTS voices without exposing the API key to the client.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('KIRITTS_API_KEY');
    if (!apiKey) throw new Error('KIRITTS_API_KEY not configured');

    const voiceEndpoints = [
      'https://api.kiritts.com/v1/audio/voices',
      'https://api.kiritts.com/api/voices',
      'https://api.kiritts.com/api/v1/audio/voices',
    ];

    let res: Response | null = null;
    let lastErrorText = '';

    for (const endpoint of voiceEndpoints) {
      res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (res.ok) break;
      lastErrorText = await res.text().catch(() => '');
      console.warn(`KiriTTS voices endpoint failed: ${endpoint} (${res.status}) - ${lastErrorText}`);
    }

    if (!res || !res.ok) {
      console.error(`KiriTTS voices error: ${res?.status || 'no response'} - ${lastErrorText}`);
      throw new Error(`KiriTTS voices error: ${res?.status || 'no response'} - ${lastErrorText}`);
    }

    const data = await res.json();
    // Normalize to a simple array of voice names.
    const voices = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : [];

    return new Response(JSON.stringify({ success: true, voices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in kiritts-voices function:', error);
    return new Response(JSON.stringify({ success: false, error: error.message, voices: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
