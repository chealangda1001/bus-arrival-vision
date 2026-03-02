
-- Create announcement_types table
CREATE TABLE public.announcement_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  type_key text NOT NULL,
  type_name text NOT NULL,
  description text,
  announcement_scripts jsonb NOT NULL DEFAULT '{"english": "", "khmer": "", "chinese": ""}'::jsonb,
  voice_settings jsonb DEFAULT '{"khmer": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Zephyr"}, "chinese": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Luna"}, "english": {"pitch": 0.0, "speed": 1.0, "voice": "male", "voice_model": "Kore"}}'::jsonb,
  repeat_count integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operator_id, type_key)
);

-- Enable RLS
ALTER TABLE public.announcement_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Operator admins can manage own announcement types"
  ON public.announcement_types FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.operator_id = announcement_types.operator_id
  ));

CREATE POLICY "Super admins can manage all announcement types"
  ON public.announcement_types FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'::user_role
  ));

-- Public read for announcement playback on public boards
CREATE POLICY "Public can view active announcement types"
  ON public.announcement_types FOR SELECT
  USING (is_active = true);

-- Updated_at trigger
CREATE TRIGGER update_announcement_types_updated_at
  BEFORE UPDATE ON public.announcement_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default announcement types from existing operator_settings
INSERT INTO public.announcement_types (operator_id, type_key, type_name, description, announcement_scripts, voice_settings, repeat_count, is_default)
SELECT
  os.operator_id,
  'departure',
  'Departure Announcement',
  'Standard departure announcement played when boarding begins',
  os.announcement_scripts,
  COALESCE(os.voice_settings, '{"khmer": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Zephyr"}, "chinese": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Luna"}, "english": {"pitch": 0.0, "speed": 1.0, "voice": "male", "voice_model": "Kore"}}'::jsonb),
  os.announcement_repeat_count,
  true
FROM public.operator_settings os;

-- Seed break_stop type for all existing operators
INSERT INTO public.announcement_types (operator_id, type_key, type_name, description, announcement_scripts, voice_settings, repeat_count, is_default)
SELECT
  os.operator_id,
  'break_stop',
  'Break/Rest Stop',
  'Announcement for short breaks during transit',
  '{"english": "Attention passengers. We are now taking a short break of approximately {break_duration} minutes. Please feel free to use the restroom or grab a snack. The bus will depart again shortly. Please return to the bus on time. Thank you for your cooperation.", "khmer": "សូមអ្នកដំណើរទាំងអស់ យើងកំពុងឈប់សម្រាកបន្តិច ប្រមាណ {break_duration} នាទី សូមអញ្ជើញទៅបន្ទប់ទឹក ឬទិញអាហារតិចតួច រថយន្តនឹងចេញដំណើរវិញក្នុងពេលបន្តិចទៀត សូមត្រលប់មកវិញឱ្យទាន់ពេល សូមអរគុណ", "chinese": "各位旅客请注意，我们现在短暂休息约 {break_duration} 分钟。请大家可以使用洗手间或购买小吃。巴士将很快再次出发，请按时返回车上。谢谢大家的配合。"}'::jsonb,
  COALESCE(os.voice_settings, '{"khmer": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Zephyr"}, "chinese": {"pitch": 0.0, "speed": 0.9, "voice": "female", "voice_model": "Luna"}, "english": {"pitch": 0.0, "speed": 1.0, "voice": "male", "voice_model": "Kore"}}'::jsonb),
  os.announcement_repeat_count,
  true
FROM public.operator_settings os;
