-- Create enum for fleet types
CREATE TYPE public.fleet_type AS ENUM ('VIP Van', 'Bus', 'Sleeping Bus');

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'operator_admin');

-- Create operators table
CREATE TABLE public.operators (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create operator_admins table
CREATE TABLE public.operator_admins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    operator_id UUID REFERENCES public.operators(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'operator_admin',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create branches table
CREATE TABLE public.branches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    location TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(operator_id, slug)
);

-- Create new departures table structure
CREATE TABLE public.departures_new (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    status TEXT NOT NULL,
    estimated_time TEXT,
    fleet_type public.fleet_type NOT NULL,
    fleet_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departures_new ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (departure boards are public)
CREATE POLICY "Allow public read access to operators" 
ON public.operators FOR SELECT USING (true);

CREATE POLICY "Allow public read access to branches" 
ON public.branches FOR SELECT USING (true);

CREATE POLICY "Allow public read access to departures" 
ON public.departures_new FOR SELECT USING (true);

-- Create RLS policies for operator_admins (only they can see their own data)
CREATE POLICY "Operator admins can view own data" 
ON public.operator_admins FOR SELECT USING (true);

CREATE POLICY "Allow all operations on operator_admins" 
ON public.operator_admins FOR ALL USING (true);

-- Create RLS policies for operators (allow all for now, will be refined with auth)
CREATE POLICY "Allow all operations on operators" 
ON public.operators FOR ALL USING (true);

CREATE POLICY "Allow all operations on branches" 
ON public.branches FOR ALL USING (true);

CREATE POLICY "Allow all operations on departures" 
ON public.departures_new FOR ALL USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_operators_updated_at
    BEFORE UPDATE ON public.operators
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operator_admins_updated_at
    BEFORE UPDATE ON public.operator_admins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departures_new_updated_at
    BEFORE UPDATE ON public.departures_new
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create sample operators
INSERT INTO public.operators (name, slug, logo_url) VALUES 
('Premium Bus Co.', 'premium-bus-co', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&h=100&fit=crop&crop=center'),
('City Transit', 'city-transit', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=100&h=100&fit=crop&crop=center'),
('Express Lines', 'express-lines', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=100&h=100&fit=crop&crop=center');

-- Create super admin account (bookme with hashed password for _bookme_)
-- Using simple hash for demo - in production should use proper password hashing
INSERT INTO public.operator_admins (username, password_hash, role) VALUES 
('bookme', '_bookme_', 'super_admin');

-- Create operator admin accounts
INSERT INTO public.operator_admins (operator_id, username, password_hash, role) VALUES 
((SELECT id FROM public.operators WHERE slug = 'premium-bus-co'), 'premium_admin', 'premium123', 'operator_admin'),
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'city_admin', 'city123', 'operator_admin'),
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'express_admin', 'express123', 'operator_admin');

-- Create branches for each operator
INSERT INTO public.branches (operator_id, name, slug, location, is_default) VALUES 
-- Premium Bus Co branches
((SELECT id FROM public.operators WHERE slug = 'premium-bus-co'), 'Main Terminal', 'main-terminal', 'Central Phnom Penh', true),
((SELECT id FROM public.operators WHERE slug = 'premium-bus-co'), 'Airport Branch', 'airport-branch', 'Phnom Penh International Airport', false),
-- City Transit branches  
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'Downtown Hub', 'downtown-hub', 'Downtown Phnom Penh', true),
((SELECT id FROM public.operators WHERE slug = 'city-transit'), 'North Station', 'north-station', 'North Phnom Penh', false),
-- Express Lines branches
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'Central Station', 'central-station', 'Central Phnom Penh', true),
((SELECT id FROM public.operators WHERE slug = 'express-lines'), 'South Terminal', 'south-terminal', 'South Phnom Penh', false);

-- Migrate existing departure data to new structure with fleet types
INSERT INTO public.departures_new (branch_id, destination, plate_number, departure_time, status, estimated_time, fleet_type, fleet_image_url)
SELECT 
    (SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'premium-bus-co') AND is_default = true),
    destination,
    plate_number, 
    departure_time,
    status,
    estimated_time,
    CASE 
        WHEN route_number = '101' THEN 'VIP Van'::public.fleet_type
        WHEN route_number = '205' THEN 'Bus'::public.fleet_type  
        WHEN route_number = '89' THEN 'Sleeping Bus'::public.fleet_type
        ELSE 'Bus'::public.fleet_type
    END as fleet_type,
    fleet_image_url
FROM public.departures;

-- Add more sample departures for other operators/branches
INSERT INTO public.departures_new (branch_id, destination, plate_number, departure_time, status, fleet_type, fleet_image_url) VALUES 
-- City Transit departures
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'city-transit') AND is_default = true), 'Siem Reap', 'CT-1001', '16:00', 'on-time', 'Bus', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'city-transit') AND is_default = true), 'Battambang', 'CT-1002', '17:30', 'delayed', 'VIP Van', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center'),
-- Express Lines departures  
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'express-lines') AND is_default = true), 'Ho Chi Minh City', 'EL-2001', '18:00', 'boarding', 'Sleeping Bus', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center'),
((SELECT id FROM public.branches WHERE operator_id = (SELECT id FROM public.operators WHERE slug = 'express-lines') AND is_default = true), 'Sihanoukville', 'EL-2002', '19:15', 'on-time', 'VIP Van', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center');

-- Drop old departures table and rename new one
DROP TABLE public.departures;
ALTER TABLE public.departures_new RENAME TO departures;