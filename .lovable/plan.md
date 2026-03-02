

## Fix: "Failed to add departure" for Operator Admins

### Root Cause

The RLS (Row-Level Security) **WITH CHECK** policy on the `departures` table has a bug. The current policy for operator admin inserts is:

```sql
WITH CHECK: EXISTS (
  SELECT 1 FROM profiles p
  JOIN branches b ON b.operator_id = p.operator_id
  WHERE p.id = auth.uid()
    AND p.role = 'operator_admin'
    AND b.id = p.branch_id              -- BUG: fails when branch_id is NULL
    AND (p.branch_id IS NULL OR p.branch_id = p.branch_id)
)
```

When an operator admin has `branch_id = NULL` (meaning "All Branches" access), the condition `b.id = p.branch_id` always evaluates to NULL, causing every INSERT to be denied.

### Fix

Run a database migration to replace the WITH CHECK expression with correct logic that mirrors the USING expression:

```sql
-- Allow insert if the departure's branch belongs to the admin's operator,
-- AND either the admin has no branch restriction (NULL = all branches)
-- or the admin's branch matches the departure's branch
DROP POLICY IF EXISTS "Operator admins can manage own departures" ON departures;

CREATE POLICY "Operator admins can manage own departures"
ON departures
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN branches b ON b.operator_id = p.operator_id
    WHERE p.id = auth.uid()
      AND p.role = 'operator_admin'
      AND b.id = departures.branch_id
      AND (p.branch_id IS NULL OR p.branch_id = departures.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN branches b ON b.operator_id = p.operator_id
    WHERE p.id = auth.uid()
      AND p.role = 'operator_admin'
      AND b.id = departures.branch_id
      AND (p.branch_id IS NULL OR p.branch_id = departures.branch_id)
  )
);
```

This ensures:
- Admins with a specific branch can only add departures to their branch
- Admins with `branch_id = NULL` ("All Branches") can add departures to any branch belonging to their operator

### Files Changed
- **Database migration only** -- no frontend code changes needed

