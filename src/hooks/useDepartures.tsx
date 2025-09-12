import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMultiAuth } from '@/hooks/useMultiAuth';

export interface Departure {
  id: string;
  branch_id: string;
  destination: string;
  plate_number: string;
  departure_time: string;
  status: "on-time" | "delayed" | "boarding" | "departed";
  estimated_time?: string;
  fleet_type: "VIP Van" | "Bus" | "Sleeping Bus";
  fleet_image_url?: string;
  created_at: string;
  updated_at: string;
}

export const useDepartures = (branchId?: string) => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useMultiAuth();

  const setUserContext = async () => {
    if (user?.username) {
      await supabase.rpc('set_user_context', { username: user.username });
    }
  };

  const fetchDepartures = async () => {
    try {
      let query = supabase
        .from('departures')
        .select('*')
        .order('departure_time');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setDepartures((data || []).map(item => ({
        ...item,
        status: item.status as Departure['status'],
        fleet_type: item.fleet_type as Departure['fleet_type']
      })));
    } catch (error) {
      console.error('Error fetching departures:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addDeparture = async (departure: Omit<Departure, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Set user context for super admin operations
      if (user?.username) {
        await supabase.rpc('set_user_context', { username: user.username });
      }
      
      const { error } = await supabase
        .from('departures')
        .insert([departure]);

      if (error) throw error;
      
      // Refresh departures after successful add
      await fetchDepartures();
      
      toast({
        title: "Success",
        description: "Departure added successfully",
      });
    } catch (error) {
      console.error('Error adding departure:', error);
      toast({
        title: "Error",
        description: "Failed to add departure",
        variant: "destructive",
      });
    }
  };

  const updateDepartureStatus = async (id: string, status: Departure['status'], estimatedTime?: string) => {
    try {
      // Set user context for super admin operations
      if (user?.username) {
        await supabase.rpc('set_user_context', { username: user.username });
      }
      
      const updates: any = { status };
      if (estimatedTime) updates.estimated_time = estimatedTime;

      const { error } = await supabase
        .from('departures')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Refresh departures after successful update
      await fetchDepartures();
      
      toast({
        title: "Success",
        description: "Departure status updated",
      });
    } catch (error) {
      console.error('Error updating departure:', error);
      toast({
        title: "Error",
        description: "Failed to update departure",
        variant: "destructive",
      });
    }
  };

  const deleteDeparture = async (id: string) => {
    try {
      // Set user context for super admin operations
      if (user?.username) {
        await supabase.rpc('set_user_context', { username: user.username });
      }
      
      const { error } = await supabase
        .from('departures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh departures after successful delete
      await fetchDepartures();
      
      toast({
        title: "Success",
        description: "Departure deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting departure:', error);
      toast({
        title: "Error",
        description: "Failed to delete departure",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDepartures();

    // Set up real-time subscription
    const channel = supabase
      .channel('departures_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'departures'
      }, () => {
        fetchDepartures();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    departures,
    loading,
    addDeparture,
    updateDepartureStatus,
    deleteDeparture,
    refetch: fetchDepartures
  };
};