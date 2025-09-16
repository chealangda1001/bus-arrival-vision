-- Add leaving_from field to departures table
ALTER TABLE public.departures 
ADD COLUMN leaving_from text;