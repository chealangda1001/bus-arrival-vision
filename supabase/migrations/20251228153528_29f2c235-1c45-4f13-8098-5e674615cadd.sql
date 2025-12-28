-- Drop the existing broken policy
DROP POLICY IF EXISTS "Operator admins can manage own departures" ON departures;

-- Recreate with CORRECT WITH CHECK clause
-- The key fix: b.id = branch_id (referencing the NEW row's branch_id column, not p.branch_id)
CREATE POLICY "Operator admins can manage own departures"
ON departures FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN branches b ON b.operator_id = p.operator_id
    WHERE p.id = auth.uid()
      AND p.role = 'operator_admin'::user_role
      AND b.id = departures.branch_id
      AND (p.branch_id IS NULL OR p.branch_id = departures.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN branches b ON b.operator_id = p.operator_id
    WHERE p.id = auth.uid()
      AND p.role = 'operator_admin'::user_role
      AND b.id = branch_id  -- This references the NEW row's branch_id
      AND (p.branch_id IS NULL OR p.branch_id = branch_id)  -- User's branch matches or is unrestricted
  )
);