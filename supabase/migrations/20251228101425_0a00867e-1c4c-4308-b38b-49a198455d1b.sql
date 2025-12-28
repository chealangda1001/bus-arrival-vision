-- Drop the existing public SELECT policy that allows everyone to see all departures
DROP POLICY IF EXISTS "Public can view departures" ON departures;

-- Create policy for anonymous users (for public departure boards)
CREATE POLICY "Anonymous users can view visible departures"
ON departures FOR SELECT
TO anon
USING (is_visible = true);

-- Create policy for authenticated users with proper branch restrictions
CREATE POLICY "Authenticated users can view allowed departures"
ON departures FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Super admins can see everything
      p.role = 'super_admin'::user_role
      OR (
        -- Operator admins: check operator and branch access
        EXISTS (
          SELECT 1 FROM branches b
          WHERE b.id = departures.branch_id
          AND b.operator_id = p.operator_id
          AND (
            -- Full operator access (no branch restriction)
            p.branch_id IS NULL
            OR 
            -- Specific branch access only
            p.branch_id = b.id
          )
        )
      )
    )
  )
);