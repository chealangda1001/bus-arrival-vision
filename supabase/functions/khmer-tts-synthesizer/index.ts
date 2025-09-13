// Import dependencies
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Request interface
interface TTSRequest {
  text: string
  voice?: string
  rate?: number
  pitch?: number
  operatorId?: string
}

// Main handler function
async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request
    const { text, voice = 'nova', rate = 1.0, pitch = 1.0, operatorId }: TTSRequest = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    console.log(`Generating TTS for voice: ${voice}, text: ${text.substring(0, 50)}...`)

    // Generate cache key
    const encoder = new TextEncoder()
    const data = encoder.encode(`${text}_${voice}_${rate}_${pitch}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
    const cacheKey = `khmer_tts_${hashHex}`

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Skip cache for now to avoid any potential issues
    console.log('Skipping cache, generating new audio directly')

    // Generate audio using OpenAI
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
        speed: Math.max(0.25, Math.min(4.0, rate)),
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI TTS error: ${errorText}`)
    }

    // Convert to base64
    const arrayBuffer = await openaiResponse.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    console.log('Generated new audio successfully')

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
}

// Start server
Deno.serve(handleRequest)