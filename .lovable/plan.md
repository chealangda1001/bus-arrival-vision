

## Plan: Fix Infinite Recursion in Profiles RLS Policies

### Problem
Login succeeds but the profile cannot be fetched due to **infinite recursion** in RLS policies on the `profiles` table. The error: `"infinite recursion detected in policy for relation "profiles""`

The root cause is the policy "Operator admins can view driver profiles" (added in the driver migration) which queries `profiles` to check the caller's role while the database is already evaluating a `profiles` SELECT -- creating a circular dependency.

### Solution

Create a new migration that:

1. **Drops the problematic policy**: `"Operator admins can view driver profiles"` on `profiles`
2. **Recreates it using the existing `get_current_user_role()` security definer function**, which bypasses RLS and avoids recursion

The fixed policy will use `get_current_user_role() = 'operator_admin'` instead of querying `profiles` directly.

Also fix the other policies from the same migration that reference `profiles.role` directly (on `driver_departures`, `departures`, `announcement_types`) to use the security definer function for consistency and safety.

### Migration SQL (single file)

```sql
-- Fix recursive profile policy
DROP POLICY IF EXISTS "Operator admins can view driver profiles" ON public.profiles;

CREATE POLICY "Operator admins can view driver profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_current_user_role() = 'operator_admin'
  AND operator_id = (SELECT operator_id FROM public.profiles WHERE id = auth.uid())
);
```

Wait -- that still references profiles. The correct approach: create a second security definer function to get the current user's operator_id safely.

```sql
-- Create helper to get current user's operator_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_operator_id()
RETURNS uuid AS $$
  SELECT operator_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

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
```

### Files to modify
- **New migration SQL file** -- contains the fix above
- No frontend code changes needed; the redirect logic in `AuthPage.tsx` already works correctly once the profile can be fetched

### What this fixes
After applying the migration, the `fetchProfile()` call in `useSupabaseAuth` will succeed, the profile will load, and the `AuthPage` useEffect will redirect the user to the correct dashboard based on their role.

