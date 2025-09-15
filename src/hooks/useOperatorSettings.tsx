import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface VoiceSettings {
  voice: 'male' | 'female';
  voice_model?: 'Zephyr' | 'Kore' | 'Luna';
  speed: number;
  pitch: number;
}

export interface OperatorSettings {
  id: string;
  operator_id: string;
  operator_name: string;
  announcement_repeat_count: number;
  announcement_scripts: {
    english: string;
    khmer: string;
    chinese: string;
  };
  voice_enabled: boolean;
  auto_announcement_enabled: boolean;
  style_instructions: string;
  temperature: number;
  voice_settings: {
    khmer: VoiceSettings;
    english: VoiceSettings;
    chinese: VoiceSettings;
  };
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
      operator_name: 'BookMeBus',
      announcement_repeat_count: 3,
      announcement_scripts: {
        khmer: "សូមអញ្ជើញអ្នកដំណើរទាំងអស់, ដែលកំពុងធ្វើដំណើរ, ទៅកាន់{destination}, តាមរយៈឡាន{fleet_type}, អញ្ជើញឡើងរថយន្ត, ដែលមានស្លាកលេខ, {fleet_plate_number}, យើងនឹងចាក់ចេញដំណើរទៅកាន់ {destination} ក្នុងពេលបន្តិចទៀតនេះ, ហើយការធ្វើដំណើរនេះមានរយៈពេលប្រហែល {trip_duration} ម៉ោង, យើងនឹងមានការឈប់សំរាកប្រមាណ {break_duration} នាទី, សម្រាប់អ្នកទាំងអស់គ្នាទៅបន្ទប់ទឹក ឬទិញអាហារតិចតួច, យើងនឹងទៅដល់ {destination} ប្រមាណ {trip_duration} ម៉ោងបន្ទាប់, សូមអរគុណសម្រាប់ការធ្វើដំណើររបស់អ្នក, ជាមួយក្រុមហ៊ុន, {operator_name}, យើងខ្ញុំសូមជូនពរអស់លោក, លោកស្រី, ឲ្យធ្វើដំណើរប្រកបដោយសុវត្ថិភាព សូមអរគុណ",
        english: "Attention please. Passengers traveling to {destination}, please proceed to the boarding gate, we will be departing soon. We will be traveling to {destination}, and the journey will take about {trip_duration} hours, We will have a {break_duration} minute break so everyone can use the restroom or grab a quick snack, We will arrive in {destination} in around {trip_duration} hours. We wish you a safe and enjoyable bus ride. Thank you for traveling with {operator_name}!",
        chinese: "各位旅客请注意：前往 {destination} 的乘客请前往登车口，我们即将出发。本次行程将前往 {destination} ，全程大约 {trip_duration} 小时。途中我们会停靠一次，休息 {break_duration} 分钟，方便大家使用洗手间或购买一些小吃。预计 {trip_duration} 小时后抵达 {destination}。祝您旅途平安愉快！感谢您选择 {operator_name}！"
      },
      voice_enabled: true,
      auto_announcement_enabled: true,
      style_instructions: "Use a professional airport flight announcement using multiple speakers. Use a warm and friendly Khmer female voice (Zephyr) for the main announcement in Khmer, clear and polite, like a native announcer. Use a firm and neutral male voice (Kore) for the English translation, sounding official but welcoming. Maintain a steady pace with natural pauses, like real airport announcements, and avoid robotic intonation.",
      temperature: 0.7,
      voice_settings: {
        khmer: { voice: 'female', voice_model: 'Zephyr', speed: 0.9, pitch: 0.0 },
        english: { voice: 'male', voice_model: 'Kore', speed: 1.0, pitch: 0.0 },
        chinese: { voice: 'female', voice_model: 'Luna', speed: 0.9, pitch: 0.0 }
      }
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
      // Convert voice_settings to proper JSON format for database
      const dbUpdate: any = { ...updatedSettings };
      if (updatedSettings.voice_settings) {
        dbUpdate.voice_settings = updatedSettings.voice_settings as any;
      }
      if (updatedSettings.announcement_scripts) {
        dbUpdate.announcement_scripts = updatedSettings.announcement_scripts as any;
      }

      const { data, error } = await supabase
        .from('operator_settings')
        .update(dbUpdate)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data as unknown as OperatorSettings);

      // Clear cache when settings change to force fresh generation
      if (operatorId) {
        try {
          // Clear both Supabase cache and IndexedDB cache
          await supabase
            .from('announcements_cache')
            .delete()
            .eq('operator_id', operatorId);

          const { audioCache } = await import("@/utils/audioCache");
          await audioCache.clearOperatorCache(operatorId);
          
          console.log("Cache cleared after settings update");
        } catch (cacheError) {
          console.error('Error clearing cache after settings update:', cacheError);
        }
      }

      toast({
        title: "Settings Updated",
        description: "Announcement settings have been saved and cache cleared",
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
      // Clear both Supabase cache and IndexedDB cache
      const { error } = await supabase
        .from('announcements_cache')
        .delete()
        .eq('operator_id', operatorId);

      if (error) throw error;

      // Also clear IndexedDB cache for this operator
      const { audioCache } = await import("@/utils/audioCache");
      await audioCache.clearOperatorCache(operatorId);

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