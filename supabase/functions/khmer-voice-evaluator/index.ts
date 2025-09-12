import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvaluationRequest {
  text: string
  voice: string
  operatorId?: string
}

// Khmer test phrases with common diacritics
const KHMER_TEST_PHRASES = [
  'សូមអ្នកដំណើរ', // Common greeting
  'ការធ្វើដំណើររបស់យើង', // Our journey
  'ពេលវេលាចេញ', // Departure time
  'ទីតាំងឡើងឡាន', // Boarding location
  'សេវាកម្មដឹកជញ្ជូន' // Transportation service
]

// Calculate Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Calculate Khmer-specific penalty
function calculateKhmerPenalty(original: string, transcribed: string): number {
  let penalty = 0
  
  // Common Khmer diacritics that might be misread
  const khmerDiacritics = ['ើ', 'ំ', 'ាំ', 'ុំ', 'ិំ', 'ួ', 'ុះ']
  
  for (const diacritic of khmerDiacritics) {
    const originalCount = (original.match(new RegExp(diacritic, 'g')) || []).length
    const transcribedCount = (transcribed.match(new RegExp(diacritic, 'g')) || []).length
    penalty += Math.abs(originalCount - transcribedCount) * 0.1
  }
  
  return penalty
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, voice, operatorId }: EvaluationRequest = await req.json()

    if (!text || !voice) {
      throw new Error('Text and voice are required')
    }

    console.log(`Evaluating voice: ${voice} for text: ${text.substring(0, 50)}...`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate TTS audio
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
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
        speed: 0.9, // Slower for better pronunciation
      }),
    })

    if (!ttsResponse.ok) {
      throw new Error(`TTS generation failed: ${await ttsResponse.text()}`)
    }

    // Get audio as blob for transcription
    const audioBlob = await ttsResponse.blob()
    
    // Transcribe the audio back to text using Whisper
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('language', 'km') // Khmer language code

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    })

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription failed: ${await transcriptionResponse.text()}`)
    }

    const transcriptionResult = await transcriptionResponse.json()
    const transcribedText = transcriptionResult.text || ''

    console.log(`Original: ${text}`)
    console.log(`Transcribed: ${transcribedText}`)

    // Calculate scores
    const distance = levenshteinDistance(text, transcribedText)
    const maxLength = Math.max(text.length, transcribedText.length)
    const similarityScore = maxLength > 0 ? (maxLength - distance) / maxLength : 0
    
    const khmerPenalty = calculateKhmerPenalty(text, transcribedText)
    const finalScore = Math.max(0, similarityScore - khmerPenalty)

    // Store the results
    const { error: insertError } = await supabase
      .from('khmer_voice_scores')
      .insert({
        voice_name: voice,
        test_text: text,
        similarity_score: similarityScore,
        khmer_penalty: khmerPenalty,
        final_score: finalScore,
        transcribed_text: transcribedText,
        operator_id: operatorId || null
      })

    if (insertError) {
      console.error('Error storing voice score:', insertError)
    }

    console.log(`Voice ${voice} scored: ${finalScore.toFixed(3)}`)

    return new Response(
      JSON.stringify({
        voice,
        originalText: text,
        transcribedText,
        similarityScore,
        khmerPenalty,
        finalScore,
        evaluation: {
          excellent: finalScore >= 0.9,
          good: finalScore >= 0.7,
          fair: finalScore >= 0.5,
          poor: finalScore < 0.5
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Voice evaluation error:', error)
    return new Response(
      JSON.stringify({ error: `Voice evaluation failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})