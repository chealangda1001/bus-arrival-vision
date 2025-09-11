import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Branch {
  id: string;
  operator_id: string;
  name: string;
  slug: string;
  location?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  operators?: {
    name: string;
    slug: string;
  };
}

export const useBranches = (operatorId?: string) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBranches = async () => {
    try {
      let query = supabase
        .from('branches')
        .select(`
          *,
          operators:operator_id (
            name,
            slug
          )
        `)
        .order('is_default', { ascending: false })
        .order('name');

      if (operatorId) {
        query = query.eq('operator_id', operatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch branches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBranch = async (branchData: {
    operator_id: string;
    name: string;
    slug: string;
    location?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('branches')
        .insert([branchData]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Branch created successfully",
      });
      
      fetchBranches();
    } catch (error) {
      console.error('Error creating branch:', error);
      toast({
        title: "Error",
        description: "Failed to create branch",
        variant: "destructive",
      });
    }
  };

  const getBranchBySlug = (operatorSlug: string, branchSlug: string): Branch | null => {
    return branches.find(
      branch => 
        branch.operators?.slug === operatorSlug && 
        branch.slug === branchSlug
    ) || null;
  };

  const getDefaultBranch = (operatorSlug: string): Branch | null => {
    return branches.find(
      branch => 
        branch.operators?.slug === operatorSlug && 
        branch.is_default
    ) || null;
  };

  useEffect(() => {
    fetchBranches();
  }, [operatorId]);

  return {
    branches,
    loading,
    createBranch,
    getBranchBySlug,
    getDefaultBranch,
    refetch: fetchBranches
  };
};