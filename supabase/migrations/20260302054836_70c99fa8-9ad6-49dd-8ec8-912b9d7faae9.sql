
-- Create driver_departures junction table (no enum references needed here)
CREATE TABLE public.driver_departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, departure_id)
);

ALTER TABLE public.driver_departures ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own assignments
CREATE POLICY "Drivers can view own assignments"
ON public.driver_departures
FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- Operator admins can manage assignments for their operator's departures  
CREATE POLICY "Operator admins can manage driver assignments"
ON public.driver_departures
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN branches b ON b.operator_id = p.operator_id
    JOIN departures d ON d.branch_id = b.id
    WHERE p.id = auth.uid()
      AND p.role = 'operator_admin'
      AND d.id = driver_departures.departure_id
  )
);

-- Super admins can manage all
CREATE POLICY "Super admins can manage all driver assignments"
ON public.driver_departures
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- Allow drivers to view departures assigned to them
CREATE POLICY "Drivers can view assigned departures"
ON public.departures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM driver_departures dd
    WHERE dd.driver_id = auth.uid()
      AND dd.departure_id = departures.id
  )
);

-- Allow drivers to view active driver-playable announcement types for their operator
CREATE POLICY "Drivers can view driver-playable announcement types"
ON public.announcement_types
FOR SELECT
TO authenticated
USING (
  driver_playable = true AND is_active = true AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.operator_id = announcement_types.operator_id
  )
);

-- Allow operator admins to view driver profiles within their operator
CREATE POLICY "Operator admins can view driver profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'operator_admin'
      AND p.operator_id = profiles.operator_id
  )
);
