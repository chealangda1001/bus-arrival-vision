-- Create operator_settings table for announcement configuration
CREATE TABLE public.operator_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  announcement_repeat_count INTEGER NOT NULL DEFAULT 3 CHECK (announcement_repeat_count >= 1 AND announcement_repeat_count <= 10),
  announcement_scripts JSONB NOT NULL DEFAULT '{
    "english": "Attention passengers, {fleet_type} service to {destination} will depart at {time}. Bus plate number {plate}. Please proceed to the boarding area.",
    "khmer": "សូមអ្នកដំណើរ សេវាកម្ម {fleet_type} ទៅ {destination} នឹងចេញនៅម៉ោង {time}។ លេខផ្ទាំងឡាន {plate}។ សូមទៅកាន់តំបន់ឡើងឡាន។",
    "chinese": "乘客请注意，{fleet_type}开往{destination}的班车将于{time}发车。车牌号{plate}。请前往候车区域。"
  }',
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_announcement_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(operator_id)
);

-- Create announcements_cache table for storing generated audio files
CREATE TABLE public.announcements_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  audio_data TEXT NOT NULL, -- base64 encoded audio
  language TEXT NOT NULL CHECK (language IN ('english', 'khmer', 'chinese')),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable Row Level Security
ALTER TABLE public.operator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for operator_settings
CREATE POLICY "Operator admins can manage own settings" 
ON public.operator_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.operator_id = operator_settings.operator_id
));

CREATE POLICY "Super admins can manage all settings" 
ON public.operator_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'super_admin'::user_role
));

-- Create policies for announcements_cache
CREATE POLICY "Operator admins can manage own cache" 
ON public.announcements_cache 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.operator_id = announcements_cache.operator_id
));

CREATE POLICY "Super admins can manage all cache" 
ON public.announcements_cache 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'super_admin'::user_role
));

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_operator_settings_updated_at
  BEFORE UPDATE ON public.operator_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for cache performance
CREATE INDEX idx_announcements_cache_key ON public.announcements_cache(cache_key);
CREATE INDEX idx_announcements_cache_expires ON public.announcements_cache(expires_at);
CREATE INDEX idx_operator_settings_operator_id ON public.operator_settings(operator_id);