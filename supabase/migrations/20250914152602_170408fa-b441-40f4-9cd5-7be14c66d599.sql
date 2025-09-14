-- Add MP3 audio file columns for custom announcements
ALTER TABLE public.departures 
ADD COLUMN english_audio_url TEXT,
ADD COLUMN khmer_audio_url TEXT,
ADD COLUMN chinese_audio_url TEXT;

-- Create storage bucket for announcement audio files if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcement-audio', 'announcement-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for announcement audio
CREATE POLICY "Operators can view announcement audio" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'announcement-audio');

CREATE POLICY "Operators can upload announcement audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'announcement-audio');

CREATE POLICY "Operators can update announcement audio" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'announcement-audio');

CREATE POLICY "Operators can delete announcement audio" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'announcement-audio');