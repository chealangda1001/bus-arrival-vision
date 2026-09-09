ALTER TABLE public.system_tts_settings
ADD COLUMN IF NOT EXISTS kiritts_khmer_speed numeric NOT NULL DEFAULT 0.9;