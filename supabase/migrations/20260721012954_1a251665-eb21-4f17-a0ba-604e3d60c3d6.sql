CREATE TABLE IF NOT EXISTS public.system_tts_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key boolean NOT NULL DEFAULT true UNIQUE,
  khmer_provider text NOT NULL DEFAULT 'gemini' CHECK (khmer_provider IN ('gemini', 'kiritts')),
  kiritts_khmer_voice text NOT NULL DEFAULT 'Kiri',
  kiritts_english_voice text NOT NULL DEFAULT 'Maly',
  kiritts_chinese_voice text NOT NULL DEFAULT 'Kiri',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_tts_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_tts_settings TO service_role;

ALTER TABLE public.system_tts_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_tts_settings'
      AND policyname = 'Authenticated users can view TTS settings'
  ) THEN
    CREATE POLICY "Authenticated users can view TTS settings"
    ON public.system_tts_settings
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_tts_settings'
      AND policyname = 'Super admins can manage TTS settings'
  ) THEN
    CREATE POLICY "Super admins can manage TTS settings"
    ON public.system_tts_settings
    FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'super_admin')
    WITH CHECK (public.get_current_user_role() = 'super_admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_system_tts_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_system_tts_settings_updated_at
    BEFORE UPDATE ON public.system_tts_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

INSERT INTO public.system_tts_settings (
  singleton_key,
  khmer_provider,
  kiritts_khmer_voice,
  kiritts_english_voice,
  kiritts_chinese_voice
)
VALUES (true, 'gemini', 'Kiri', 'Maly', 'Kiri')
ON CONFLICT (singleton_key) DO NOTHING;