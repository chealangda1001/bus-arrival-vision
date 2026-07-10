import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemTtsSettings {
  id: string;
  khmer_provider: 'gemini' | 'kiritts';
  kiritts_khmer_voice: string;
  kiritts_english_voice: string;
  kiritts_chinese_voice: string;
}

const DEFAULT_SETTINGS: Omit<SystemTtsSettings, 'id'> = {
  khmer_provider: 'gemini',
  kiritts_khmer_voice: 'Kiri',
  kiritts_english_voice: 'Maly',
  kiritts_chinese_voice: 'Kiri',
};

export const useSystemTtsSettings = () => {
  const [settings, setSettings] = useState<SystemTtsSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('system_tts_settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data as SystemTtsSettings);
      } else {
        setSettings({ id: '', ...DEFAULT_SETTINGS });
      }
    } catch (error) {
      console.error('Error fetching system TTS settings:', error);
      // Fall back to defaults so announcements keep working.
      setSettings({ id: '', ...DEFAULT_SETTINGS });
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = async (updates: Partial<Omit<SystemTtsSettings, 'id'>>) => {
    try {
      if (settings?.id) {
        const { data, error } = await (supabase as any)
          .from('system_tts_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        setSettings(data as SystemTtsSettings);
      } else {
        const { data, error } = await (supabase as any)
          .from('system_tts_settings')
          .insert({ ...DEFAULT_SETTINGS, ...updates })
          .select()
          .single();
        if (error) throw error;
        setSettings(data as SystemTtsSettings);
      }
      return true;
    } catch (error) {
      console.error('Error updating system TTS settings:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, updateSettings, refetch: fetchSettings };
};
