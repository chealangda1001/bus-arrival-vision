-- Enable RLS on tables that have policies but RLS disabled
-- These are likely pre-existing configuration issues

-- Check and enable RLS on tables that may need it
ALTER TABLE public.static_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_translations ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.fleet_type_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_translations ENABLE ROW LEVEL SECURITY;