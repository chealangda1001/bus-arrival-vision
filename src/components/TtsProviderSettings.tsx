import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Volume2, Loader2, RefreshCw } from "lucide-react";
import { useSystemTtsSettings } from "@/hooks/useSystemTtsSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KiriVoice {
  id?: number | string;
  name: string;
  category?: string;
}

export default function TtsProviderSettings() {
  const { settings, loading, updateSettings } = useSystemTtsSettings();
  const { toast } = useToast();
  const [provider, setProvider] = useState<'gemini' | 'kiritts'>('gemini');
  const [khmerVoice, setKhmerVoice] = useState('Kiri');
  const [voices, setVoices] = useState<KiriVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setProvider(settings.khmer_provider);
      setKhmerVoice(settings.kiritts_khmer_voice || 'Kiri');
    }
  }, [settings]);

  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('kiritts-voices', {});
      if (error) throw error;
      const list: KiriVoice[] = (data?.voices || []).map((v: any) => ({
        id: v.id,
        name: v.name || v.id,
        category: v.category,
      })).filter((v: KiriVoice) => v.name);
      setVoices(list);
      if (list.length === 0) {
        toast({ title: "No voices returned", description: "Check your KiriTTS API key.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error('Failed to load KiriTTS voices:', err);
      toast({ title: "Could not load voices", description: err.message || "Enter the voice name manually.", variant: "destructive" });
    } finally {
      setLoadingVoices(false);
    }
  };

  useEffect(() => {
    if (provider === 'kiritts' && voices.length === 0) {
      loadVoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await updateSettings({
      khmer_provider: provider,
      kiritts_khmer_voice: khmerVoice,
    });
    setSaving(false);
    toast({
      title: ok ? "Saved" : "Error",
      description: ok
        ? `Khmer announcements now use ${provider === 'kiritts' ? 'KiriTTS' : 'Gemini'}.`
        : "Failed to save TTS provider settings.",
      variant: ok ? undefined : "destructive",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const voiceNames = Array.from(new Set([khmerVoice, ...voices.map(v => v.name)])).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          TTS Provider
        </CardTitle>
        <CardDescription>
          Choose which text-to-speech provider generates Khmer announcements. English and Chinese always use Gemini.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <Label>Primary Khmer provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as 'gemini' | 'kiritts')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Gemini (default)</SelectItem>
              <SelectItem value="kiritts">KiriTTS</SelectItem>
            </SelectContent>
          </Select>
          {provider === 'kiritts' && (
            <Badge variant="secondary" className="mt-1">KiriTTS is primary for Khmer</Badge>
          )}
        </div>

        {provider === 'kiritts' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>KiriTTS Khmer voice</Label>
              <Button type="button" variant="ghost" size="sm" onClick={loadVoices} disabled={loadingVoices}>
                {loadingVoices ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-1">Refresh</span>
              </Button>
            </div>
            {voiceNames.length > 0 ? (
              <Select value={khmerVoice} onValueChange={setKhmerVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voiceNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={khmerVoice}
                onChange={(e) => setKhmerVoice(e.target.value)}
                placeholder="e.g. Kiri or Maly"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Voices are fetched live from your KiriTTS account. You can also type a voice name manually.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
