-- Update the set_user_context function to handle both username and role
CREATE OR REPLACE FUNCTION public.set_user_context(username text, user_role text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.current_user', username, false);
  PERFORM set_config('app.current_user_role', COALESCE(user_role, ''), false);
END;
$$;

-- Drop and recreate the super admin RLS policy for departures with simplified logic
DROP POLICY IF EXISTS "Super admins can manage all departures" ON departures;
CREATE POLICY "Super admins can manage all departures" ON departures
FOR ALL USING (
  current_setting('app.current_user_role', true) = 'super_admin'
);