import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { type Departure } from "@/hooks/useDepartures";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorSettings } from "@/hooks/useOperatorSettings";
import { useAnnouncementTypes } from "@/hooks/useAnnouncementTypes";
import { useSystemTtsSettings } from "@/hooks/useSystemTtsSettings";
import { audioCache, AudioQueue, checkCacheStatus, generateScriptHash } from "@/utils/audioCache";
import {
  splitTemplate,
  areSegmentsCached,
  resolveSegmentsAudio,
  clearSegments,
  type SegmentVoiceContext,
} from "@/utils/announcementSegments";
import { useToast } from "@/components/ui/use-toast";
import { 
  formatAnnouncementScript, 
  generateMultiSpeakerCacheKey,
  DEFAULT_STYLE_INSTRUCTIONS 
} from "@/utils/scriptParser";
import { formatTimeWithKhmerPeriods, formatTimeEnglish, formatTimeChinese } from "@/utils/timeFormatter";
import { logTtsEvent } from "@/utils/ttsLogger";

interface AnnouncementSystemProps {
  departure?: Departure;
  operatorId?: string;
  onComplete?: () => void;
  manualTrigger?: boolean;
  announcementTypeKey?: string; // defaults to 'departure'
  breakDurationOverride?: number; // override {break_duration} placeholder
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
  manualTrigger = false,
  announcementTypeKey = 'departure',
  breakDurationOverride
}: AnnouncementSystemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'multi' | 'english' | 'khmer' | 'chinese'>('multi');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [cacheStatus, setCacheStatus] = useState<{
    khmer: 'cached' | 'expired' | 'missing' | 'generating';
    english: 'cached' | 'expired' | 'missing' | 'generating';
    chinese: 'cached' | 'expired' | 'missing' | 'generating';
  }>({ khmer: 'missing', english: 'missing', chinese: 'missing' });
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  const { toast } = useToast();

  // Attribution passed to the TTS log so every call can be traced to a trip.
  const logContext = () => ({
    operatorId,
    branchId: (departure as any)?.branch_id ?? null,
    departureId: departure?.id ?? null,
    destination: departure?.destination ?? null,
    plateNumber: departure?.plate_number ?? null,
    departureTime: departure?.departure_time ?? null,
    announcementType: announcementTypeKey,
  });
  
  const { settings, loading: settingsLoading } = useOperatorSettings(operatorId);
  const { types: announcementTypes, loading: typesLoading } = useAnnouncementTypes(operatorId); // eslint-disable-line
  const { settings: ttsSettings } = useSystemTtsSettings();
  
  // Find the matching announcement type config
  const announcementTypeConfig = announcementTypes.find(t => t.type_key === announcementTypeKey);
  
  // Per-language fallback: use type-specific script when non-empty, else operator
  // settings, else built-in default. Prevents a blank field (e.g. Chinese) from
  // silently disabling that language.
  const DEFAULT_SCRIPTS = {
    english: "Attention passengers, {fleet_type} service to {destination} will depart at {time}. Bus plate number {plate}. Please proceed to the boarding area.",
    khmer: "សូមអ្នកដំណើរ សេវាកម្ម {fleet_type} ទៅ {destination} នឹងចេញនៅម៉ោង {time}។ លេខផ្ទាំងឡាន {plate}។ សូមទៅកាន់តំបន់ឡើងឡាន។",
    chinese: "乘客请注意，{fleet_type}开往{destination}的班车将于{time}发车。车牌号{plate}。请前往候车区域。"
  };
  const pickScript = (lang: 'english' | 'khmer' | 'chinese') =>
    announcementTypeConfig?.announcement_scripts?.[lang]?.trim() ||
    settings?.announcement_scripts?.[lang]?.trim() ||
    DEFAULT_SCRIPTS[lang];
  const script = {
    english: pickScript('english'),
    khmer: pickScript('khmer'),
    chinese: pickScript('chinese'),
  };


  // Use type-specific repeat count if available
  const repeatCount = announcementTypeConfig?.repeat_count || settings?.announcement_repeat_count || 3;

  const generateAnnouncementText = (template: string, departure: Departure, language: 'english' | 'khmer' | 'chinese') => {
    let announcementText = template;
    
    console.log(`Generating ${language} announcement text from template: "${template}"`);
    
    // Format time based on language
    let formattedTime = departure.departure_time;
    let formattedDepartureTime = departure.departure_time;
    
    if (language === 'khmer') {
      formattedTime = formatTimeWithKhmerPeriods(departure.departure_time);
      formattedDepartureTime = formatTimeWithKhmerPeriods(departure.departure_time);
    } else if (language === 'english') {
      formattedTime = formatTimeEnglish(departure.departure_time);
      formattedDepartureTime = formatTimeEnglish(departure.departure_time);
    } else if (language === 'chinese') {
      formattedTime = formatTimeChinese(departure.departure_time);
      formattedDepartureTime = formatTimeChinese(departure.departure_time);
    }
    
    // Replace all departure-related parameters
    announcementText = announcementText.replace(/{fleet_type}/g, departure.fleet_type || 'Bus');
    announcementText = announcementText.replace(/{destination}/g, departure.destination);
    announcementText = announcementText.replace(/{time}/g, formattedTime);
    announcementText = announcementText.replace(/{departure_time}/g, formattedDepartureTime);
    announcementText = announcementText.replace(/{plate}/g, departure.plate_number || '');
    announcementText = announcementText.replace(/{fleet_plate_number}/g, departure.plate_number || '');
    announcementText = announcementText.replace(/{leaving_from}/g, departure.leaving_from || 'Terminal');
    announcementText = announcementText.replace(/{trip_duration}/g, departure.trip_duration || 'N/A');
    // Use breakDurationOverride (from announcement type's default_break_duration) if provided
    const breakDuration = breakDurationOverride?.toString() || departure.break_duration || 'N/A';
    announcementText = announcementText.replace(/{break_duration}/g, breakDuration);
    
    // Replace operator name from settings
    announcementText = announcementText.replace(/{operator_name}/g, settings?.operator_name || 'BookMeBus');
    
    console.log(`Generated ${language} announcement text: "${announcementText}"`);
    return announcementText;
  };

  // Values that change per trip. Each becomes its own tiny reusable audio clip.
  const placeholderValues = (departure: Departure, language: 'english' | 'khmer' | 'chinese') => {
    const formattedTime =
      language === 'khmer' ? formatTimeWithKhmerPeriods(departure.departure_time)
      : language === 'english' ? formatTimeEnglish(departure.departure_time)
      : formatTimeChinese(departure.departure_time);

    return {
      fleet_type: departure.fleet_type || 'Bus',
      destination: departure.destination,
      time: formattedTime,
      departure_time: formattedTime,
      plate: departure.plate_number || '',
      fleet_plate_number: departure.plate_number || '',
      leaving_from: departure.leaving_from || 'Terminal',
      trip_duration: departure.trip_duration || 'N/A',
      break_duration: breakDurationOverride?.toString() || departure.break_duration || 'N/A',
      operator_name: settings?.operator_name || 'BookMeBus',
    } as Record<string, string>;
  };

  // Voice settings that identify a fragment's audio (change these -> new recording).
  const voiceCtx = (language: 'english' | 'khmer' | 'chinese'): SegmentVoiceContext => {
    if (language === 'khmer') {
      const useKiriTTS = ttsSettings?.khmer_provider === 'kiritts';
      return {
        language: 'khmer',
        provider: useKiriTTS ? 'kiritts' : 'gemini',
        voice: useKiriTTS ? (ttsSettings?.kiritts_khmer_voice || 'Kiri') : 'Zephyr',
        speed: useKiriTTS ? Number(ttsSettings?.kiritts_khmer_speed ?? 0.9) : 1.0,
      };
    }
    return {
      language,
      provider: 'google_multispeaker',
      voice: language === 'english' ? 'Kore' : 'Luna',
      speed: language === 'english'
        ? (settings?.voice_settings?.english?.speed || 1.0)
        : (settings?.voice_settings?.chinese?.speed || 0.9),
    };
  };

  const segmentsFor = (language: 'english' | 'khmer' | 'chinese') => {
    if (!departure) return [];
    return splitTemplate(script[language], placeholderValues(departure, language));
  };

  // Check cache status for all languages (skip empty templates)
  const checkAllCacheStatus = async () => {
    if (!departure || !operatorId) return;

    const langs = ['khmer', 'english', 'chinese'] as const;
    const results = await Promise.all(
      langs.map(async (lang) => {
        const segments = segmentsFor(lang);
        if (segments.length === 0) return 'missing' as const;
        const cached = await areSegmentsCached(segments, voiceCtx(lang));
        return cached ? ('cached' as const) : ('missing' as const);
      })
    );

    setCacheStatus({ khmer: results[0], english: results[1], chinese: results[2] });
    console.log('Cache status check (segmented):', { khmer: results[0], english: results[1], chinese: results[2] });
  };

  /**
   * Build the playable clips for one language.
   * The announcement is stitched from cached fragments; only wording that has
   * never been spoken before reaches the TTS provider.
   */
  const generateLanguageAudio = async (
    language: 'english' | 'khmer' | 'chinese',
    forceRefresh = false
  ): Promise<string[]> => {
    if (!departure || !operatorId) return [];
    const segments = segmentsFor(language);
    if (segments.length === 0) return [];

    setCacheStatus(prev => ({ ...prev, [language]: 'generating' }));

    try {
      const clips = await resolveSegmentsAudio(
        segments,
        {
          operatorId,
          ctx: voiceCtx(language),
          logContext: logContext(),
          scriptHash: generateScriptHash(script),
        },
        forceRefresh
      );
      setCacheStatus(prev => ({ ...prev, [language]: 'cached' }));
      return clips;
    } catch (error) {
      setCacheStatus(prev => ({ ...prev, [language]: 'missing' }));
      console.error(`Error generating ${language} announcement audio:`, error);
      throw error;
    }
  };


  const playAnnouncement = async () => {
    if (!departure || isPlaying || !settings?.voice_enabled || !operatorId) return;
    
    try {
      setIsPlaying(true);
      setIsGenerating(true);
      
      const announceRepeatCount = repeatCount;
      const khmerText = generateAnnouncementText(script.khmer, departure, 'khmer');
      const englishText = generateAnnouncementText(script.english, departure, 'english');
      const chineseText = generateAnnouncementText(script.chinese, departure, 'chinese');
      
      console.log("Generated texts:", { khmerText, englishText, chineseText });

      // Check for uploaded MP3 files first
      const hasUploadedKhmer = departure.khmer_audio_url && typeof departure.khmer_audio_url === 'string';
      const hasUploadedEnglish = departure.english_audio_url && typeof departure.english_audio_url === 'string';
      const hasUploadedChinese = departure.chinese_audio_url && typeof departure.chinese_audio_url === 'string';
      
      // Play in sequence: Khmer, English, Chinese
      const playUploadedAudio = async (audioUrl: string, language: 'khmer' | 'english' | 'chinese') => {
        setCurrentLanguage(language);
        // Play the uploaded file straight from its URL (browser caches it; no base64 round-trip).
        await audioQueueRef.current.addUrlToQueue(audioUrl);
        while (audioQueueRef.current.playing) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Small pause between languages
        await new Promise(resolve => setTimeout(resolve, 500));
      };
      
      if (hasUploadedKhmer || hasUploadedEnglish || hasUploadedChinese) {
        console.log("Using uploaded MP3 files in sequence: Khmer -> English -> Chinese");
        setIsGenerating(false);
        
        for (let repeat = 1; repeat <= announceRepeatCount; repeat++) {
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
          
          if (repeat < announceRepeatCount) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        return;
      }

      // Use sequential direct TTS for each language with native Khmer support
      console.log("Using sequential direct TTS: Khmer (native) -> English -> Chinese");
      setIsGenerating(false);
      
      for (let repeat = 1; repeat <= announceRepeatCount; repeat++) {
        setCurrentRepeat(repeat);

        for (const lang of ['khmer', 'english', 'chinese'] as const) {
          const text = lang === 'khmer' ? khmerText : lang === 'english' ? englishText : chineseText;
          if (!text.trim()) {
            console.log(`⏭️ Skipping ${lang} - empty template`);
            continue;
          }

          setCurrentLanguage(lang);
          const clips = await generateLanguageAudio(lang, false);
          if (clips.length === 0) continue;

          await audioQueueRef.current.addManyToQueue(clips);
          while (audioQueueRef.current.playing) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          if (lang !== 'chinese') {
            await new Promise(resolve => setTimeout(resolve, 500)); // Pause between languages
          }
        }

        // Pause between repeats (except after the last one)
        if (repeat < announceRepeatCount) {
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

  const clearSpecificCache = async () => {
    if (!departure || !operatorId) return;

    for (const lang of ['khmer', 'english', 'chinese'] as const) {
      await clearSegments(segmentsFor(lang), voiceCtx(lang));
    }

    console.log('🗑️ Cleared cache for current departure');
    toast({
      title: "Cache Cleared",
      description: "Audio cache cleared for this departure.",
    });
    checkAllCacheStatus(); // Refresh cache status
  };

  const forceRegenerate = async () => {
    if (!departure || !operatorId || isPlaying) return;

    console.log('🔄 Force regenerating all audio...');
    await clearSpecificCache();

    try {
      setIsPlaying(true);
      setIsGenerating(true);

      for (const lang of ['khmer', 'english', 'chinese'] as const) {
        if (segmentsFor(lang).length === 0) {
          console.log(`⏭️ Skipping ${lang} regeneration - empty template`);
          continue;
        }
        console.log(`🔄 Force regenerating ${lang}...`);
        await generateLanguageAudio(lang, true);
      }

      console.log('✅ Force regeneration complete');
      toast({
        title: "Audio Regenerated",
        description: "All audio files have been regenerated successfully.",
      });


      console.log('✅ Force regeneration complete');
      toast({
        title: "Audio Regenerated",
        description: "All audio files have been regenerated successfully.",
      });
    } catch (error) {
      console.error('❌ Error during force regeneration:', error);
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlaying(false);
      setIsGenerating(false);
    }
  };

  // Check cache status when departure or settings change
  useEffect(() => {
    if (departure && operatorId && script) {
      checkAllCacheStatus();
    }
  }, [departure, operatorId, script]);

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

  if (!departure || settingsLoading || typesLoading) return null;

  return (
    <Card className="bg-accent/10 text-text-display p-4 sm:p-6 border-2 border-accent animate-fade-in">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <Loader2 className="w-5 h-5 shrink-0 animate-spin text-primary" />
          ) : isPlaying ? (
            <Volume2 className="w-5 h-5 shrink-0 animate-pulse text-primary" />
          ) : (
            <VolumeX className="w-5 h-5 shrink-0 text-muted-foreground" />
          )}
          <h3 className="text-sm sm:text-lg font-semibold leading-tight">
            {isGenerating ? 'Generating Audio...' : 
             isPlaying ? `Announcing (${currentRepeat}/${repeatCount})` : 
             `Ready for ${announcementTypeKey === 'departure' ? 'Departure' : announcementTypeConfig?.type_name || 'Announcement'}`}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
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
            variant="ghost"
            size="sm"
            onClick={clearSpecificCache}
            disabled={isPlaying || isGenerating}
            title="Clear cache for this departure"
          >
            🗑️ Clear Cache
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={forceRegenerate}
            disabled={isPlaying || isGenerating || !settings?.voice_enabled}
            title="Force regenerate all audio"
          >
            🔄 Regenerate
          </Button>
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
        {/* Audio Source Indicators with Cache Status */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4">
          {(['khmer', 'english', 'chinese'] as const).map((lang) => {
            const audioUrlKey = `${lang}_audio_url` as keyof typeof departure;
            const hasCustomAudio = departure[audioUrlKey];
            const langCacheStatus = cacheStatus[lang];
            
            const getCacheIcon = () => {
              if (hasCustomAudio) return null; // No cache for uploaded files
              switch (langCacheStatus) {
                case 'cached': return <CheckCircle className="w-3 h-3 text-green-600" />;
                case 'generating': return <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />;
                case 'missing': 
                case 'expired': 
                default: return <XCircle className="w-3 h-3 text-gray-400" />;
              }
            };

            const getCacheColor = () => {
              if (hasCustomAudio) return 'bg-green-100 text-green-800';
              switch (langCacheStatus) {
                case 'cached': return 'bg-purple-100 text-purple-800';
                case 'generating': return 'bg-blue-100 text-blue-800';
                default: return 'bg-gray-100 text-gray-600';
              }
            };

            return (
              <div key={lang} className="text-center">
                <div className={`px-2 py-1 rounded text-xs flex items-center justify-center gap-1 ${getCacheColor()}`}>
                  {getCacheIcon()}
                  {lang === 'khmer' ? 'KHMER (1st)' :
                   lang === 'english' ? 'ENGLISH (2nd)' : 'CHINESE (3rd)'}
                </div>
                <div className="text-xs text-text-display/60 mt-1">
                  {hasCustomAudio ? 'Custom MP3' : 
                   langCacheStatus === 'cached' ? '✅ Cached' :
                   langCacheStatus === 'generating' ? '🔄 Generating' :
                   '❌ Not Cached'}
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
                  Repeat {currentRepeat} of {repeatCount}
                </span>
              )}
            </div>
            {currentLanguage === 'multi' ? (
              <div className="space-y-2">
                <div className="text-text-display">
                  <span className="text-xs text-primary font-medium">[Zephyr - Khmer]</span><br />
                  {generateAnnouncementText(script.khmer, departure, 'khmer')}
                </div>
                <div className="text-text-display">
                  <span className="text-xs text-primary font-medium">[Kore - English]</span><br />
                  {generateAnnouncementText(script.english, departure, 'english')}
                </div>
                <div className="text-text-display">
                  <span className="text-xs text-primary font-medium">[Luna - Chinese]</span><br />
                  {generateAnnouncementText(script.chinese, departure, 'chinese')}
                </div>
              </div>
            ) : (
              <p className="text-text-display">
                {currentLanguage === 'khmer' && generateAnnouncementText(script.khmer, departure, 'khmer')}
                {currentLanguage === 'english' && generateAnnouncementText(script.english, departure, 'english')}
                {currentLanguage === 'chinese' && generateAnnouncementText(script.chinese, departure, 'chinese')}
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