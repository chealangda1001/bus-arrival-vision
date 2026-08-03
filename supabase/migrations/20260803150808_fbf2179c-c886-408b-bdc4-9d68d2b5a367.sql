CREATE TABLE public.tts_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  operator_id uuid,
  branch_id uuid,
  user_id uuid,
  user_email text,
  user_role text,
  departure_id uuid,
  destination text,
  plate_number text,
  departure_time text,
  announcement_type text,
  language text NOT NULL DEFAULT 'khmer',
  provider text NOT NULL DEFAULT 'unknown',
  voice text,
  script_text text,
  script_hash text,
  cache_key text,
  storage_path text,
  cache_result text NOT NULL DEFAULT 'generated',
  char_count integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text
);

CREATE INDEX idx_tts_logs_created_at ON public.tts_request_logs (created_at DESC);
CREATE INDEX idx_tts_logs_operator ON public.tts_request_logs (operator_id, created_at DESC);
CREATE INDEX idx_tts_logs_script_hash ON public.tts_request_logs (script_hash);

GRANT SELECT ON public.tts_request_logs TO authenticated;
GRANT ALL ON public.tts_request_logs TO service_role;

ALTER TABLE public.tts_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read all tts logs"
ON public.tts_request_logs FOR SELECT TO authenticated
USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Operator admins can read their operator tts logs"
ON public.tts_request_logs FOR SELECT TO authenticated
USING (operator_id IS NOT NULL AND operator_id = public.get_current_user_operator_id());