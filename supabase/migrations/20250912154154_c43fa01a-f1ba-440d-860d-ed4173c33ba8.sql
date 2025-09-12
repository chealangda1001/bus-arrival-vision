-- Drop the complex super admin policy and replace with a simple one
DROP POLICY IF EXISTS "Super admins can manage all departures" ON departures;

-- Simplified RLS policies for departures
-- Super admins are now handled via Edge Function with service role, so we don't need RLS for them
-- Keep the existing policies for regular operator admins and public access