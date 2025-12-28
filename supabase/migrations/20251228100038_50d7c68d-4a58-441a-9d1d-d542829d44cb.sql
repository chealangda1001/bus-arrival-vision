-- Add branch_id column to profiles table for branch-level admin access
ALTER TABLE public.profiles ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);

-- Create a security definer function to check branch access
CREATE OR REPLACE FUNCTION public.get_current_user_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop existing departures policies that need updating
DROP POLICY IF EXISTS "Operator admins can manage own departures" ON public.departures;

-- Create updated departures policy with branch-level access
CREATE POLICY "Operator admins can manage own departures" 
ON public.departures 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM branches b
    JOIN profiles p ON p.operator_id = b.operator_id
    WHERE b.id = departures.branch_id 
    AND p.id = auth.uid()
    AND (
      -- Full operator access (branch_id is NULL means access to all branches)
      p.branch_id IS NULL 
      -- OR specific branch access
      OR p.branch_id = b.id
    )
  )
);

-- Drop existing branches policies that need updating
DROP POLICY IF EXISTS "Operator admins can manage own branches" ON public.branches;

-- Create updated branches policy with branch-level access
CREATE POLICY "Operator admins can manage own branches" 
ON public.branches 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.operator_id = branches.operator_id
    AND (
      -- Full operator access
      p.branch_id IS NULL 
      -- OR specific branch access
      OR p.branch_id = branches.id
    )
  )
);