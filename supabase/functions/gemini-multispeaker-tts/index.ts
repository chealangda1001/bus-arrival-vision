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
  },
  'Luna': {
    gender: 'female',
    language: 'zh',
    pitchAdjustment: 0,
    speechRate: 0.9,
    tone: 'gentle'
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

// Helper function to generate JWT for Google OAuth 2.0
async function createJWT(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour
  
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now
  };
  
  const encoder = new TextEncoder();
  
  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  
  // Import the private key
  const privateKeyPem = serviceAccount.private_key;
  const privateKeyDer = pemToDer(privateKeyPem);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${unsignedToken}.${encodedSignature}`;
}

// Helper function to convert PEM to DER format
function pemToDer(pem: string): ArrayBuffer {
  const pemContent = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryString = atob(pemContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper function to get OAuth 2.0 access token
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  return result.access_token;
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

// Helper function to get language-specific pitch setting
function getLanguagePitch(language: string, voiceSettings?: any): number | undefined {
  if (!voiceSettings) return undefined;
  
  switch (language) {
    case 'km': return voiceSettings.khmer?.pitch;
    case 'en': return voiceSettings.english?.pitch;
    case 'zh': return voiceSettings.chinese?.pitch;
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
  const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_API_KEY');
  if (!serviceAccountJson) {
    throw new Error('Google Cloud service account not configured');
  }

  try {
    // Parse the service account JSON
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Get OAuth 2.0 access token
    console.log('Getting OAuth 2.0 access token...');
    const accessToken = await getAccessToken(serviceAccount);
    
    // Map languages and voices to Google Cloud TTS voices with proper language codes
    const voiceMapping = {
      'km': { 
        languageCode: 'km-KH',  // Use proper Khmer language code
        name: config.voiceSettings?.khmer?.voice === 'male' ? 'km-KH-Standard-B' : 'km-KH-Standard-A'
      },
      'en': { 
        languageCode: 'en-US', 
        name: config.voiceSettings?.english?.voice === 'female' ? 'en-US-Standard-F' : 'en-US-Standard-D'
      },
      'zh': { 
        languageCode: 'cmn-CN', 
        name: config.voiceSettings?.chinese?.voice === 'male' ? 'cmn-CN-Standard-B' : 'cmn-CN-Standard-A'
      }
    };

    const audioFiles: string[] = [];

    // Generate separate audio for each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const language = detectLanguage(segment.text);
      const voice = voiceMapping[language as keyof typeof voiceMapping] || voiceMapping['en'];
      
      console.log(`Generating audio for segment ${i + 1}/${segments.length} (${language}): ${segment.text.substring(0, 50)}...`);

      // Build request for Google Cloud Text-to-Speech API
      const requestBody = {
        input: {
          text: segment.text
        },
        voice: {
          languageCode: voice.languageCode,
          name: voice.name,
          ssmlGender: voice.name.includes('F') ? 'FEMALE' : 'MALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: getLanguageSpeed(language, config.voiceSettings) || config.speechRate || 1.0,
          pitch: getLanguagePitch(language, config.voiceSettings) || config.pitchAdjustment || 0
        }
      };

      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Google Cloud TTS API error for segment ${i + 1}:`, error);
        throw new Error(`Google Cloud TTS API error for segment ${i + 1}: ${response.status} - ${error}`);
      }

      const result = await response.json();
      
      if (result.audioContent) {
        audioFiles.push(result.audioContent);
        console.log(`Successfully generated audio for segment ${i + 1}`);
      } else {
        throw new Error(`No audio data received for segment ${i + 1}`);
      }
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

    // Generate multi-speaker audio using Google Cloud TTS
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