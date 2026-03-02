
-- The get_current_user_operator_id() function already exists, so just recreate for safety
CREATE OR REPLACE FUNCTION public.get_current_user_operator_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT operator_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Fix the recursive policy on profiles
DROP POLICY IF EXISTS "Operator admins can view driver profiles" ON public.profiles;

CREATE POLICY "Operator admins can view driver profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_current_user_role() = 'operator_admin'
  AND profiles.operator_id = public.get_current_user_operator_id()
);
