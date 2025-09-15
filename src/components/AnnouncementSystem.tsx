import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { type Departure } from "@/hooks/useDepartures";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorSettings } from "@/hooks/useOperatorSettings";
import { audioCache, AudioQueue } from "@/utils/audioCache";
import { useToast } from "@/components/ui/use-toast";
import { 
  formatAnnouncementScript, 
  generateMultiSpeakerCacheKey,
  DEFAULT_STYLE_INSTRUCTIONS 
} from "@/utils/scriptParser";

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
  const [currentLanguage, setCurrentLanguage] = useState<'multi' | 'english' | 'khmer' | 'chinese'>('multi');
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
    
    console.log(`Generating announcement text from template: "${template}"`);
    
    // Replace all departure-related parameters
    announcementText = announcementText.replace(/{fleet_type}/g, departure.fleet_type || 'Bus');
    announcementText = announcementText.replace(/{destination}/g, departure.destination);
    announcementText = announcementText.replace(/{time}/g, departure.departure_time);
    announcementText = announcementText.replace(/{plate}/g, departure.plate_number || '');
    announcementText = announcementText.replace(/{fleet_plate_number}/g, departure.plate_number || '');
    announcementText = announcementText.replace(/{trip_duration}/g, departure.trip_duration || 'N/A');
    announcementText = announcementText.replace(/{break_duration}/g, departure.break_duration || 'N/A');
    
    // Replace operator name from settings
    announcementText = announcementText.replace(/{operator_name}/g, settings?.operator_name || 'BookMeBus');
    
    console.log(`Generated announcement text: "${announcementText}"`);
    return announcementText;
  };

  const generateMultiSpeakerAudio = async (khmerText: string, englishText: string, chineseText: string, forceRefresh = false) => {
    try {
      const script = formatAnnouncementScript(khmerText, englishText, chineseText);
      const cacheKey = generateMultiSpeakerCacheKey(
        script,
        settings?.voice_settings?.khmer?.speed || 0.9,
        settings?.voice_settings?.khmer?.pitch || 0,
        settings?.temperature || 0.7,
        settings?.style_instructions || DEFAULT_STYLE_INSTRUCTIONS,
        operatorId
      );
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedAudio = await audioCache.get(cacheKey);
        if (cachedAudio) {
          console.log("Using cached multi-speaker audio");
          return cachedAudio;
        }
      }

      console.log("Generating new multi-speaker audio with Google Cloud TTS...");
      console.log("Full Khmer script:", khmerText);
      console.log("Full English script:", englishText);
      console.log("Full Chinese script:", chineseText);
      console.log("Complete formatted script:", script);
      
      // Call the new Gemini multi-speaker TTS function
      const { data, error } = await supabase.functions.invoke('gemini-multispeaker-tts', {
        body: { 
          script,
          operatorId,
          speechRate: settings?.voice_settings?.khmer?.speed || 0.9,
          pitchAdjustment: settings?.voice_settings?.khmer?.pitch || 0,
          temperature: settings?.temperature || 0.7,
          styleInstructions: settings?.style_instructions || DEFAULT_STYLE_INSTRUCTIONS
        }
      });

      if (error) {
        console.error("Error generating multi-speaker audio:", error);
        throw error;
      }

      if (data?.audioContent) {
        // Cache the generated audio (expires in 24 hours)
        await audioCache.set(cacheKey, data.audioContent, 24);
        console.log(`Generated fresh audio with ${data.segments} segments using Google Cloud TTS voices: ${data.voices?.join(', ')}`);
        return data.audioContent;
      }

      throw new Error("No audio content received from Google Cloud TTS");
    } catch (error) {
      console.error("Error in generateMultiSpeakerAudio:", error);
      throw error;
    }
  };

  const playAnnouncement = async () => {
    if (!departure || isPlaying || !settings?.voice_enabled || !operatorId) return;
    
    try {
      setIsPlaying(true);
      setIsGenerating(true);
      
      const repeatCount = settings.announcement_repeat_count || 3;
      const khmerText = generateAnnouncementText(script.khmer, departure);
      const englishText = generateAnnouncementText(script.english, departure);
      const chineseText = generateAnnouncementText(script.chinese, departure);
      
      console.log("Generated texts:", { khmerText, englishText, chineseText });

      // Check for uploaded MP3 files first
      const hasUploadedKhmer = departure.khmer_audio_url && typeof departure.khmer_audio_url === 'string';
      const hasUploadedEnglish = departure.english_audio_url && typeof departure.english_audio_url === 'string';
      const hasUploadedChinese = departure.chinese_audio_url && typeof departure.chinese_audio_url === 'string';
      
      // Play in sequence: Khmer, English, Chinese
      const playUploadedAudio = async (audioUrl: string, language: 'khmer' | 'english' | 'chinese') => {
        setCurrentLanguage(language);
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte), ''
          )
        );
        await audioQueueRef.current.addToQueue(base64);
        while (audioQueueRef.current.playing) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Small pause between languages
        await new Promise(resolve => setTimeout(resolve, 500));
      };
      
      if (hasUploadedKhmer || hasUploadedEnglish || hasUploadedChinese) {
        console.log("Using uploaded MP3 files in sequence: Khmer -> English -> Chinese");
        setIsGenerating(false);
        
        for (let repeat = 1; repeat <= repeatCount; repeat++) {
          setCurrentRepeat(repeat);
          
          // Play in sequence: Khmer, English, Chinese
          if (hasUploadedKhmer) {
            await playUploadedAudio(departure.khmer_audio_url!, 'khmer');
          }
          
          if (hasUploadedEnglish) {
            await playUploadedAudio(departure.english_audio_url!, 'english');
          }
          
          if (hasUploadedChinese) {
            await playUploadedAudio(departure.chinese_audio_url!, 'chinese');
          }
          
          if (repeat < repeatCount) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        return;
      }

      // Use multi-speaker Gemini TTS for AI-generated announcements
      setCurrentLanguage('multi');
      // Force refresh for fresh generation from Google Cloud TTS
      const audioData = await generateMultiSpeakerAudio(khmerText, englishText, chineseText, true);
      setIsGenerating(false);
      
      // Play multi-speaker announcement for specified repeat count
      for (let repeat = 1; repeat <= repeatCount; repeat++) {
        setCurrentRepeat(repeat);
        await audioQueueRef.current.addToQueue(audioData);
        
        // Wait for current audio to finish
        while (audioQueueRef.current.playing) {
          await new Promise(resolve => setTimeout(resolve, 100));
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
      // Disable auto-play when status is boarding - only auto-play for other statuses
      if (departure.status !== 'boarding') {
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
        {/* Audio Source Indicators */}
        <div className="flex justify-center gap-3 mb-4">
          {(['khmer', 'english', 'chinese'] as const).map((lang) => {
            const audioUrlKey = `${lang}_audio_url` as keyof typeof departure;
            const hasCustomAudio = departure[audioUrlKey];
            return (
              <div key={lang} className="text-center">
                <div className={`px-2 py-1 rounded text-xs ${
                  hasCustomAudio ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {lang === 'khmer' ? 'KHMER (1st)' :
                   lang === 'english' ? 'ENGLISH (2nd)' : 'CHINESE (3rd)'}
                </div>
                <div className="text-xs text-text-display/60 mt-1">
                  {hasCustomAudio ? 'Custom MP3' : 'AI TTS'}
                </div>
              </div>
            );
          })}
        </div>
        
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
                {currentLanguage === 'multi' && '🎭 Multi-Speaker (Zephyr + Kore + Luna)'}
                {currentLanguage === 'english' && '🇺🇸 English (Kore)'}
                {currentLanguage === 'khmer' && '🇰🇭 ខ្មែរ (Zephyr)'}
                {currentLanguage === 'chinese' && '🇨🇳 中文 (Luna)'}
              </span>
              {isPlaying && (
                <span className="text-xs text-muted-foreground">
                  Repeat {currentRepeat} of {settings?.announcement_repeat_count || 3}
                </span>
              )}
            </div>
            {currentLanguage === 'multi' ? (
              <div className="space-y-2">
                <div className="text-text-display">
                  <span className="text-xs text-primary font-medium">[Zephyr - Khmer]</span><br />
                  {generateAnnouncementText(script.khmer, departure)}
                </div>
                <div className="text-text-display">
                  <span className="text-xs text-primary font-medium">[Kore - English]</span><br />
                  {generateAnnouncementText(script.english, departure)}
                </div>
                <div className="text-text-display">
                  <span className="text-xs text-primary font-medium">[Luna - Chinese]</span><br />
                  {generateAnnouncementText(script.chinese, departure)}
                </div>
              </div>
            ) : (
              <p className="text-text-display">
                {currentLanguage === 'khmer' && generateAnnouncementText(script.khmer, departure)}
                {currentLanguage === 'english' && generateAnnouncementText(script.english, departure)}
                {currentLanguage === 'chinese' && generateAnnouncementText(script.chinese, departure)}
              </p>
            )}
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