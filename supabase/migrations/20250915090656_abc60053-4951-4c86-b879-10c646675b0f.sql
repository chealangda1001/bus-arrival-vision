-- Add trip_duration and break_duration columns to departures table
ALTER TABLE public.departures 
ADD COLUMN trip_duration TEXT,
ADD COLUMN break_duration TEXT;