-- Enable real-time updates for departures table
ALTER TABLE public.departures REPLICA IDENTITY FULL;

-- Add departures table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.departures;