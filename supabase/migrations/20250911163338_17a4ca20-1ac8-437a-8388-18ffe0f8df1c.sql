-- Fix RLS policies for multi-operator data isolation

-- Drop existing overly permissive policies on departures
DROP POLICY IF EXISTS "Allow all operations on departures" ON public.departures;
DROP POLICY IF EXISTS "Allow public read access to departures" ON public.departures;

-- Drop existing overly permissive policies on branches  
DROP POLICY IF EXISTS "Allow all operations on branches" ON public.branches;
DROP POLICY IF EXISTS "Allow public read access to branches" ON public.branches;

-- Create proper RLS policies for departures
-- Public can read departures for any branch (for public boards)
CREATE POLICY "Public can view departures" 
ON public.departures 
FOR SELECT 
USING (true);

-- Operator admins can only manage departures for their operator's branches
CREATE POLICY "Operator admins can manage own departures" 
ON public.departures 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    JOIN public.operators o ON b.operator_id = o.id
    JOIN public.operator_admins oa ON oa.operator_id = o.id
    WHERE b.id = departures.branch_id
    AND oa.username = current_setting('app.current_user', true)
  )
);

-- Super admins can manage all departures
CREATE POLICY "Super admins can manage all departures" 
ON public.departures 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.operator_admins oa
    WHERE oa.username = current_setting('app.current_user', true)
    AND oa.role = 'super_admin'
  )
);

-- Create proper RLS policies for branches
-- Public can read all branches (for public boards)
CREATE POLICY "Public can view branches" 
ON public.branches 
FOR SELECT 
USING (true);

-- Operator admins can only manage their operator's branches
CREATE POLICY "Operator admins can manage own branches" 
ON public.branches 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.operator_admins oa
    WHERE oa.operator_id = branches.operator_id
    AND oa.username = current_setting('app.current_user', true)
  )
);

-- Super admins can manage all branches
CREATE POLICY "Super admins can manage all branches" 
ON public.branches 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.operator_admins oa
    WHERE oa.username = current_setting('app.current_user', true)
    AND oa.role = 'super_admin'
  )
);