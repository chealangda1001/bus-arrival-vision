export interface SpeakerSegment {
  voice: 'Zephyr' | 'Kore';
  text: string;
  language: 'km' | 'en';
}

export interface VoiceConfig {
  gender: 'male' | 'female';
  language: 'km' | 'en';
  pitchAdjustment: number;
  speechRate: number;
  tone: string;
}

export const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  Zephyr: {
    gender: 'female',
    language: 'km',
    pitchAdjustment: 1,
    speechRate: 0.8, // Slower for Khmer
    tone: 'warm'
  },
  Kore: {
    gender: 'male',
    language: 'en',
    pitchAdjustment: 0,
    speechRate: 1.0,
    tone: 'firm'
  }
};

export const DEFAULT_STYLE_INSTRUCTIONS = `
Create a professional airport flight announcement using multiple speakers. 
Use a warm and friendly Khmer female voice (Zephyr) for the main announcement in Khmer, clear and polite, like a native announcer. 
Use a firm and neutral male voice (Kore) for the English translation, sounding official but welcoming. 
Maintain a steady pace with natural pauses, like real airport announcements, and avoid robotic intonation.
`;

/**
 * Parses a script with speaker tags into segments
 * Example: "[Voice: Zephyr] សូមអញ្ជើញអ្នកដំណើរ..."
 */
export function parseScript(script: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  const lines = script.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const voiceMatch = line.match(/\[Voice:\s*(\w+)\]\s*(.+)/);
    if (voiceMatch) {
      const [, voice, text] = voiceMatch;
      const voiceName = voice.trim() as 'Zephyr' | 'Kore';
      
      if (VOICE_CONFIGS[voiceName]) {
        segments.push({ 
          voice: voiceName, 
          text: text.trim(),
          language: VOICE_CONFIGS[voiceName].language as 'km' | 'en'
        });
      } else {
        // Default to Zephyr for unknown voices
        segments.push({ 
          voice: 'Zephyr', 
          text: text.trim(),
          language: 'km'
        });
      }
    } else if (line.trim()) {
      // Auto-detect language and assign appropriate voice
      const isKhmer = /[\u1780-\u17FF]/.test(line);
      segments.push({ 
        voice: isKhmer ? 'Zephyr' : 'Kore', 
        text: line.trim(),
        language: isKhmer ? 'km' : 'en'
      });
    }
  }
  
  return segments;
}

/**
 * Formats a script for announcement generation
 */
export function formatAnnouncementScript(
  khmerText: string, 
  englishText: string
): string {
  return `[Voice: Zephyr] ${khmerText}
[Voice: Kore] ${englishText}`;
}

/**
 * Generates cache key for multi-speaker TTS
 */
export function generateMultiSpeakerCacheKey(
  script: string,
  speechRate: number = 1.0,
  pitchAdjustment: number = 0,
  temperature: number = 0.7,
  styleInstructions?: string
): string {
  const keyData = {
    script,
    speechRate,
    pitchAdjustment,
    temperature,
    styleInstructions: styleInstructions || DEFAULT_STYLE_INSTRUCTIONS,
    version: 'gemini-v1'
  };
  
  return btoa(JSON.stringify(keyData)).replace(/[+/=]/g, '');
}

/**
 * Validates if a script has proper speaker tags
 */
export function validateScript(script: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const segments = parseScript(script);
  
  if (segments.length === 0) {
    errors.push('No valid speech segments found in script');
  }
  
  const hasKhmer = segments.some(s => s.language === 'km');
  const hasEnglish = segments.some(s => s.language === 'en');
  
  if (!hasKhmer && !hasEnglish) {
    errors.push('Script should contain at least Khmer or English text');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}