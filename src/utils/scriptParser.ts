export interface SpeakerSegment {
  voice: 'Zephyr' | 'Kore' | 'Luna';
  text: string;
  language: 'km' | 'en' | 'zh';
}

export interface VoiceConfig {
  gender: 'male' | 'female';
  language: 'km' | 'en' | 'zh';
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
  },
  Luna: {
    gender: 'female',
    language: 'zh',
    pitchAdjustment: 0,
    speechRate: 0.9,
    tone: 'gentle'
  }
};

export const DEFAULT_STYLE_INSTRUCTIONS = `
Create a professional airport flight announcement using multiple speakers. 
Use a warm and friendly Khmer female voice (Zephyr) for the main announcement in Khmer, clear and polite, like a native announcer. 
Use a firm and neutral male voice (Kore) for the English translation, sounding official but welcoming.
Use a gentle and clear Chinese female voice (Luna) for the Chinese translation, sounding professional and courteous.
Maintain a steady pace with natural pauses, like real airport announcements, and avoid robotic intonation.
`;

/**
 * Parses a script with speaker tags into segments
 * Example: "[Voice: Zephyr] សូមអញ្ជើញអ្នកដំណើរ..."
 */
export function parseScript(script: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  const lines = script.split('\n').filter(line => line.trim());
  
  console.log('parseScript input:', script);
  console.log('parseScript lines:', lines);
  
  for (const line of lines) {
    const voiceMatch = line.match(/\[Voice:\s*(\w+)\]\s*(.+)/);
    if (voiceMatch) {
      const [, voice, text] = voiceMatch;
      const voiceName = voice.trim() as 'Zephyr' | 'Kore' | 'Luna';
      
      console.log(`Found voice match - Voice: ${voiceName}, Text: "${text.trim()}"`);
      
      if (VOICE_CONFIGS[voiceName]) {
        segments.push({ 
          voice: voiceName, 
          text: text.trim(),
          language: VOICE_CONFIGS[voiceName].language as 'km' | 'en' | 'zh'
        });
      } else {
        // Default to Zephyr for unknown voices
        console.log(`Unknown voice ${voiceName}, defaulting to Zephyr`);
        segments.push({ 
          voice: 'Zephyr', 
          text: text.trim(),
          language: 'km'
        });
      }
    } else if (line.trim()) {
      // Auto-detect language and assign appropriate voice
      const isKhmer = /[\u1780-\u17FF]/.test(line);
      const isChinese = /[\u4e00-\u9fff]/.test(line);
      
      console.log(`Auto-detecting language for line: "${line.trim()}" - Khmer: ${isKhmer}, Chinese: ${isChinese}`);
      
      if (isKhmer) {
        segments.push({ voice: 'Zephyr', text: line.trim(), language: 'km' });
      } else if (isChinese) {
        segments.push({ voice: 'Luna', text: line.trim(), language: 'zh' });
      } else {
        segments.push({ voice: 'Kore', text: line.trim(), language: 'en' });
      }
    }
  }
  
  console.log('parseScript output segments:', segments);
  return segments;
}

/**
 * Formats a script for announcement generation
 */
export function formatAnnouncementScript(
  khmerText: string, 
  englishText: string,
  chineseText?: string
): string {
  console.log('formatAnnouncementScript inputs:');
  console.log('- Khmer:', khmerText);
  console.log('- English:', englishText);
  console.log('- Chinese:', chineseText || 'N/A');
  
  let script = `[Voice: Zephyr] ${khmerText}
[Voice: Kore] ${englishText}`;
  
  if (chineseText) {
    script += `\n[Voice: Luna] ${chineseText}`;
  }
  
  console.log('formatAnnouncementScript output:', script);
  return script;
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
  
  // Use TextEncoder to handle Unicode characters properly
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(keyData));
  
  // Convert to base64 using Array.from to handle Unicode safely
  const base64 = btoa(String.fromCharCode(...Array.from(data)));
  
  return base64.replace(/[+/=]/g, '');
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
  const hasChinese = segments.some(s => s.language === 'zh');
  
  if (!hasKhmer && !hasEnglish && !hasChinese) {
    errors.push('Script should contain at least Khmer, English, or Chinese text');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}