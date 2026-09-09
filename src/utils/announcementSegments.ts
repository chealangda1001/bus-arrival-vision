// Announcement segmentation: split a template into reusable audio fragments.
//
// Instead of sending the whole paragraph to the TTS provider every time a trip's
// time or plate changes, the template is broken into:
//   - static chunks  -> the fixed wording, identical for every trip
//   - variable chunks -> one tiny clip per distinct value ("3:30 រសៀល", "2AP 15-73")
// Each fragment is cached permanently under a key derived from its own text, so
// a fragment is only ever generated the first time that exact wording is spoken.
import { supabase } from "@/integrations/supabase/client";
import { audioCache } from "@/utils/audioCache";
import { logTtsEvent } from "@/utils/ttsLogger";

export type SegmentKind = 'static' | 'var';

export interface AnnouncementSegment {
  kind: SegmentKind;
  name?: string;
  text: string;
}

export interface SegmentVoiceContext {
  language: 'khmer' | 'english' | 'chinese';
  provider: string;
  voice: string;
  speed: number;
}

const PLACEHOLDER_RE = /\{([a-zA-Z_]+)\}/g;
const HAS_SPEECH_RE = /[\p{L}\p{N}]/u;

/** True when a chunk contains something worth speaking (not just punctuation). */
export const hasSpeech = (text: string): boolean => HAS_SPEECH_RE.test(text);

/**
 * Split a template such as "Bus to {destination} departs at {time}."
 * into ordered static / variable segments with the values substituted.
 */
export function splitTemplate(
  template: string,
  values: Record<string, string>
): AnnouncementSegment[] {
  const segments: AnnouncementSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');

  while ((match = re.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'static', text: template.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'var', name: match[1], text: values[match[1]] ?? '' });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    segments.push({ kind: 'static', text: template.slice(lastIndex) });
  }

  return segments
    .map((s) => ({ ...s, text: s.text.replace(/\s+/g, ' ').trim() }))
    .filter((s) => hasSpeech(s.text));
}

/** SHA-256 hex of a Unicode string. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Cache key for one fragment. Deliberately keyed on the fragment's own wording
 * (plus voice settings) and NOT on the trip, so every trip and every branch of
 * the operator reuses the same recording.
 */
export async function segmentCacheKey(
  text: string,
  ctx: SegmentVoiceContext
): Promise<string> {
  const hash = await sha256Hex(text);
  return `seg1_${ctx.language}_${ctx.provider}_${ctx.voice}_${ctx.speed}_${hash}`;
}

// Remember fragments that just failed so a retry storm cannot re-bill the provider.
const recentFailures = new Map<string, number>();
const FAILURE_COOLDOWN_MS = 60_000;

const isCoolingDown = (key: string) => {
  const at = recentFailures.get(key);
  if (!at) return false;
  if (Date.now() - at > FAILURE_COOLDOWN_MS) {
    recentFailures.delete(key);
    return false;
  }
  return true;
};

export interface ResolveOptions {
  operatorId: string;
  ctx: SegmentVoiceContext;
  logContext?: Record<string, any>;
  scriptHash?: string;
}

/** Are all fragments of this template already on the device? */
export async function areSegmentsCached(
  segments: AnnouncementSegment[],
  ctx: SegmentVoiceContext
): Promise<boolean> {
  if (segments.length === 0) return false;
  for (const seg of segments) {
    const key = await segmentCacheKey(seg.text, ctx);
    const cached = await audioCache.get(key);
    if (!cached) return false;
  }
  return true;
}

/** Remove every fragment of this template from the device cache. */
export async function clearSegments(
  segments: AnnouncementSegment[],
  ctx: SegmentVoiceContext
): Promise<void> {
  for (const seg of segments) {
    const key = await segmentCacheKey(seg.text, ctx);
    await audioCache.delete(key);
  }
}

async function generateSegment(
  text: string,
  cacheKey: string,
  opts: ResolveOptions
): Promise<string> {
  const { ctx, operatorId, logContext = {} } = opts;

  if (isCoolingDown(cacheKey)) {
    throw new Error('Voice service unavailable — not retrying yet.');
  }

  try {
    let data: any;
    let error: any;

    if (ctx.language === 'khmer' && ctx.provider === 'kiritts') {
      ({ data, error } = await supabase.functions.invoke('kiritts-tts', {
        body: {
          text,
          operatorId,
          voice: ctx.voice,
          speed: ctx.speed,
          language: 'khmer',
          cacheKey,
          scriptHash: opts.scriptHash,
          ...logContext,
        },
      }));
    } else if (ctx.language === 'khmer') {
      ({ data, error } = await supabase.functions.invoke('gemini-khmer-tts', {
        body: { text, operatorId, cacheKey, scriptHash: opts.scriptHash, ...logContext },
      }));
    } else {
      ({ data, error } = await supabase.functions.invoke('gemini-multispeaker-tts', {
        body: {
          script: `[Voice: ${ctx.voice}] ${text}`,
          operatorId,
          speechRate: ctx.speed,
          pitchAdjustment: 0,
          cacheKey,
          scriptHash: opts.scriptHash,
          language: ctx.language,
          voice: ctx.voice,
          ...logContext,
        },
      }));
    }

    if (error) throw error;
    const audioValue = data?.audioUrl || data?.audioContent;
    if (!audioValue) throw new Error('No audio returned');

    await audioCache.set(cacheKey, audioValue);
    return audioValue;
  } catch (err) {
    recentFailures.set(cacheKey, Date.now());
    throw err;
  }
}

/**
 * Return the ordered playable clips for a template.
 * Cached fragments cost nothing; only unseen wording hits the provider.
 */
export async function resolveSegmentsAudio(
  segments: AnnouncementSegment[],
  opts: ResolveOptions,
  forceRefresh = false
): Promise<string[]> {
  const clips: string[] = [];

  for (const seg of segments) {
    const key = await segmentCacheKey(seg.text, opts.ctx);

    if (!forceRefresh) {
      const cached = await audioCache.get(key);
      if (cached) {
        void logTtsEvent({
          ...(opts.logContext as any),
          language: opts.ctx.language,
          provider: opts.ctx.provider,
          voice: opts.ctx.voice,
          scriptText: seg.text,
          scriptHash: opts.scriptHash ?? null,
          cacheKey: key,
          cacheResult: 'client_hit',
        });
        clips.push(cached);
        continue;
      }
    } else {
      await audioCache.delete(key);
    }

    clips.push(await generateSegment(seg.text, key, opts));
  }

  return clips;
}
