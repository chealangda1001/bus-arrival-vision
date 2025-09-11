-- Fix search path security warning
CREATE OR REPLACE FUNCTION public.set_user_context(username text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user', username, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;