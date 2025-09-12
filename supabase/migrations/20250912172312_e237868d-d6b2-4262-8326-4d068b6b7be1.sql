-- Create fleets table
CREATE TABLE public.fleets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  name TEXT NOT NULL,
  plate_number TEXT NOT NULL UNIQUE,
  fleet_type fleet_type NOT NULL,
  fleet_image_url TEXT,
  capacity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;

-- Create policies for fleets
CREATE POLICY "Public can view active fleets" 
ON public.fleets 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage all fleets" 
ON public.fleets 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'super_admin'::user_role
));

CREATE POLICY "Operator admins can manage own fleets" 
ON public.fleets 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.operator_id = fleets.operator_id
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_fleets_updated_at
BEFORE UPDATE ON public.fleets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add fleet_id to departures table (optional foreign key)
ALTER TABLE public.departures 
ADD COLUMN fleet_id UUID REFERENCES public.fleets(id);

-- Create index for better performance
CREATE INDEX idx_fleets_operator_id ON public.fleets(operator_id);
CREATE INDEX idx_fleets_active ON public.fleets(is_active);
CREATE INDEX idx_departures_fleet_id ON public.departures(fleet_id);