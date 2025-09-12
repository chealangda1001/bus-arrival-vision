import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TTSRequest {
  text: string
  voice?: string
  rate?: number
  pitch?: number
  operatorId?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, voice = 'nova', rate = 1.0, pitch = 1.0, operatorId }: TTSRequest = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    console.log(`Generating TTS for voice: ${voice}, text: ${text.substring(0, 50)}...`)

    // Generate cache key using crypto hash for Unicode support
    const encoder = new TextEncoder()
    const data = encoder.encode(`${text}_${voice}_${rate}_${pitch}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
    const cacheKey = `khmer_tts_${hashHex}`

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check cache first - handle null operator_id properly
    let cacheQuery = supabase
      .from('announcements_cache')
      .select('audio_data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
    
    if (operatorId) {
      cacheQuery = cacheQuery.eq('operator_id', operatorId)
    } else {
      cacheQuery = cacheQuery.is('operator_id', null)
    }
    
    const { data: cachedAudio } = await cacheQuery.single()

    if (cachedAudio) {
      console.log('Found cached audio')
      return new Response(
        JSON.stringify({ audioContent: cachedAudio.audio_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate new audio using OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: Math.max(0.25, Math.min(4.0, rate)), // OpenAI speed limits
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      throw new Error(`OpenAI TTS error: ${error}`)
    }

    // Convert audio to base64
    const arrayBuffer = await openaiResponse.arrayBuffer()
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    )

    // Cache the result - handle null operator_id properly
    await supabase
      .from('announcements_cache')
      .insert({
        operator_id: operatorId || null,
        cache_key: cacheKey,
        language: 'khmer',
        audio_data: base64Audio,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })

    console.log('Generated and cached new audio')

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('TTS synthesis error:', error)
    return new Response(
      JSON.stringify({ error: `TTS synthesis failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})