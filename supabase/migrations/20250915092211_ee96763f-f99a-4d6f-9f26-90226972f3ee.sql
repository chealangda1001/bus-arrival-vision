-- Add operator_name field to operator_settings table
ALTER TABLE public.operator_settings 
ADD COLUMN operator_name TEXT DEFAULT 'BookMeBus';