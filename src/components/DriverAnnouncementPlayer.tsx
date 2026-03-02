import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Square, Play, Loader2, Volume2 } from "lucide-react";
import { type Departure } from "@/hooks/useDepartures";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorSettings } from "@/hooks/useOperatorSettings";
import { useAnnouncementTypes } from "@/hooks/useAnnouncementTypes";
import { audioCache, AudioQueue, generateScriptHash } from "@/utils/audioCache";
import { useToast } from "@/components/ui/use-toast";
import { formatTimeWithKhmerPeriods, formatTimeEnglish, formatTimeChinese } from "@/utils/timeFormatter";

interface DriverAnnouncementPlayerProps {
  departure: Departure;
  operatorId?: string;
  announcementTypeKey: string;
  breakDurationOverride?: number;
  onClose: () => void;
}

type Language = 'khmer' | 'english' | 'chinese';
type PlaybackStatus = 'idle' | 'generating' | 'playing';

const LANG_LABELS: Record<Language, { code: string; name: string }> = {
  khmer: { code: 'KH', name: 'ភាសាខ្មែរ' },
  english: { code: 'EN', name: 'English' },
  chinese: { code: 'CN', name: '中文' },
};

export default function DriverAnnouncementPlayer({
  departure,
  operatorId,
  announcementTypeKey,
  breakDurationOverride,
  onClose,
}: DriverAnnouncementPlayerProps) {
  const [fullPlayStatus, setFullPlayStatus] = useState<PlaybackStatus>('idle');
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [currentLang, setCurrentLang] = useState<Language | null>(null);
  const [singlePlayingLang, setSinglePlayingLang] = useState<Language | null>(null);
  const [singleGenLang, setSingleGenLang] = useState<Language | null>(null);
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  const abortRef = useRef(false);
  const { toast } = useToast();

  const { settings, loading: settingsLoading } = useOperatorSettings(operatorId);
  const { types: announcementTypes, loading: typesLoading } = useAnnouncementTypes(operatorId);

  const typeConfig = announcementTypes.find(t => t.type_key === announcementTypeKey);
  const script = typeConfig?.announcement_scripts || settings?.announcement_scripts || {
    english: '', khmer: '', chinese: ''
  };
  const repeatCount = typeConfig?.repeat_count || settings?.announcement_repeat_count || 3;

  const generateText = (template: string, lang: Language) => {
    let text = template;
    let formattedTime = departure.departure_time;
    if (lang === 'khmer') formattedTime = formatTimeWithKhmerPeriods(departure.departure_time);
    else if (lang === 'english') formattedTime = formatTimeEnglish(departure.departure_time);
    else formattedTime = formatTimeChinese(departure.departure_time);

    text = text.replace(/{fleet_type}/g, departure.fleet_type || 'Bus');
    text = text.replace(/{destination}/g, departure.destination);
    text = text.replace(/{time}/g, formattedTime);
    text = text.replace(/{departure_time}/g, formattedTime);
    text = text.replace(/{plate}/g, departure.plate_number || '');
    text = text.replace(/{fleet_plate_number}/g, departure.plate_number || '');
    text = text.replace(/{leaving_from}/g, departure.leaving_from || 'Terminal');
    text = text.replace(/{trip_duration}/g, departure.trip_duration || 'N/A');
    const breakDuration = breakDurationOverride?.toString() || departure.break_duration || 'N/A';
    text = text.replace(/{break_duration}/g, breakDuration);
    text = text.replace(/{operator_name}/g, settings?.operator_name || 'BookMeBus');
    return text;
  };

  const generateAudio = async (lang: Language): Promise<string | null> => {
    const template = script[lang as keyof typeof script] as string;
    if (!template?.trim()) return null;
    const text = generateText(template, lang);
    if (!text.trim()) return null;

    const scriptHash = generateScriptHash(script as any);

    if (lang === 'khmer') {
      const cacheKey = `gemini_khmer_${operatorId}_${btoa(unescape(encodeURIComponent(text)))}_${scriptHash}`;
      const cached = await audioCache.get(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase.functions.invoke('gemini-khmer-tts', {
        body: { text, operatorId, cacheKey }
      });
      if (error || !data?.audioContent) throw error || new Error('No audio');
      await audioCache.set(cacheKey, data.audioContent, 24);
      return data.audioContent;
    } else {
      const cacheKey = `${lang}_direct_${operatorId}_${btoa(unescape(encodeURIComponent(text)))}_${scriptHash}`;
      const cached = await audioCache.get(cacheKey);
      if (cached) return cached;

      const voice = lang === 'english' ? 'Kore' : 'Luna';
      const singleScript = `[Voice: ${voice}] ${text}`;
      const { data, error } = await supabase.functions.invoke('gemini-multispeaker-tts', {
        body: {
          script: singleScript,
          operatorId,
          speechRate: lang === 'english'
            ? (settings?.voice_settings?.english?.speed || 1.0)
            : (settings?.voice_settings?.chinese?.speed || 0.9),
          pitchAdjustment: lang === 'english'
            ? (settings?.voice_settings?.english?.pitch || 0)
            : (settings?.voice_settings?.chinese?.pitch || 0),
        }
      });
      if (error || !data?.audioContent) throw error || new Error('No audio');
      await audioCache.set(cacheKey, data.audioContent, 24);
      return data.audioContent;
    }
  };

  const playAudioAndWait = async (base64: string) => {
    const queue = audioQueueRef.current;
    await queue.addToQueue(base64);
    while (queue.playing) {
      if (abortRef.current) { queue.stop(); return; }
      await new Promise(r => setTimeout(r, 100));
    }
  };

  // Full play: all languages × repeats
  const playAll = async () => {
    if (!operatorId) return;
    abortRef.current = false;
    setFullPlayStatus('generating');
    const languages: Language[] = ['khmer', 'english', 'chinese'];

    try {
      // Pre-generate all
      const audioMap: Partial<Record<Language, string>> = {};
      for (const lang of languages) {
        if (abortRef.current) return;
        const audio = await generateAudio(lang);
        if (audio) audioMap[lang] = audio;
      }

      setFullPlayStatus('playing');
      for (let rep = 1; rep <= repeatCount; rep++) {
        if (abortRef.current) return;
        setCurrentRepeat(rep);
        for (const lang of languages) {
          if (abortRef.current) return;
          const audio = audioMap[lang];
          if (!audio) continue;
          setCurrentLang(lang);
          await playAudioAndWait(audio);
          if (abortRef.current) return;
          await new Promise(r => setTimeout(r, 500));
        }
        if (rep < repeatCount) await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error('Playback error:', err);
      toast({ title: "Error", description: "Failed to play announcement.", variant: "destructive" });
    } finally {
      setFullPlayStatus('idle');
      setCurrentRepeat(0);
      setCurrentLang(null);
    }
  };

  // Single language play: one time, no repeat
  const playSingle = async (lang: Language) => {
    if (!operatorId || singlePlayingLang || fullPlayStatus !== 'idle') return;
    try {
      setSingleGenLang(lang);
      const audio = await generateAudio(lang);
      if (!audio) {
        toast({ title: "No audio", description: `No template for ${LANG_LABELS[lang].name}`, variant: "destructive" });
        setSingleGenLang(null);
        return;
      }
      setSingleGenLang(null);
      setSinglePlayingLang(lang);
      await playAudioAndWait(audio);
    } catch (err) {
      console.error('Single play error:', err);
      toast({ title: "Error", description: "Failed to play.", variant: "destructive" });
    } finally {
      setSingleGenLang(null);
      setSinglePlayingLang(null);
    }
  };

  const stopAll = () => {
    abortRef.current = true;
    audioQueueRef.current.stop();
    setFullPlayStatus('idle');
    setCurrentRepeat(0);
    setCurrentLang(null);
    setSinglePlayingLang(null);
    setSingleGenLang(null);
  };

  // Auto-start full playback on mount
  useEffect(() => {
    if (!settingsLoading && !typesLoading && operatorId) {
      playAll();
    }
    return () => { abortRef.current = true; audioQueueRef.current.stop(); };
  }, [settingsLoading, typesLoading]);

  const isActive = fullPlayStatus !== 'idle';
  const typeName = typeConfig?.type_name || announcementTypeKey;

  return (
    <Card className="border-2 border-primary/50 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {isActive && <Volume2 className="w-4 h-4 shrink-0 animate-pulse text-primary" />}
          <span className="text-sm font-semibold truncate">{typeName}</span>
          {currentRepeat > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {currentRepeat}/{repeatCount}
            </Badge>
          )}
          {fullPlayStatus === 'generating' && (
            <Badge variant="outline" className="text-xs shrink-0">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Generating
            </Badge>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { stopAll(); onClose(); }}
          className="shrink-0 h-8 px-3 text-xs"
        >
          <Square className="w-3 h-3 mr-1" />
          Stop
        </Button>
      </div>

      {/* Language rows */}
      <div className="divide-y divide-border">
        {(['khmer', 'english', 'chinese'] as Language[]).map(lang => {
          const label = LANG_LABELS[lang];
          const isCurrentFullPlay = currentLang === lang && fullPlayStatus === 'playing';
          const isSinglePlaying = singlePlayingLang === lang;
          const isSingleGen = singleGenLang === lang;
          const isHighlighted = isCurrentFullPlay || isSinglePlaying;

          return (
            <div
              key={lang}
              className={`flex items-center justify-between px-3 py-2.5 transition-colors ${
                isHighlighted ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge
                  variant={isHighlighted ? 'default' : 'outline'}
                  className="text-xs shrink-0 w-8 justify-center"
                >
                  {label.code}
                </Badge>
                <span className="text-sm truncate">{label.name}</span>
                {isCurrentFullPlay && (
                  <Volume2 className="w-3 h-3 shrink-0 animate-pulse text-primary" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isActive || singlePlayingLang !== null || singleGenLang !== null}
                onClick={() => playSingle(lang)}
                className="shrink-0 h-7 w-7 p-0"
              >
                {isSingleGen ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isSinglePlaying ? (
                  <Volume2 className="w-3.5 h-3.5 animate-pulse text-primary" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
