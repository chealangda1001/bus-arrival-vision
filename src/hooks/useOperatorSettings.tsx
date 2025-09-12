import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface OperatorSettings {
  id: string;
  operator_id: string;
  announcement_repeat_count: number;
  announcement_scripts: {
    english: string;
    khmer: string;
    chinese: string;
  };
  voice_enabled: boolean;
  auto_announcement_enabled: boolean;
}

export const useOperatorSettings = (operatorId?: string) => {
  const [settings, setSettings] = useState<OperatorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!operatorId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('operator_settings')
        .select('*')
        .eq('operator_id', operatorId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data as unknown as OperatorSettings);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error fetching operator settings:', error);
      toast({
        title: "Error",
        description: "Failed to load announcement settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!operatorId) return;
    
    const defaultSettings = {
      operator_id: operatorId,
      announcement_repeat_count: 3,
      announcement_scripts: {
        english: "Attention passengers, {fleet_type} service to {destination} will depart at {time}. Bus plate number {plate}. Please proceed to the boarding area.",
        khmer: "សូមអ្នកដំណើរ សេវាកម្ម {fleet_type} ទៅ {destination} នឹងចេញនៅម៉ោង {time}។ លេខផ្ទាំងឡាន {plate}។ សូមទៅកាន់តំបន់ឡើងឡាន។",
        chinese: "乘客请注意，{fleet_type}开往{destination}的班车将于{time}发车。车牌号{plate}。请前往候车区域。"
      },
      voice_enabled: true,
      auto_announcement_enabled: true
    };

    try {
      const { data, error } = await supabase
        .from('operator_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      setSettings(data as unknown as OperatorSettings);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateSettings = async (updatedSettings: Partial<OperatorSettings>) => {
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from('operator_settings')
        .update(updatedSettings)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data as unknown as OperatorSettings);
      toast({
        title: "Settings Updated",
        description: "Announcement settings have been saved successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update announcement settings",
        variant: "destructive",
      });
    }
  };

  const clearCache = async () => {
    if (!operatorId) return;
    
    try {
      const { error } = await supabase
        .from('announcements_cache')
        .delete()
        .eq('operator_id', operatorId);

      if (error) throw error;

      toast({
        title: "Cache Cleared",
        description: "All cached announcements have been cleared",
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Error",
        description: "Failed to clear announcement cache",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [operatorId]);

  return {
    settings,
    loading,
    updateSettings,
    clearCache,
    refetch: fetchSettings
  };
};