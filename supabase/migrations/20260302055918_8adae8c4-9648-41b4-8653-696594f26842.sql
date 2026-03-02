-- Create a helper function to check if a departure belongs to an operator
CREATE OR REPLACE FUNCTION public.departure_belongs_to_operator(p_departure_id uuid, p_operator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM departures d
    JOIN branches b ON b.id = d.branch_id
    WHERE d.id = p_departure_id AND b.operator_id = p_operator_id
  );
$$;

-- Fix the recursive policy on driver_departures
DROP POLICY IF EXISTS "Operator admins can manage driver assignments" ON public.driver_departures;

CREATE POLICY "Operator admins can manage driver assignments"
ON public.driver_departures
FOR ALL
TO authenticated
USING (
  public.get_current_user_role() = 'operator_admin'
  AND public.departure_belongs_to_operator(departure_id, public.get_current_user_operator_id())
)
WITH CHECK (
  public.get_current_user_role() = 'operator_admin'
  AND public.departure_belongs_to_operator(departure_id, public.get_current_user_operator_id())
);