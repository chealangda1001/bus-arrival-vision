// Shared TTS usage logging for all TTS edge functions.
// Logging must never break audio delivery: every failure is swallowed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export interface TtsLogContext {
  operatorId?: string | null;
  branchId?: string | null;
  departureId?: string | null;
  destination?: string | null;
  plateNumber?: string | null;
  departureTime?: string | null;
  announcementType?: string | null;
  language?: string | null;
  provider: string;
  voice?: string | null;
  scriptText?: string | null;
  scriptHash?: string | null;
  cacheKey?: string | null;
  storagePath?: string | null;
  cacheResult: 'client_hit' | 'storage_hit' | 'generated' | 'error';
  durationMs?: number | null;
  errorMessage?: string | null;
}

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

async function resolveCaller(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return {};
    const supabase = admin();
    const { data } = await supabase.auth.getUser(token);
    const user = data?.user;
    if (!user) return {};
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, role, operator_id, branch_id')
      .eq('id', user.id)
      .maybeSingle();
    return {
      user_id: user.id,
      user_email: user.email || profile?.username || null,
      user_role: profile?.role || null,
      profile_operator_id: profile?.operator_id || null,
      profile_branch_id: profile?.branch_id || null,
    };
  } catch (_) {
    return {};
  }
}

export async function logTtsRequest(req: Request, ctx: TtsLogContext): Promise<void> {
  try {
    const caller: any = await resolveCaller(req);
    const row = {
      operator_id: ctx.operatorId || caller.profile_operator_id || null,
      branch_id: ctx.branchId || caller.profile_branch_id || null,
      user_id: caller.user_id || null,
      user_email: caller.user_email || null,
      user_role: caller.user_role || null,
      departure_id: ctx.departureId || null,
      destination: ctx.destination || null,
      plate_number: ctx.plateNumber || null,
      departure_time: ctx.departureTime || null,
      announcement_type: ctx.announcementType || null,
      language: ctx.language || 'khmer',
      provider: ctx.provider,
      voice: ctx.voice || null,
      script_text: ctx.scriptText || null,
      script_hash: ctx.scriptHash || null,
      cache_key: ctx.cacheKey || null,
      storage_path: ctx.storagePath || null,
      cache_result: ctx.cacheResult,
      char_count: ctx.scriptText ? ctx.scriptText.length : 0,
      duration_ms: ctx.durationMs ?? null,
      error_message: ctx.errorMessage || null,
    };
    const { error } = await admin().from('tts_request_logs').insert(row);
    if (error) console.error('tts log insert failed:', error.message);
  } catch (e) {
    console.error('tts log failed:', e);
  }
}

// ---- Reusable clip registry ----
// One row per stored audio clip, so admins can see what is saved and how often
// it is replayed instead of re-billed.
export interface ClipRecord {
  cacheKey: string;
  language: string;
  provider: string;
  voice?: string | null;
  speed?: number | null;
  text: string;
  segmentKind?: string | null;
  storagePath?: string | null;
  /** true = the clip was just generated, false = an existing file was served. */
  generated: boolean;
}

export async function recordClip(clip: ClipRecord): Promise<void> {
  try {
    const supabase = admin();
    const { data: existing } = await supabase
      .from('tts_clips')
      .select('id, reuse_count')
      .eq('cache_key', clip.cacheKey)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('tts_clips')
        .update({
          reuse_count: clip.generated ? existing.reuse_count : (existing.reuse_count || 0) + 1,
          last_used_at: new Date().toISOString(),
          storage_path: clip.storagePath || null,
        })
        .eq('id', existing.id);
      return;
    }

    await supabase.from('tts_clips').insert({
      cache_key: clip.cacheKey,
      language: clip.language,
      provider: clip.provider,
      voice: clip.voice || null,
      speed: clip.speed ?? 1.0,
      text: clip.text,
      segment_kind: clip.segmentKind || 'static',
      storage_path: clip.storagePath || null,
      char_count: clip.text.length,
      reuse_count: clip.generated ? 0 : 1,
      last_used_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('recordClip failed:', e);
  }
}

/** Language-scoped storage path so two languages never share one file. */
export function clipStoragePath(
  language: string,
  voice: string | null | undefined,
  hash: string,
  ext: 'mp3' | 'wav',
): string {
  const safeVoice = (voice || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `clips/${language}/${safeVoice}/${hash}.${ext}`;
}
