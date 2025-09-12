import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { type Departure } from "@/hooks/useDepartures";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorSettings } from "@/hooks/useOperatorSettings";
import { audioCache, AudioQueue, generateCacheKey } from "@/utils/audioCache";
import { useToast } from "@/components/ui/use-toast";

interface AnnouncementSystemProps {
  departure?: Departure;
  operatorId?: string;
  onComplete?: () => void;
  manualTrigger?: boolean;
}

interface AnnouncementScript {
  english: string;
  khmer: string;
  chinese: string;
}

export default function AnnouncementSystem({ 
  departure, 
  operatorId, 
  onComplete, 
  manualTrigger = false 
}: AnnouncementSystemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'khmer' | 'chinese'>('english');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  const { toast } = useToast();
  
  const { settings, loading: settingsLoading } = useOperatorSettings(operatorId);
  
  const script = settings?.announcement_scripts || {
    english: "Attention passengers, {fleet_type} service to {destination} will depart at {time}. Bus plate number {plate}. Please proceed to the boarding area.",
    khmer: "សូមអ្នកដំណើរ សេវាកម្ម {fleet_type} ទៅ {destination} នឹងចេញនៅម៉ោង {time}។ លេខផ្ទាំងឡាន {plate}។ សូមទៅកាន់តំបន់ឡើងឡាន។",
    chinese: "乘客请注意，{fleet_type}开往{destination}的班车将于{time}发车。车牌号{plate}。请前往候车区域。"
  };

  const generateAnnouncementText = (template: string, departure: Departure) => {
    let announcementText = template;
    
    if (departure.fleet_type) {
      announcementText = announcementText.replace('{fleet_type}', departure.fleet_type);
    }
    
    announcementText = announcementText.replace('{destination}', departure.destination);
    announcementText = announcementText.replace('{time}', departure.departure_time);
    announcementText = announcementText.replace('{plate}', departure.plate_number || '');
    
    return announcementText;
  };

  const generateAudio = async (text: string, language: 'english' | 'khmer' | 'chinese') => {
    if (!operatorId) {
      throw new Error('Operator ID is required for audio generation');
    }

    const cacheKey = generateCacheKey(text, language, operatorId);
    
    // Check local cache first
    let audioData = await audioCache.get(cacheKey);
    
    if (!audioData) {
      // Generate using edge function
      const { data, error } = await supabase.functions.invoke('generate-announcement', {
        body: {
          text,
          language,
          operatorId
        }
      });

      if (error) throw error;
      audioData = data.audioData;
      
      // Cache locally for faster access
      await audioCache.set(cacheKey, audioData);
    }

    return audioData;
  };

  const playAnnouncement = async () => {
    if (!departure || isPlaying || !settings?.voice_enabled || !operatorId) return;
    
    try {
      setIsPlaying(true);
      setIsGenerating(true);
      
      const languages: ('english' | 'khmer' | 'chinese')[] = ['english', 'khmer', 'chinese'];
      const repeatCount = settings.announcement_repeat_count || 3;
      
      // Pre-generate all audio files
      const audioPromises: Promise<{ lang: string; audioData: string }>[] = [];
      
      for (const lang of languages) {
        const text = generateAnnouncementText(script[lang], departure);
        audioPromises.push(
          generateAudio(text, lang).then(audioData => ({ lang, audioData }))
        );
      }
      
      const audioResults = await Promise.all(audioPromises);
      setIsGenerating(false);
      
      // Play announcements in sequence for specified repeat count
      for (let repeat = 1; repeat <= repeatCount; repeat++) {
        setCurrentRepeat(repeat);
        
        for (const { lang, audioData } of audioResults) {
          setCurrentLanguage(lang as 'english' | 'khmer' | 'chinese');
          await audioQueueRef.current.addToQueue(audioData);
          
          // Wait for current audio to finish
          while (audioQueueRef.current.playing) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Small pause between languages
          if (lang !== 'chinese') {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Pause between repeats (except after the last one)
        if (repeat < repeatCount) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      console.error('Error playing announcement:', error);
      toast({
        title: "Announcement Error",
        description: "Failed to play announcement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlaying(false);
      setIsGenerating(false);
      setCurrentRepeat(1);
      onComplete?.();
    }
  };

  const stopAnnouncement = () => {
    audioQueueRef.current.stop();
    setIsPlaying(false);
    setIsGenerating(false);
    setCurrentRepeat(1);
  };

  useEffect(() => {
    if (departure && !isPlaying && settings?.auto_announcement_enabled && !manualTrigger) {
      // Auto-play announcement when status changes to boarding
      if (departure.status === 'boarding') {
        playAnnouncement();
      }
    }
  }, [departure?.status, settings?.auto_announcement_enabled, manualTrigger]);

  useEffect(() => {
    if (manualTrigger && departure && !isPlaying) {
      playAnnouncement();
    }
  }, [manualTrigger]);

  if (!departure || settingsLoading) return null;

  return (
    <Card className="bg-accent/10 text-text-display p-6 border-2 border-accent animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isGenerating ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : isPlaying ? (
            <Volume2 className="w-6 h-6 animate-pulse text-primary" />
          ) : (
            <VolumeX className="w-6 h-6 text-muted-foreground" />
          )}
          <h3 className="text-lg font-semibold">
            {isGenerating ? 'Generating Audio...' : 
             isPlaying ? `Announcing (${currentRepeat}/${settings?.announcement_repeat_count || 3})` : 
             'Ready for Announcement'}
          </h3>
        </div>
        <div className="flex gap-2">
          {isPlaying && (
            <Button
              variant="destructive"
              size="sm"
              onClick={stopAnnouncement}
            >
              Stop
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={playAnnouncement}
            disabled={isPlaying || isGenerating || !settings?.voice_enabled}
          >
            {isPlaying || isGenerating ? 'Playing...' : 'Play Announcement'}
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-text-display mb-2">
            {departure.fleet_type} - {departure.destination}
          </h2>
          <p className="text-text-display/80">Departure: {departure.departure_time}</p>
        </div>
        
        {(isPlaying || isGenerating) && (
          <div className="bg-background/50 rounded-lg p-4 border">
            <div className="text-sm mb-2 font-semibold flex items-center justify-between">
              <span>
                {currentLanguage === 'english' && '🇺🇸 English'}
                {currentLanguage === 'khmer' && '🇰🇭 ខ្មែរ'}
                {currentLanguage === 'chinese' && '🇨🇳 中文'}
              </span>
              {isPlaying && (
                <span className="text-xs text-muted-foreground">
                  Repeat {currentRepeat} of {settings?.announcement_repeat_count || 3}
                </span>
              )}
            </div>
            <p className="text-text-display">
              {generateAnnouncementText(script[currentLanguage], departure)}
            </p>
          </div>
        )}
        
        {!settings?.voice_enabled && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive">
              Voice announcements are disabled. Enable them in operator settings.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}