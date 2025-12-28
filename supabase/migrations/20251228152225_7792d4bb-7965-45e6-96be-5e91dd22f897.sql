-- Drop the existing policy with incorrect WITH CHECK clause
DROP POLICY IF EXISTS "Operator admins can manage own departures" ON departures;

-- Recreate with CORRECT WITH CHECK clause
-- The key fix: p.branch_id = branch_id (referencing the NEW row's branch_id, not b.id)
CREATE POLICY "Operator admins can manage own departures"
ON departures FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM branches b
    JOIN profiles p ON p.operator_id = b.operator_id
    WHERE b.id = departures.branch_id 
      AND p.id = auth.uid()
      AND (p.branch_id IS NULL OR p.branch_id = departures.branch_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM branches b
    JOIN profiles p ON p.operator_id = b.operator_id
    WHERE b.id = branch_id
      AND p.id = auth.uid()
      AND p.role = 'operator_admin'::user_role
      AND (p.branch_id IS NULL OR p.branch_id = branch_id)
  )
);