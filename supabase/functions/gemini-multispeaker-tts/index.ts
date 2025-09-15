import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  script: string;
  operatorId: string;
  speechRate?: number;
  pitchAdjustment?: number;
  temperature?: number;
  styleInstructions?: string;
}

interface SpeakerSegment {
  voice: string;
  text: string;
}

const DEFAULT_STYLE_INSTRUCTIONS = `
Create a professional airport flight announcement using multiple speakers. 
Use a warm and friendly Khmer female voice (Zephyr) for the main announcement in Khmer, clear and polite, like a native announcer. 
Use a firm and neutral male voice (Kore) for the English translation, sounding official but welcoming. 
Maintain a steady pace with natural pauses, like real airport announcements, and avoid robotic intonation.
`;

const VOICE_CONFIG = {
  'Zephyr': {
    gender: 'female',
    language: 'km',
    pitchAdjustment: 1,
    speechRate: 0.8, // Slower for Khmer
    tone: 'warm'
  },
  'Kore': {
    gender: 'male', 
    language: 'en',
    pitchAdjustment: 0,
    speechRate: 1.0,
    tone: 'firm'
  }
};

function parseScript(script: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  const lines = script.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const voiceMatch = line.match(/\[Voice:\s*(\w+)\]\s*(.+)/);
    if (voiceMatch) {
      const [, voice, text] = voiceMatch;
      segments.push({ voice: voice.trim(), text: text.trim() });
    } else if (line.trim()) {
      // Default to Zephyr if no voice tag
      segments.push({ voice: 'Zephyr', text: line.trim() });
    }
  }
  
  return segments;
}

async function generateMultiSpeakerAudio(
  segments: SpeakerSegment[], 
  config: TTSRequest
): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');
  if (!apiKey) {
    throw new Error('Google AI Studio API key not configured');
  }

  try {
    // Create the multi-speaker request for Gemini API
    const requestBody = {
      contents: [{
        parts: [{
          text: `Generate multi-speaker audio with the following configuration:
          
${config.styleInstructions || DEFAULT_STYLE_INSTRUCTIONS}

Speakers and segments:
${segments.map((seg, i) => `
${i + 1}. Speaker: ${seg.voice} (${VOICE_CONFIG[seg.voice as keyof typeof VOICE_CONFIG]?.gender || 'unknown'}, ${VOICE_CONFIG[seg.voice as keyof typeof VOICE_CONFIG]?.tone || 'neutral'} tone)
   Text: "${seg.text}"
   Rate: ${(VOICE_CONFIG[seg.voice as keyof typeof VOICE_CONFIG]?.speechRate || 1.0) * (config.speechRate || 1.0)}
   Pitch: ${(VOICE_CONFIG[seg.voice as keyof typeof VOICE_CONFIG]?.pitchAdjustment || 0) + (config.pitchAdjustment || 0)}
`).join('\n')}

Please generate a single cohesive audio file with all speakers in sequence.`
        }]
      }],
      generationConfig: {
        temperature: config.temperature || 0.7,
        audioConfig: {
          format: 'mp3',
          sampleRate: 24000,
          multiSpeaker: true
        }
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    // Extract audio data from Gemini response
    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      const audioData = result.candidates[0].content.parts[0].inlineData?.data;
      if (audioData) {
        return audioData;
      }
    }
    
    throw new Error('No audio data received from Gemini API');
    
  } catch (error) {
    console.error('Error generating multi-speaker audio:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, operatorId, speechRate, pitchAdjustment, temperature, styleInstructions }: TTSRequest = await req.json();

    if (!script) {
      throw new Error('Script is required');
    }

    console.log('Generating multi-speaker TTS for operator:', operatorId);
    console.log('Script:', script);

    // Parse the script into speaker segments
    const segments = parseScript(script);
    console.log('Parsed segments:', segments);

    if (segments.length === 0) {
      throw new Error('No valid speech segments found in script');
    }

    // Generate cache key (Unicode-safe)
    const keyData = {
      script,
      speechRate: speechRate || 1.0,
      pitchAdjustment: pitchAdjustment || 0,
      temperature: temperature || 0.7,
      styleInstructions: styleInstructions || DEFAULT_STYLE_INSTRUCTIONS
    };
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(keyData));
    const base64 = btoa(String.fromCharCode(...Array.from(data)));
    const cacheKey = base64.replace(/[+/=]/g, '');

    // Generate multi-speaker audio
    const audioData = await generateMultiSpeakerAudio(segments, {
      script,
      operatorId,
      speechRate,
      pitchAdjustment,
      temperature,
      styleInstructions
    });

    console.log('Successfully generated multi-speaker audio');

    return new Response(JSON.stringify({ 
      audioContent: audioData,
      cacheKey,
      segments: segments.length,
      voices: [...new Set(segments.map(s => s.voice))]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-multispeaker-tts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});