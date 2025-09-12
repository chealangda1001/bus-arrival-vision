-- Create profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'operator_admin',
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Super admins can manage all profiles
CREATE POLICY "Super admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Update RLS policies for operators to use auth.uid()
DROP POLICY IF EXISTS "Operator admins can manage own branches" ON branches;
DROP POLICY IF EXISTS "Super admins can manage all branches" ON branches;

CREATE POLICY "Operator admins can manage own branches" 
ON public.branches 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.operator_id = branches.operator_id
  )
);

CREATE POLICY "Super admins can manage all branches" 
ON public.branches 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- Update RLS policies for departures to use auth.uid()
DROP POLICY IF EXISTS "Operator admins can manage own departures" ON departures;

CREATE POLICY "Operator admins can manage own departures" 
ON public.departures 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    JOIN public.profiles p ON (p.operator_id = b.operator_id)
    WHERE b.id = departures.branch_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all departures" 
ON public.departures 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- Create trigger for updating profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- For now, new users are created as operator_admin by default
  -- This can be updated later by super admins
  INSERT INTO public.profiles (id, username, role)
  VALUES (new.id, new.email, 'operator_admin');
  RETURN new;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();