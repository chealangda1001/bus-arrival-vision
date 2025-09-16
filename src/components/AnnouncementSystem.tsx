import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { type Departure } from "@/hooks/useDepartures";
import { supabase } from "@/integrations/supabase/client";
import { useOperatorSettings } from "@/hooks/useOperatorSettings";
import { audioCache, AudioQueue, checkCacheStatus, generateScriptHash } from "@/utils/audioCache";
import { useToast } from "@/components/ui/use-toast";
import { 
  formatAnnouncementScript, 
  generateMultiSpeakerCacheKey,
  DEFAULT_STYLE_INSTRUCTIONS 
} from "@/utils/scriptParser";
import { formatTimeWithKhmerPeriods, formatTimeEnglish, formatTimeChinese } from "@/utils/timeFormatter";

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
  const [cacheStatus, setCacheStatus] = useState<{
    khmer: 'cached' | 'expired' | 'missing' | 'generating';
    english: 'cached' | 'expired' | 'missing' | 'generating';
    chinese: 'cached' | 'expired' | 'missing' | 'generating';
  }>({ khmer: 'missing', english: 'missing', chinese: 'missing' });
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  const { toast } = useToast();
  
  const { settings, loading: settingsLoading } = useOperatorSettings(operatorId);
  
  const script = settings?.announcement_scripts || {
    english: "Attention passengers, {fleet_type} service to {destination} will depart at {time}. Bus plate number {plate}. Please proceed to the boarding area.",
    khmer: "សូមអ្នកដំណើរ សេវាកម្ម {fleet_type} ទៅ {destination} នឹងចេញនៅម៉ោង {time}។ លេខផ្ទាំងឡាន {plate}។ សូមទៅកាន់តំបន់ឡើងឡាន។",
    chinese: "乘客请注意，{fleet_type}开往{destination}的班车将于{time}发车。车牌号{plate}。请前往候车区域。"
  };

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
    announcementText = announcementText.replace(/{break_duration}/g, departure.break_duration || 'N/A');
    
    // Replace operator name from settings
    announcementText = announcementText.replace(/{operator_name}/g, settings?.operator_name || 'BookMeBus');
    
    console.log(`Generated ${language} announcement text: "${announcementText}"`);
    return announcementText;
  };

  // Check cache status for all languages
  const checkAllCacheStatus = async () => {
    if (!departure || !operatorId) return;

    const scriptHash = generateScriptHash(script);
    const khmerText = generateAnnouncementText(script.khmer, departure, 'khmer');
    const englishText = generateAnnouncementText(script.english, departure, 'english');
    const chineseText = generateAnnouncementText(script.chinese, departure, 'chinese');

    const khmerCacheKey = `gemini_khmer_${operatorId}_${btoa(unescape(encodeURIComponent(khmerText)))}_${scriptHash}`;
    const englishCacheKey = `english_direct_${operatorId}_${btoa(unescape(encodeURIComponent(englishText)))}_${scriptHash}`;
    const chineseCacheKey = `chinese_direct_${operatorId}_${btoa(unescape(encodeURIComponent(chineseText)))}_${scriptHash}`;

    const [khmerStatus, englishStatus, chineseStatus] = await Promise.all([
      checkCacheStatus(khmerCacheKey),
      checkCacheStatus(englishCacheKey),
      checkCacheStatus(chineseCacheKey)
    ]);

    setCacheStatus({
      khmer: khmerStatus,
      english: englishStatus,
      chinese: chineseStatus
    });

    console.log('Cache status check:', { khmerStatus, englishStatus, chineseStatus });
  };

  // Generate Khmer TTS using Gemini 2.5 Pro with native Unicode support
  const generateDirectKhmerTTS = async (khmerText: string, forceRefresh = false) => {
    try {
      const scriptHash = generateScriptHash(script);
      const cacheKey = `gemini_khmer_${operatorId}_${btoa(unescape(encodeURIComponent(khmerText)))}_${scriptHash}`;
      
      console.log('🎵 Khmer TTS - Cache Key:', cacheKey);
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        setCacheStatus(prev => ({ ...prev, khmer: 'generating' }));
        const cachedAudio = await audioCache.get(cacheKey);
        if (cachedAudio) {
          console.log("✅ Using cached Gemini Khmer audio");
          setCacheStatus(prev => ({ ...prev, khmer: 'cached' }));
          return cachedAudio;
        }
        console.log("🔄 No cached Khmer audio found, generating new...");
      } else {
        console.log("🔄 Force refresh: Generating new Khmer TTS...");
        setCacheStatus(prev => ({ ...prev, khmer: 'generating' }));
      }

      console.log("Generating Khmer TTS with Gemini 2.5 Pro TTS and Zephyr voice...");
      console.log("Full Khmer text:", khmerText);
      console.log("Khmer text length:", khmerText.length);
      
      // Call the Gemini Khmer TTS function
      const { data, error } = await supabase.functions.invoke('gemini-khmer-tts', {
        body: { 
          text: khmerText,
          operatorId,
          cacheKey
        }
      });

      if (error) {
        console.error("Error generating Gemini Khmer TTS:", error);
        throw error;
      }

      if (data?.audioContent) {
        // Cache the generated audio (expires in 24 hours)
        await audioCache.set(cacheKey, data.audioContent, 24);
        setCacheStatus(prev => ({ ...prev, khmer: 'cached' }));
        console.log(`✅ Generated Khmer TTS using ${data.voice || 'Zephyr'} voice (${data.method || 'gemini_khmer_tts'})`);
        console.log('💾 Cached new Khmer audio');
        return data.audioContent;
      }

      throw new Error("No audio content received from Gemini Khmer TTS");
    } catch (error) {
      console.error("Error in generateDirectKhmerTTS:", error);
      setCacheStatus(prev => ({ ...prev, khmer: 'missing' }));
      throw error;
    }
  };

  // Generate direct TTS for other languages
  const generateDirectTTS = async (text: string, language: 'english' | 'chinese', forceRefresh = false) => {
    try {
      const scriptHash = generateScriptHash(script);
      const cacheKey = `${language}_direct_${operatorId}_${btoa(unescape(encodeURIComponent(text)))}_${scriptHash}`;
      
      console.log(`🎵 ${language.toUpperCase()} TTS - Cache Key:`, cacheKey);
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        setCacheStatus(prev => ({ ...prev, [language]: 'generating' }));
        const cachedAudio = await audioCache.get(cacheKey);
        if (cachedAudio) {
          console.log(`✅ Using cached direct ${language} audio`);
          setCacheStatus(prev => ({ ...prev, [language]: 'cached' }));
          return cachedAudio;
        }
        console.log(`🔄 No cached ${language} audio found, generating new...`);
      } else {
        console.log(`🔄 Force refresh: Generating new ${language} TTS...`);
        setCacheStatus(prev => ({ ...prev, [language]: 'generating' }));
      }

      console.log(`Generating direct ${language} TTS...`);
      
      // Use existing multi-speaker function but with single language
      const singleLanguageScript = `[Voice: ${language === 'english' ? 'Kore' : 'Luna'}] ${text}`;
      
      const { data, error } = await supabase.functions.invoke('gemini-multispeaker-tts', {
        body: { 
          script: singleLanguageScript,
          operatorId,
          speechRate: language === 'english' ? 
            (settings?.voice_settings?.english?.speed || 1.0) : 
            (settings?.voice_settings?.chinese?.speed || 0.9),
          pitchAdjustment: language === 'english' ? 
            (settings?.voice_settings?.english?.pitch || 0) : 
            (settings?.voice_settings?.chinese?.pitch || 0)
        }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error(`No audio content received for ${language}`);

      await audioCache.set(cacheKey, data.audioContent, 24);
      setCacheStatus(prev => ({ ...prev, [language]: 'cached' }));
      console.log(`✅ Generated ${language} TTS successfully`);
      console.log(`💾 Cached new ${language} audio`);
      return data.audioContent;
    } catch (error) {
      console.error(`Error in generateDirectTTS for ${language}:`, error);
      setCacheStatus(prev => ({ ...prev, [language]: 'missing' }));
      throw error;
    }
  };

  const playAnnouncement = async () => {
    if (!departure || isPlaying || !settings?.voice_enabled || !operatorId) return;
    
    try {
      setIsPlaying(true);
      setIsGenerating(true);
      
      const repeatCount = settings.announcement_repeat_count || 3;
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

      // Use sequential direct TTS for each language with native Khmer support
      console.log("Using sequential direct TTS: Khmer (native) -> English -> Chinese");
      setIsGenerating(false);
      
      for (let repeat = 1; repeat <= repeatCount; repeat++) {
        setCurrentRepeat(repeat);
        
        // Play Khmer first using native Google Cloud TTS (use cache if available)
        setCurrentLanguage('khmer');
        console.log('🎯 Playing Khmer announcement...');
        const khmerAudio = await generateDirectKhmerTTS(khmerText, false);
        await audioQueueRef.current.addToQueue(khmerAudio);
        while (audioQueueRef.current.playing) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Pause between languages
        
        // Play English second (use cache if available)
        setCurrentLanguage('english');
        console.log('🎯 Playing English announcement...');
        const englishAudio = await generateDirectTTS(englishText, 'english', false);
        await audioQueueRef.current.addToQueue(englishAudio);
        while (audioQueueRef.current.playing) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Pause between languages
        
        // Play Chinese third (use cache if available)
        setCurrentLanguage('chinese');
        console.log('🎯 Playing Chinese announcement...');
        const chineseAudio = await generateDirectTTS(chineseText, 'chinese', false);
        await audioQueueRef.current.addToQueue(chineseAudio);
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

  const clearSpecificCache = async () => {
    if (!departure || !operatorId) return;
    
    const scriptHash = generateScriptHash(script);
    const khmerText = generateAnnouncementText(script.khmer, departure, 'khmer');
    const englishText = generateAnnouncementText(script.english, departure, 'english');
    const chineseText = generateAnnouncementText(script.chinese, departure, 'chinese');
    
    // Clear cache for all languages for this departure
    const khmerKey = `gemini_khmer_${operatorId}_${btoa(unescape(encodeURIComponent(khmerText)))}_${scriptHash}`;
    const englishKey = `english_direct_${operatorId}_${btoa(unescape(encodeURIComponent(englishText)))}_${scriptHash}`;
    const chineseKey = `chinese_direct_${operatorId}_${btoa(unescape(encodeURIComponent(chineseText)))}_${scriptHash}`;
    
    await Promise.all([
      audioCache.delete(khmerKey),
      audioCache.delete(englishKey),
      audioCache.delete(chineseKey)
    ]);
    
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
    
    // Play announcement with force refresh
    const khmerText = generateAnnouncementText(script.khmer, departure, 'khmer');
    const englishText = generateAnnouncementText(script.english, departure, 'english');
    const chineseText = generateAnnouncementText(script.chinese, departure, 'chinese');
    
    try {
      setIsPlaying(true);
      setIsGenerating(true);

      // Force regenerate all languages
      console.log('🔄 Force regenerating Khmer...');
      const khmerAudio = await generateDirectKhmerTTS(khmerText, true);
      
      console.log('🔄 Force regenerating English...');
      const englishAudio = await generateDirectTTS(englishText, 'english', true);
      
      console.log('🔄 Force regenerating Chinese...');
      const chineseAudio = await generateDirectTTS(chineseText, 'chinese', true);

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
        <div className="flex justify-center gap-3 mb-4">
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
                  Repeat {currentRepeat} of {settings?.announcement_repeat_count || 3}
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