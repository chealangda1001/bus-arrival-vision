import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { type Departure } from "@/hooks/useDepartures";

interface AnnouncementSystemProps {
  departure?: Departure;
  onComplete?: () => void;
}

interface AnnouncementScript {
  english: string;
  khmer: string;
  chinese: string;
}

const defaultScript: AnnouncementScript = {
  english: "Attention passengers, {fleet_type} service to {destination} will depart at {time}. Bus plate number {plate}. Please proceed to the boarding area.",
  khmer: "សូមអ្នកដំណើរ សេវាកម្ម {fleet_type} ទៅ {destination} នឹងចេញនៅម៉ោង {time}។ លេខផ្ទាំងឡាន {plate}។ សូមទៅកាន់តំបន់ឡើងឡាន។",
  chinese: "乘客请注意，{fleet_type}开往{destination}的班车将于{time}发车。车牌号{plate}。请前往候车区域。"
};

export default function AnnouncementSystem({ departure, onComplete }: AnnouncementSystemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'khmer' | 'chinese'>('english');
  const [script, setScript] = useState<AnnouncementScript>(defaultScript);

  const generateAnnouncement = (template: string, departure: Departure) => {
    let announcementText = template;
    
    if (departure.fleet_type) {
      announcementText = announcementText.replace('{fleet_type}', departure.fleet_type);
    }
    
    announcementText = announcementText.replace('{destination}', departure.destination);
    announcementText = announcementText.replace('{time}', departure.departure_time);
    announcementText = announcementText.replace('{plate}', departure.plate_number || '');
    
    return announcementText;
  };

  const playAnnouncement = async () => {
    if (!departure || isPlaying) return;
    
    setIsPlaying(true);
    
    // Simulate announcement in all three languages
    const languages: ('english' | 'khmer' | 'chinese')[] = ['english', 'khmer', 'chinese'];
    
    for (const lang of languages) {
      setCurrentLanguage(lang);
      const announcement = generateAnnouncement(script[lang], departure);
      
      // In a real implementation, you would use text-to-speech here
      console.log(`Announcing in ${lang}:`, announcement);
      
      // Simulate speaking time
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    setIsPlaying(false);
    onComplete?.();
  };

  useEffect(() => {
    if (departure && !isPlaying) {
      // Auto-play announcement
      playAnnouncement();
    }
  }, [departure]);

  if (!departure) return null;

  return (
    <Card className="bg-accent/10 text-text-display p-6 border-2 border-accent animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isPlaying ? (
            <Volume2 className="w-6 h-6 animate-pulse text-primary" />
          ) : (
            <VolumeX className="w-6 h-6 text-muted-foreground" />
          )}
          <h3 className="text-lg font-semibold">
            {isPlaying ? 'Now Announcing' : 'Announcement Complete'}
          </h3>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={playAnnouncement}
          disabled={isPlaying}
        >
          {isPlaying ? 'Playing...' : 'Replay'}
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-text-display mb-2">
            {departure.fleet_type} - {departure.destination}
          </h2>
          <p className="text-text-display/80">Departure: {departure.departure_time}</p>
        </div>
        
        {isPlaying && (
          <div className="bg-background/50 rounded-lg p-4 border">
            <div className="text-sm mb-2 font-semibold">
              {currentLanguage === 'english' && '🇺🇸 English'}
              {currentLanguage === 'khmer' && '🇰🇭 ខ្មែរ'}
              {currentLanguage === 'chinese' && '🇨🇳 中文'}
            </div>
            <p className="text-text-display">
              {generateAnnouncement(script[currentLanguage], departure)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}