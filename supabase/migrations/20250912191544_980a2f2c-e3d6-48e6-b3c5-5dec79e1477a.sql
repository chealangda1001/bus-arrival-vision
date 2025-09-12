-- Create security definer functions to avoid infinite recursion in RLS policies

-- Function to get current user's operator_id
CREATE OR REPLACE FUNCTION public.get_current_user_operator_id()
RETURNS uuid AS $$
  SELECT operator_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing policies on announcements_cache
DROP POLICY IF EXISTS "Operator admins can manage own cache" ON public.announcements_cache;
DROP POLICY IF EXISTS "Super admins can manage all cache" ON public.announcements_cache;

-- Create new policies using security definer functions
CREATE POLICY "Operator admins can manage own cache" ON public.announcements_cache
FOR ALL USING (
  public.get_current_user_operator_id() = announcements_cache.operator_id
);

CREATE POLICY "Super admins can manage all cache" ON public.announcements_cache
FOR ALL USING (
  public.get_current_user_role() = 'super_admin'
);