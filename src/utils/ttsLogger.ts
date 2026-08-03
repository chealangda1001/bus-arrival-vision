import { supabase } from "@/integrations/supabase/client";

export interface TtsClientLogContext {
  operatorId?: string | null;
  branchId?: string | null;
  departureId?: string | null;
  destination?: string | null;
  plateNumber?: string | null;
  departureTime?: string | null;
  announcementType?: string | null;
  language: string;
  provider: string;
  voice?: string | null;
  scriptText?: string | null;
  scriptHash?: string | null;
  cacheKey?: string | null;
  cacheResult: 'client_hit' | 'error';
  errorMessage?: string | null;
}

/**
 * Logs a client-side TTS event (cache hit or failure) into tts_request_logs.
 * Server-side generations / storage hits are logged by the edge functions.
 * Never throws — logging must not break playback.
 */
export const logTtsEvent = async (ctx: TtsClientLogContext): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    let userRole: string | null = null;
    let branchId = ctx.branchId ?? null;
    let operatorId = ctx.operatorId ?? null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, operator_id, branch_id')
        .eq('id', user.id)
        .maybeSingle();
      userRole = (profile as any)?.role ?? null;
      operatorId = operatorId || (profile as any)?.operator_id || null;
      branchId = branchId || (profile as any)?.branch_id || null;
    }

    await (supabase as any).from('tts_request_logs').insert({
      operator_id: operatorId,
      branch_id: branchId,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      user_role: userRole,
      departure_id: ctx.departureId ?? null,
      destination: ctx.destination ?? null,
      plate_number: ctx.plateNumber ?? null,
      departure_time: ctx.departureTime ?? null,
      announcement_type: ctx.announcementType ?? null,
      language: ctx.language,
      provider: ctx.provider,
      voice: ctx.voice ?? null,
      script_text: ctx.scriptText ?? null,
      script_hash: ctx.scriptHash ?? null,
      cache_key: ctx.cacheKey ?? null,
      cache_result: ctx.cacheResult,
      char_count: ctx.scriptText ? ctx.scriptText.length : 0,
      error_message: ctx.errorMessage ?? null,
    });
  } catch (error) {
    console.warn('TTS log (client) failed:', error);
  }
};
