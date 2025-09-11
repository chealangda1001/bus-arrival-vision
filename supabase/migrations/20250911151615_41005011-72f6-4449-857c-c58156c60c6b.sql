-- Create departures table
CREATE TABLE public.departures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_number TEXT NOT NULL,
  destination TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('on-time', 'delayed', 'boarding', 'departed')),
  gate TEXT NOT NULL,
  estimated_time TEXT,
  passenger_count INTEGER DEFAULT 0,
  fleet_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (for departure board display)
CREATE POLICY "Allow public read access to departures" 
ON public.departures 
FOR SELECT 
USING (true);

-- Create policy to allow all operations (for admin panel)
CREATE POLICY "Allow all operations on departures" 
ON public.departures 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_departures_updated_at
BEFORE UPDATE ON public.departures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for fleet images
INSERT INTO storage.buckets (id, name, public) VALUES ('fleet-images', 'fleet-images', true);

-- Create storage policies for fleet images
CREATE POLICY "Fleet images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'fleet-images');

CREATE POLICY "Allow fleet image uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'fleet-images');

CREATE POLICY "Allow fleet image updates" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'fleet-images');

CREATE POLICY "Allow fleet image deletions" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'fleet-images');

-- Enable realtime for departures table
ALTER TABLE public.departures REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.departures;