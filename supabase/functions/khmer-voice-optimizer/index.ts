import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptimizationRequest {
  operatorId?: string
  forceReoptimize?: boolean
}

// Standard Khmer test phrases covering different linguistic patterns
const KHMER_TEST_PHRASES = [
  'សូមអ្នកដំណើរ សេវាកម្ម VIP Van ទៅ Kep នឹងចេញនៅម៉ោង ០៧:៤៥។',
  'ការធ្វើដំណើររបស់យើងនឹងចាប់ផ្តើមក្នុងពេលបន្តិចទៀត។',
  'សូមទៅកាន់តំបន់ឡើងឡានដើម្បីធ្វើដំណើរ។',
  'រថយន្តមានលេខផ្ទាំង PP-1234 ត្រៀមចេញហើយ។',
  'សូមអធ្យាស្រ័យក្នុងការយឺតយ៉ាវ និងអរគុណចំពោះការអត់ធ្មត់របស់លោកអ្នក។'
]

const DEFAULT_VOICES = ['cedar', 'marin', 'shimmer', 'alloy', 'onyx', 'nova', 'echo', 'fable']

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { operatorId, forceReoptimize = false }: OptimizationRequest = await req.json()

    console.log(`Starting voice optimization for operator: ${operatorId || 'global'}`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get or create voice preferences
    let { data: preferences } = await supabase
      .from('voice_preferences')
      .select('*')
      .eq('operator_id', operatorId || '')
      .single()

    if (!preferences) {
      const { data: newPreferences, error } = await supabase
        .from('voice_preferences')
        .insert({
          operator_id: operatorId || null,
          preferred_voice: 'cedar',
          voice_candidates: DEFAULT_VOICES
        })
        .select()
        .single()

      if (error) throw error
      preferences = newPreferences
    }

    // Check if we need to reoptimize
    const lastOptimization = preferences.last_optimization_date
    const daysSinceOptimization = lastOptimization 
      ? (Date.now() - new Date(lastOptimization).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    if (!forceReoptimize && daysSinceOptimization < 7) {
      console.log(`Skipping optimization - last run ${daysSinceOptimization.toFixed(1)} days ago`)
      return new Response(
        JSON.stringify({
          message: 'Voice optimization not needed',
          currentBestVoice: preferences.auto_selected_voice || preferences.preferred_voice,
          lastOptimized: lastOptimization,
          daysSinceOptimization
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const voiceCandidates = preferences.voice_candidates as string[]
    console.log(`Testing ${voiceCandidates.length} voices with ${KHMER_TEST_PHRASES.length} test phrases`)

    // Evaluate each voice with all test phrases
    const voiceScores: { [voice: string]: number[] } = {}
    
    for (const voice of voiceCandidates) {
      console.log(`Testing voice: ${voice}`)
      voiceScores[voice] = []

      for (const testPhrase of KHMER_TEST_PHRASES) {
        try {
          // Call the evaluator function
          const evalResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/khmer-voice-evaluator`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                text: testPhrase,
                voice: voice,
                operatorId: operatorId
              })
            }
          )

          if (evalResponse.ok) {
            const evaluation = await evalResponse.json()
            voiceScores[voice].push(evaluation.finalScore)
            console.log(`${voice}: ${evaluation.finalScore.toFixed(3)} for phrase ${testPhrase.substring(0, 20)}...`)
          } else {
            console.error(`Evaluation failed for ${voice}: ${await evalResponse.text()}`)
            voiceScores[voice].push(0) // Penalty for failed evaluation
          }
        } catch (error) {
          console.error(`Error evaluating ${voice}:`, error)
          voiceScores[voice].push(0)
        }
      }
    }

    // Calculate average score for each voice
    const voiceAverages: { [voice: string]: number } = {}
    for (const voice of voiceCandidates) {
      const scores = voiceScores[voice]
      voiceAverages[voice] = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0
    }

    // Find the best voice
    const bestVoice = Object.entries(voiceAverages)
      .sort(([,a], [,b]) => b - a)[0]

    console.log('Voice ranking:', Object.entries(voiceAverages)
      .sort(([,a], [,b]) => b - a)
      .map(([voice, score]) => `${voice}: ${score.toFixed(3)}`))

    // Update preferences with the best voice
    await supabase
      .from('voice_preferences')
      .update({
        auto_selected_voice: bestVoice[0],
        last_optimization_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', preferences.id)

    console.log(`Optimization complete. Best voice: ${bestVoice[0]} (score: ${bestVoice[1].toFixed(3)})`)

    return new Response(
      JSON.stringify({
        message: 'Voice optimization completed',
        bestVoice: bestVoice[0],
        bestScore: bestVoice[1],
        allScores: voiceAverages,
        testedVoices: voiceCandidates.length,
        testPhrases: KHMER_TEST_PHRASES.length,
        totalTests: voiceCandidates.length * KHMER_TEST_PHRASES.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Voice optimization error:', error)
    return new Response(
      JSON.stringify({ error: `Voice optimization failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})