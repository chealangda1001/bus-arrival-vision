import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  role: 'super_admin' | 'operator_admin';
  operator_id?: string;
  operator?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
}

interface MultiAuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const MultiAuthContext = createContext<MultiAuthContextType | undefined>(undefined);

export const MultiAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Query the operator_admins table with operator data
      const { data, error } = await supabase
        .from('operator_admins')
        .select(`
          id,
          username,
          role,
          operator_id,
          operators:operator_id (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq('username', username)
        .eq('password_hash', password)
        .single();

      if (error || !data) {
        toast({
          title: "Login Failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
        return false;
      }

      const userData: User = {
        id: data.id,
        username: data.username,
        role: data.role as 'super_admin' | 'operator_admin',
        operator_id: data.operator_id || undefined,
        operator: data.operators ? {
          id: data.operators.id,
          name: data.operators.name,
          slug: data.operators.slug,
          logo_url: data.operators.logo_url
        } : undefined
      };

      // Set the current user context for RLS policies
      await supabase.rpc('set_user_context', { username });

      setUser(userData);
      localStorage.setItem('multi_auth_user', JSON.stringify(userData));
      
      console.log('Login successful, user data:', userData);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${username}!`,
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    // Clear the current user context
    try {
      await supabase.rpc('set_user_context', { username: '' });
    } catch (error) {
      console.error('Error clearing user context:', error);
    }
    
    setUser(null);
    localStorage.removeItem('multi_auth_user');
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('multi_auth_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Set the current user context for RLS policies
        const setUserContext = async () => {
          try {
            await supabase.rpc('set_user_context', { username: userData.username });
          } catch (error) {
            console.error('Error setting user context:', error);
          }
        };
        setUserContext();
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('multi_auth_user');
      }
    }
    setLoading(false);
  }, []);

  return (
    <MultiAuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </MultiAuthContext.Provider>
  );
};

export const useMultiAuth = () => {
  const context = useContext(MultiAuthContext);
  if (context === undefined) {
    throw new Error('useMultiAuth must be used within a MultiAuthProvider');
  }
  return context;
};