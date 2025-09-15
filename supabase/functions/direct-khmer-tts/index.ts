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
    
    // Use Google Cloud TTS native Khmer support
    const requestBody = {
      input: {
        text: request.text
      },
      voice: {
        languageCode: 'km-KH', // Native Khmer language code
        name: 'km-KH-Standard-A', // Female Khmer voice
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: request.speechRate || 0.9, // Slightly slower for clarity
        pitch: request.pitch || 0
      }
    };

    console.log('Making request to Google Cloud TTS with native Khmer voice...');
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
      console.log(`Successfully generated Khmer audio using native Google Cloud TTS`);
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
      voice: 'km-KH-Standard-A',
      method: 'direct_google_cloud_tts'
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