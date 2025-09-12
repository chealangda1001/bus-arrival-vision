-- Create khmer_voice_scores table to store voice quality metrics
CREATE TABLE public.khmer_voice_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_name TEXT NOT NULL,
  test_text TEXT NOT NULL,
  original_score DECIMAL(5,3) NOT NULL DEFAULT 0,
  similarity_score DECIMAL(5,3) NOT NULL DEFAULT 0,
  khmer_penalty DECIMAL(5,3) NOT NULL DEFAULT 0,
  final_score DECIMAL(5,3) NOT NULL DEFAULT 0,
  transcribed_text TEXT,
  test_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  operator_id UUID REFERENCES operators(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice_preferences table for manual overrides and settings
CREATE TABLE public.voice_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID REFERENCES operators(id),
  preferred_voice TEXT NOT NULL DEFAULT 'cedar',
  auto_selected_voice TEXT,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  voice_candidates JSONB NOT NULL DEFAULT '["cedar","marin","shimmer","alloy","onyx","nova","echo","fable"]'::jsonb,
  tts_settings JSONB NOT NULL DEFAULT '{"rate": 1.0, "pitch": 1.0}'::jsonb,
  last_optimization_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(operator_id)
);

-- Enable RLS on both tables
ALTER TABLE public.khmer_voice_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for khmer_voice_scores
CREATE POLICY "Super admins can manage all voice scores" 
ON public.khmer_voice_scores 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'super_admin'::user_role
));

CREATE POLICY "Operator admins can manage own voice scores" 
ON public.khmer_voice_scores 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.operator_id = khmer_voice_scores.operator_id
));

-- RLS policies for voice_preferences
CREATE POLICY "Super admins can manage all voice preferences" 
ON public.voice_preferences 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'super_admin'::user_role
));

CREATE POLICY "Operator admins can manage own voice preferences" 
ON public.voice_preferences 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.operator_id = voice_preferences.operator_id
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_khmer_voice_scores_updated_at
  BEFORE UPDATE ON public.khmer_voice_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_preferences_updated_at
  BEFORE UPDATE ON public.voice_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();