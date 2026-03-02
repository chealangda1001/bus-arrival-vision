

## Plan: Fix Infinite Recursion in Departures RLS Policies

### Problem
The `driver_departures` table has a policy "Operator admins can manage driver assignments" that JOINs `profiles -> branches -> departures`. When querying `departures`, Postgres checks `driver_departures` policies (via the "Drivers can view assigned departures" policy on departures), which in turn tries to query `departures` again -- infinite recursion.

### Solution

Create a new migration that:

1. Drops the problematic policy on `driver_departures`
2. Recreates it using security definer functions instead of joining to `departures`

The new policy will use `get_current_user_role()` and `get_current_user_operator_id()` to check if the caller is an operator_admin, and then verify the departure belongs to the operator's branches using a new security definer function.

### Migration SQL

```sql
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
```

### Files
- **New migration SQL file** -- contains the fix above
- No frontend code changes needed

### What this fixes
After applying the migration, querying `departures` will no longer trigger circular policy evaluation. Both super_admin and operator_admin users will be able to fetch departures without the 500 error.

