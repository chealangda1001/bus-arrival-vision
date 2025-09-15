-- Add visibility column to departures table for show/hide functionality
ALTER TABLE public.departures 
ADD COLUMN is_visible BOOLEAN DEFAULT true;