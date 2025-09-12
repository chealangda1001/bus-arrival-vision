import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementRequest {
  text: string;
  language: 'english' | 'khmer' | 'chinese';
  operatorId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language, operatorId }: AnnouncementRequest = await req.json();

    if (!text || !language || !operatorId) {
      throw new Error('Missing required parameters: text, language, operatorId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate cache key with proper UTF-8 encoding
    const cacheKey = (() => {
      try {
        const jsonString = JSON.stringify({ text, language, voice: 'alloy' });
        // Use a simple hash approach to avoid stack overflow with large texts
        let hash = 0;
        for (let i = 0; i < jsonString.length; i++) {
          const char = jsonString.charCodeAt(i);
          hash = ((hash << 5) - hash + char) & 0xffffffff;
        }
        return btoa(`cache_${Math.abs(hash)}_${language}`);
      } catch (error) {
        console.error('Error generating cache key:', error);
        // Fallback to a simple hash-like key
        return btoa(`${language}_${text.length}_${Date.now()}`);
      }
    })();

    // Check if audio is already cached
    const { data: cachedAudio } = await supabase
      .from('announcements_cache')
      .select('audio_data')
      .eq('cache_key', cacheKey)
      .eq('operator_id', operatorId)
      .eq('language', language)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedAudio) {
      console.log(`Using cached audio for ${language}: ${text.substring(0, 50)}...`);
      return new Response(
        JSON.stringify({ audioData: cachedAudio.audio_data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new audio using OpenAI TTS
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Generating TTS for ${language}: ${text.substring(0, 50)}...`);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy', // Female voice
        response_format: 'mp3',
        speed: 1.0
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`OpenAI TTS API error: ${error.error?.message || 'Failed to generate speech'}`);
    }

    // Convert audio buffer to base64 safely
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    
    // Process in chunks to avoid stack overflow
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binaryString);

    // Cache the generated audio
    try {
      await supabase
        .from('announcements_cache')
        .insert({
          cache_key: cacheKey,
          audio_data: base64Audio,
          language,
          operator_id: operatorId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
      console.log(`Cached audio for ${language}`);
    } catch (cacheError) {
      console.warn('Failed to cache audio:', cacheError);
      // Continue without caching
    }

    return new Response(
      JSON.stringify({ audioData: base64Audio, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-announcement function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});