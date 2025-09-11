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
  english: "Attention passengers, Route {route} to {destination} will depart at {time} from Gate {gate}. Bus plate number {plate}. Please proceed to the boarding area.",
  khmer: "សូមអ្នកដំណើរ ផ្លូវលេខ {route} ទៅ {destination} នឹងចេញនៅម៉ោង {time} នៅច្រកទី {gate}។ លេខផ្ទាំងឡាន {plate}។ សូមទៅកាន់តំបន់ឡើងឡាន។",
  chinese: "乘客请注意，{route}路开往{destination}的班车将于{time}从{gate}号门发车。车牌号{plate}。请前往候车区域。"
};

export default function AnnouncementSystem({ departure, onComplete }: AnnouncementSystemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'khmer' | 'chinese'>('english');
  const [script, setScript] = useState<AnnouncementScript>(defaultScript);

  const generateAnnouncement = (template: string, departure: Departure) => {
    return template
      .replace('{route}', departure.route_number)
      .replace('{destination}', departure.destination)
      .replace('{time}', departure.departure_time)
      .replace('{gate}', departure.gate)
      .replace('{plate}', departure.plate_number);
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
    <Card className="bg-announcement-bg text-announcement-text p-6 announcement-slide">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isPlaying ? (
            <Volume2 className="w-6 h-6 status-pulse" />
          ) : (
            <VolumeX className="w-6 h-6" />
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
        <div className="text-sm opacity-90">
          Route {departure.route_number} • {departure.destination} • Gate {departure.gate}
        </div>
        
        {isPlaying && (
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-sm mb-2 font-semibold">
              {currentLanguage === 'english' && '🇺🇸 English'}
              {currentLanguage === 'khmer' && '🇰🇭 ខ្មែរ'}
              {currentLanguage === 'chinese' && '🇨🇳 中文'}
            </div>
            <p className="text-announcement-text">
              {generateAnnouncement(script[currentLanguage], departure)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}