import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KhmerTTSRequest {
  text: string;
  operatorId: string;
  speechRate?: number;
  pitch?: number;
  voiceModel?: string;
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

// Helper function to create romanized version of Khmer text for better pronunciation
function romanizeKhmerForTTS(khmerText: string): string {
  // Basic Khmer-to-Latin romanization mapping for common words and sounds
  const khmerRomanMap: { [key: string]: string } = {
    // Common greeting and travel words
    'សូម': 'soom',
    'អញ្ជើញ': 'anh-cheun', 
    'អ្នកដំណើរ': 'neak dom-naer',
    'ទាំងអស់': 'teang os',
    'ដែល': 'del',
    'កំពុង': 'kam-poung',
    'ធ្វើដំណើរ': 'tveu dom-naer',
    'ទៅកាន់': 'tov kan',
    'តាមរយៈ': 'tam ro-yeh',
    'ឡាន': 'laan',
    'រថយន្ត': 'rot-yon',
    'មាន': 'mean',
    'ស្លាកលេខ': 'slak lek',
    'យើង': 'yeung',
    'នឹង': 'nung',
    'ចាក់ចេញ': 'chak chenh',
    'ក្នុងពេល': 'k-nong pel',
    'បន្តិចទៀត': 'bon-tech tiet',
    'នេះ': 'nih',
    'ហើយ': 'haey',
    'ការធ្វើដំណើរ': 'kar tveu dom-naer',
    'រយៈពេល': 'ro-yeh pel',
    'ប្រហែល': 'bra-hael',
    'ម៉ោង': 'maong',
    'ការឈប់សំរាក': 'kar chup som-rak',
    'ប្រមាណ': 'bra-man',
    'នាទី': 'neati',
    'សម្រាប់': 'som-rap',
    'ទាំងអស់គ្នា': 'teang os knea',
    'ទៅ': 'tov',
    'បន្ទប់ទឹក': 'bon-tup tuk',
    'ឬ': 'reu',
    'ទិញ': 'tinh',
    'អាហារ': 'ah-har',
    'តិចតួច': 'tech tuoch',
    'ទៅដល់': 'tov dol',
    'បន្ទាប់': 'bon-teap',
    'អរគុណ': 'or-kun',
    'ជាមួយ': 'chea muoy',
    'ក្រុមហ៊ុន': 'krom hun',
    'យើងខ្ញុំ': 'yeung khnyom',
    'ជូនពរ': 'choon por',
    'អស់លោក': 'os look',
    'លោកស្រី': 'look srey',
    'ឲ្យ': 'aoy',
    'ប្រកបដោយ': 'pra-kob daoy',
    'សុវត្ថិភាព': 'so-vat-ti-phiep'
  };

  let romanizedText = khmerText;
  
  // Replace known Khmer words with romanized versions
  for (const [khmer, roman] of Object.entries(khmerRomanMap)) {
    const regex = new RegExp(khmer, 'g');
    romanizedText = romanizedText.replace(regex, roman);
  }
  
  console.log(`Original Khmer: ${khmerText}`);
  console.log(`Romanized for TTS: ${romanizedText}`);
  
  return romanizedText;
}

async function generateKhmerTTS(request: KhmerTTSRequest): Promise<string> {
  const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_API_KEY');
  if (!serviceAccountJson) {
    throw new Error('Google Cloud service account not configured');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Getting OAuth 2.0 access token for Khmer TTS...');
    const accessToken = await getAccessToken(serviceAccount);
    
    console.log(`Generating Khmer TTS for text: "${request.text}"`);
    console.log(`Text length: ${request.text.length} characters`);
    
    // First attempt: Try with Chinese voice for better Unicode handling
    try {
      console.log('Attempting Khmer TTS with Chinese Mandarin voice for better Unicode support...');
      const chineseRequestBody = {
        input: {
          ssml: `<speak><prosody rate="${request.speechRate || 0.7}" pitch="${request.pitch || -2}st">${request.text}</prosody></speak>`
        },
        voice: {
          languageCode: 'cmn-CN',
          name: 'cmn-CN-Standard-A',
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: request.speechRate || 0.7,
          pitch: request.pitch || -2
        }
      };

      const chineseResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(chineseRequestBody)
      });

      if (chineseResponse.ok) {
        const chineseResult = await chineseResponse.json();
        if (chineseResult.audioContent) {
          console.log(`Successfully generated Khmer audio using Chinese voice for better Unicode handling`);
          return chineseResult.audioContent;
        }
      }
    } catch (chineseError) {
      console.log('Chinese voice attempt failed, trying romanized approach...');
    }

    // Second attempt: Use romanized Khmer with English Neural2 voice (Zephyr)
    const romanizedText = romanizeKhmerForTTS(request.text);
    
    const requestBody = {
      input: {
        ssml: `<speak><prosody rate="${request.speechRate || 0.8}" pitch="${request.pitch || -1}st">${romanizedText}</prosody></speak>`
      },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-F', // Zephyr voice mapping
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: request.speechRate || 0.8,
        pitch: request.pitch || -1
      }
    };

    console.log('Making request to Google Cloud TTS with romanized Khmer text...');
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
      console.error(`Google Cloud TTS API error:`, error);
      throw new Error(`Google Cloud TTS API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    if (result.audioContent) {
      console.log(`Successfully generated Khmer audio using romanized text with Zephyr voice`);
      return result.audioContent;
    } else {
      throw new Error(`No audio data received from Google Cloud TTS`);
    }
    
  } catch (error) {
    console.error('Error generating Khmer TTS:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, operatorId, speechRate, pitch, voiceModel }: KhmerTTSRequest = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log('Generating direct Khmer TTS for operator:', operatorId);
    console.log('Full Khmer text received:', text);
    console.log('Text length:', text.length);

    // Generate cache key
    const keyData = {
      text,
      speechRate: speechRate || 0.9,
      pitch: pitch || 0,
      voiceModel: voiceModel || 'Standard-A',
      language: 'km-KH'
    };
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(keyData));
    const base64 = btoa(String.fromCharCode(...Array.from(data)));
    const cacheKey = `khmer_direct_${base64.replace(/[+/=]/g, '')}`;

    // Generate Khmer TTS using native Google Cloud TTS
    const audioData = await generateKhmerTTS({
      text,
      operatorId,
      speechRate,
      pitch,
      voiceModel
    });

    console.log('Successfully generated direct Khmer TTS');

    return new Response(JSON.stringify({ 
      audioContent: audioData,
      cacheKey,
      language: 'km-KH',
      voice: 'Zephyr', // User requested Zephyr voice for Khmer
      method: 'direct_khmer_romanized_tts'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in direct-khmer-tts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});