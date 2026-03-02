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