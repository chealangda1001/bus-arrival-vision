import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Fleet {
  id: string;
  operator_id: string;
  name: string;
  plate_number: string;
  fleet_type: "VIP Van" | "Bus" | "Sleeping Bus";
  fleet_image_url?: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFleets = (operatorId?: string) => {
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFleets = async () => {
    try {
      let query = supabase
        .from('fleets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (operatorId) {
        query = query.eq('operator_id', operatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setFleets((data || []).map(item => ({
        ...item,
        fleet_type: item.fleet_type as Fleet['fleet_type']
      })));
    } catch (error) {
      console.error('Error fetching fleets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch fleets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addFleet = async (fleet: Omit<Fleet, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('fleets')
        .insert([fleet]);

      if (error) throw error;
      
      await fetchFleets();
      
      toast({
        title: "Success",
        description: "Fleet added successfully",
      });
    } catch (error) {
      console.error('Error adding fleet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add fleet",
        variant: "destructive",
      });
    }
  };

  const updateFleet = async (id: string, updates: Partial<Omit<Fleet, 'id' | 'created_at'>>) => {
    try {
      const { error } = await supabase
        .from('fleets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      await fetchFleets();
      
      toast({
        title: "Success",
        description: "Fleet updated successfully",
      });
    } catch (error) {
      console.error('Error updating fleet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update fleet",
        variant: "destructive",
      });
    }
  };

  const deleteFleet = async (id: string) => {
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('fleets')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      await fetchFleets();
      
      toast({
        title: "Success",
        description: "Fleet deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting fleet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete fleet",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchFleets();

    // Set up real-time subscription
    const channel = supabase
      .channel('fleets_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fleets'
      }, () => {
        fetchFleets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operatorId]);

  return {
    fleets,
    loading,
    addFleet,
    updateFleet,
    deleteFleet,
    refetch: fetchFleets
  };
};