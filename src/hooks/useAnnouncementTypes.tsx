import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface AnnouncementType {
  id: string;
  operator_id: string;
  type_key: string;
  type_name: string;
  description: string | null;
  announcement_scripts: {
    english: string;
    khmer: string;
    chinese: string;
  };
  voice_settings: {
    khmer: { voice: string; voice_model?: string; speed: number; pitch: number };
    english: { voice: string; voice_model?: string; speed: number; pitch: number };
    chinese: { voice: string; voice_model?: string; speed: number; pitch: number };
  };
  repeat_count: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useAnnouncementTypes = (operatorId?: string) => {
  const [types, setTypes] = useState<AnnouncementType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTypes = useCallback(async () => {
    if (!operatorId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcement_types')
        .select('*')
        .eq('operator_id', operatorId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTypes((data || []) as unknown as AnnouncementType[]);
    } catch (error) {
      console.error('Error fetching announcement types:', error);
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  const createType = async (newType: {
    type_key: string;
    type_name: string;
    description?: string;
    announcement_scripts?: { english: string; khmer: string; chinese: string };
    voice_settings?: any;
    repeat_count?: number;
  }) => {
    if (!operatorId) return;
    try {
      const { data, error } = await supabase
        .from('announcement_types')
        .insert({
          operator_id: operatorId,
          type_key: newType.type_key,
          type_name: newType.type_name,
          description: newType.description || null,
          announcement_scripts: newType.announcement_scripts || { english: '', khmer: '', chinese: '' },
          voice_settings: newType.voice_settings || undefined,
          repeat_count: newType.repeat_count || 3,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchTypes();
      toast({ title: "Created", description: `Announcement type "${newType.type_name}" created.` });
      return data;
    } catch (error: any) {
      console.error('Error creating announcement type:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') 
          ? "An announcement type with this key already exists." 
          : "Failed to create announcement type.",
        variant: "destructive",
      });
    }
  };

  const updateType = async (id: string, updates: Partial<AnnouncementType>) => {
    try {
      const dbUpdates: any = { ...updates };
      // Remove read-only fields
      delete dbUpdates.id;
      delete dbUpdates.operator_id;
      delete dbUpdates.created_at;
      delete dbUpdates.updated_at;
      delete dbUpdates.is_default;

      const { error } = await supabase
        .from('announcement_types')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      await fetchTypes();
      toast({ title: "Updated", description: "Announcement type updated." });
    } catch (error) {
      console.error('Error updating announcement type:', error);
      toast({ title: "Error", description: "Failed to update announcement type.", variant: "destructive" });
    }
  };

  const deleteType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcement_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTypes();
      toast({ title: "Deleted", description: "Announcement type deleted." });
    } catch (error) {
      console.error('Error deleting announcement type:', error);
      toast({ title: "Error", description: "Failed to delete announcement type.", variant: "destructive" });
    }
  };

  const getTypeByKey = useCallback((typeKey: string) => {
    return types.find(t => t.type_key === typeKey);
  }, [types]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return { types, loading, createType, updateType, deleteType, getTypeByKey, refetch: fetchTypes };
};
