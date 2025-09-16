import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface KhmerTTSRequest {
  text: string;
  operatorId: string;
  cacheKey?: string;
}

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options: Partial<WavConversionOptions> = {
    numChannels: 1,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions): Uint8Array {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF header
  const encoder = new TextEncoder();
  const riffBytes = encoder.encode('RIFF');
  const waveBytes = encoder.encode('WAVE');
  const fmtBytes = encoder.encode('fmt ');
  const dataBytes = encoder.encode('data');

  const uint8Array = new Uint8Array(buffer);
  uint8Array.set(riffBytes, 0);                    // ChunkID
  view.setUint32(4, 36 + dataLength, true);       // ChunkSize
  uint8Array.set(waveBytes, 8);                   // Format
  uint8Array.set(fmtBytes, 12);                   // Subchunk1ID
  view.setUint32(16, 16, true);                   // Subchunk1Size (PCM)
  view.setUint16(20, 1, true);                    // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);          // NumChannels
  view.setUint32(24, sampleRate, true);           // SampleRate
  view.setUint32(28, byteRate, true);             // ByteRate
  view.setUint16(32, blockAlign, true);           // BlockAlign
  view.setUint16(34, bitsPerSample, true);        // BitsPerSample
  uint8Array.set(dataBytes, 36);                 // Subchunk2ID
  view.setUint32(40, dataLength, true);          // Subchunk2Size

  return uint8Array;
}

function convertToWav(rawData: string, mimeType: string): Uint8Array {
  const options = parseMimeType(mimeType);
  const wavHeader = createWavHeader(rawData.length, options);
  
  // Decode base64 to binary
  const binaryString = atob(rawData);
  const audioBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    audioBuffer[i] = binaryString.charCodeAt(i);
  }

  // Combine header and data
  const result = new Uint8Array(wavHeader.length + audioBuffer.length);
  result.set(wavHeader, 0);
  result.set(audioBuffer, wavHeader.length);
  
  return result;
}

async function generateKhmerTTSWithGemini(request: KhmerTTSRequest): Promise<string> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not found');
  }

  console.log(`Generating Gemini Khmer TTS for operator: ${request.operatorId}`);
  console.log(`Khmer text: ${request.text}`);
  console.log(`Text length: ${request.text.length}`);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-tts:generateContentStream?key=${geminiApiKey}`;
  
  const requestBody = {
    generationConfig: {
      temperature: 1,
      responseModalities: ['audio'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Zephyr'
          }
        }
      }
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: request.text
          }
        ]
      }
    ]
  };

  console.log('Making request to Gemini TTS API...');
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error: ${response.status} - ${errorText}`);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  console.log('Processing Gemini streaming response...');
  
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body received from Gemini API');
  }

  const audioChunks: Uint8Array[] = [];
  let totalAudioData = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Convert chunk to text and parse JSON lines
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const inlineData = data.candidates[0].content.parts[0].inlineData;
            const audioData = inlineData.data;
            const mimeType = inlineData.mimeType;
            
            console.log(`Received audio chunk with mime type: ${mimeType}`);
            
            if (audioData) {
              if (mimeType && mimeType.includes('audio/L16')) {
                // Convert L16 to WAV
                const wavData = convertToWav(audioData, mimeType);
                totalAudioData += btoa(String.fromCharCode(...wavData));
              } else {
                // Direct audio data (MP3, etc.)
                totalAudioData += audioData;
              }
            }
          }
        } catch (parseError) {
          console.log('Skipping non-JSON line:', line);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!totalAudioData) {
    throw new Error('No audio content received from Gemini TTS');
  }

  console.log(`Successfully generated Khmer TTS audio using Gemini 2.5 Pro with Zephyr voice`);
  console.log(`Total audio data length: ${totalAudioData.length}`);
  
  return totalAudioData;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: KhmerTTSRequest = await req.json();
    
    if (!request.text) {
      throw new Error('Text parameter is required');
    }

    if (!request.operatorId) {
      throw new Error('Operator ID is required');
    }

    // Generate cache key
    const cacheKey = request.cacheKey || `gemini_khmer_${btoa(request.text)}_${request.operatorId}`;
    
    // Generate TTS audio
    const audioContent = await generateKhmerTTSWithGemini(request);
    
    const response = {
      audioContent,
      cacheKey,
      method: 'gemini_khmer_tts',
      success: true,
      language: 'khmer',
      voice: 'Zephyr',
      textLength: request.text.length,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-khmer-tts function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      method: 'gemini_khmer_tts'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});