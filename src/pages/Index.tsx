import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import DepartureBoard from "@/components/DepartureBoard";
import AnnouncementSystem from "@/components/AnnouncementSystem";
import { type Departure } from "@/hooks/useDepartures";

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Departure | undefined>();
  const [language, setLanguage] = useState<"en" | "km">("en");

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAnnouncement = (departure: Departure) => {
    setCurrentAnnouncement(departure);
  };

  const handleAnnouncementComplete = () => {
    setCurrentAnnouncement(undefined);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "km" : "en");
  };

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Language Switcher */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-dashboard-surface border-dashboard-border text-text-primary hover:bg-dashboard-accent"
          >
            <Languages className="w-4 h-4" />
            {language === "en" ? "ខ្មែរ" : "English"}
          </Button>
        </div>

        {/* Announcement Banner */}
        {currentAnnouncement && (
          <AnnouncementSystem 
            departure={currentAnnouncement}
            onComplete={handleAnnouncementComplete}
          />
        )}

        {/* Departure Board */}
        <DepartureBoard 
          currentTime={currentTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
          onAnnouncement={handleAnnouncement}
        />
      </div>
    </div>
  );
};

export default Index;
