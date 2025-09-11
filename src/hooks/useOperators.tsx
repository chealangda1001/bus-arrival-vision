import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Operator {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export const useOperators = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .order('name');

      if (error) throw error;
      setOperators(data || []);
    } catch (error) {
      console.error('Error fetching operators:', error);
      toast({
        title: "Error",
        description: "Failed to fetch operators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOperator = async (operatorData: {
    name: string;
    slug: string;
    logo_url?: string;
    admin_username: string;
    admin_password: string;
    branch_name: string;
    branch_location?: string;
  }) => {
    try {
      // First create the operator
      const { data: operator, error: operatorError } = await supabase
        .from('operators')
        .insert([{
          name: operatorData.name,
          slug: operatorData.slug,
          logo_url: operatorData.logo_url
        }])
        .select()
        .single();

      if (operatorError) throw operatorError;

      // Then create the admin user
      const { error: adminError } = await supabase
        .from('operator_admins')
        .insert([{
          operator_id: operator.id,
          username: operatorData.admin_username,
          password_hash: operatorData.admin_password,
          role: 'operator_admin'
        }]);

      if (adminError) throw adminError;

      // Create default branch
      const branchSlug = operatorData.branch_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { error: branchError } = await supabase
        .from('branches')
        .insert([{
          operator_id: operator.id,
          name: operatorData.branch_name,
          slug: branchSlug,
          location: operatorData.branch_location,
          is_default: true
        }]);

      if (branchError) throw branchError;

      toast({
        title: "Success",
        description: `Operator "${operatorData.name}" created with first branch "${operatorData.branch_name}"`,
      });
      
      fetchOperators();
    } catch (error) {
      console.error('Error creating operator:', error);
      toast({
        title: "Error",
        description: "Failed to create operator",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  return {
    operators,
    loading,
    createOperator,
    refetch: fetchOperators
  };
};