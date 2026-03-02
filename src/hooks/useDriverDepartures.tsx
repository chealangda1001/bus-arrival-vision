import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Departure } from "@/hooks/useDepartures";

export const useDriverDepartures = (driverId?: string) => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignedDepartures = useCallback(async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      
      // Get departure IDs assigned to this driver
      const { data: assignments, error: assignError } = await supabase
        .from('driver_departures')
        .select('departure_id')
        .eq('driver_id', driverId);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) {
        setDepartures([]);
        return;
      }

      const departureIds = assignments.map(a => a.departure_id);

      const { data, error } = await supabase
        .from('departures')
        .select('*')
        .in('id', departureIds)
        .order('departure_time', { ascending: true });

      if (error) throw error;

      setDepartures((data || []) as unknown as Departure[]);
    } catch (error) {
      console.error('Error fetching driver departures:', error);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchAssignedDepartures();
  }, [fetchAssignedDepartures]);

  return { departures, loading, refetch: fetchAssignedDepartures };
};
