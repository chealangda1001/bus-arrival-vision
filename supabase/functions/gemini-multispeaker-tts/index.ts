import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceSettings {
  voice: 'male' | 'female';
  speed: number;
  pitch: number;
}

interface TTSRequest {
  script: string;
  operatorId: string;
  speechRate?: number;
  pitchAdjustment?: number;
  temperature?: number;
  styleInstructions?: string;
  voiceSettings?: {
    khmer: VoiceSettings;
    english: VoiceSettings;
    chinese: VoiceSettings;
  };
}

interface SpeakerSegment {
  voice: string;
  text: string;
}

const DEFAULT_STYLE_INSTRUCTIONS = `
Create a professional airport flight announcement using multiple speakers. 
Use a warm and friendly Khmer female voice (Zephyr) for the main announcement in Khmer, clear and polite, like a native announcer. 
Use a firm and neutral male voice (Kore) for the English translation, sounding official but welcoming.
Use a gentle and clear Chinese female voice (Luna) for the Chinese translation, sounding professional and courteous.
Maintain a steady pace with natural pauses, like real airport announcements, and avoid robotic intonation.
`;

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

// Helper function to detect language from text
function detectLanguage(text: string): string {
  // Simple language detection based on character sets
  const khmerRegex = /[\u1780-\u17FF]/;
  const chineseRegex = /[\u4E00-\u9FFF]/;
  
  if (khmerRegex.test(text)) return 'km';
  if (chineseRegex.test(text)) return 'zh';
  return 'en'; // Default to English
}

// Helper function to get language-specific speed setting
function getLanguageSpeed(language: string, voiceSettings?: any): number | undefined {
  if (!voiceSettings) return undefined;
  
  switch (language) {
    case 'km': return voiceSettings.khmer?.speed;
    case 'en': return voiceSettings.english?.speed;
    case 'zh': return voiceSettings.chinese?.speed;
    default: return undefined;
  }
}

// Helper function to concatenate base64 audio files
function concatenateBase64Audio(audioFiles: string[]): string {
  // For MP3 files, we can simply concatenate the base64 data
  // This works because MP3 files can be concatenated at the byte level
  const combinedAudio = audioFiles.join('');
  return combinedAudio;
}

async function generateMultiSpeakerAudio(
  segments: SpeakerSegment[], 
  config: TTSRequest
): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const audioFiles: string[] = [];

    // Map voices to OpenAI TTS voices for better multi-language support
    const voiceMapping = {
      'Zephyr': 'alloy',  // Female voice for Khmer
      'Kore': 'echo',     // Male voice for English  
      'Luna': 'nova'      // Female voice for Chinese
    };

    // Generate separate audio for each segment using OpenAI TTS
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const language = detectLanguage(segment.text);
      const openaiVoice = voiceMapping[segment.voice as keyof typeof voiceMapping] || 'alloy';
      
      console.log(`Generating audio for segment ${i + 1}/${segments.length} (${language}) using ${segment.voice} -> ${openaiVoice}: ${segment.text.substring(0, 50)}...`);

      // Get language-specific settings
      const speechRate = getLanguageSpeed(language, config.voiceSettings) || config.speechRate || 1.0;

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: segment.text,
          voice: openaiVoice,
          response_format: 'mp3',
          speed: Math.max(0.25, Math.min(4.0, speechRate)),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`OpenAI TTS API error for segment ${i + 1}:`, error);
        throw new Error(`OpenAI TTS API error for segment ${i + 1}: ${response.status} - ${error}`);
      }

      // Convert to base64 using chunked approach to avoid stack overflow
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Process in chunks to avoid "Maximum call stack size exceeded"
      let base64Audio = '';
      const chunkSize = 8192;
      for (let j = 0; j < uint8Array.length; j += chunkSize) {
        const chunk = uint8Array.slice(j, j + chunkSize);
        base64Audio += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
      }

      audioFiles.push(base64Audio);
      console.log(`Successfully generated audio for segment ${i + 1}`);
    }

    console.log(`Successfully generated ${audioFiles.length} audio segments, concatenating...`);
    
    // Concatenate all audio files
    const combinedAudio = concatenateBase64Audio(audioFiles);
    
    console.log('Successfully concatenated all audio segments');
    return combinedAudio;
    
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

    // Generate multi-speaker audio using OpenAI TTS
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