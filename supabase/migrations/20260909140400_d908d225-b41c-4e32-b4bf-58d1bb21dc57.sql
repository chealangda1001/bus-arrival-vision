CREATE TABLE public.tts_clips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text NOT NULL UNIQUE,
  language text NOT NULL,
  provider text NOT NULL,
  voice text,
  speed numeric NOT NULL DEFAULT 1.0,
  text text NOT NULL,
  segment_kind text NOT NULL DEFAULT 'static',
  storage_path text,
  char_count integer NOT NULL DEFAULT 0,
  reuse_count integer NOT NULL DEFAULT 0,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tts_clips TO authenticated;
GRANT ALL ON public.tts_clips TO service_role;

ALTER TABLE public.tts_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view voice clips"
ON public.tts_clips FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_tts_clips_language ON public.tts_clips (language);
CREATE INDEX idx_tts_clips_reuse ON public.tts_clips (reuse_count DESC);

CREATE TRIGGER update_tts_clips_updated_at
BEFORE UPDATE ON public.tts_clips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();