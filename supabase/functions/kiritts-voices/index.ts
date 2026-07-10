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

    const res = await fetch('https://api.kiritts.com/v1/audio/voices', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`KiriTTS voices error: ${res.status} - ${errorText}`);
      throw new Error(`KiriTTS voices error: ${res.status} - ${errorText}`);
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
