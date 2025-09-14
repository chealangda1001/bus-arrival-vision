import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Truck } from "lucide-react";
import { useDepartures, type Departure } from "@/hooks/useDepartures";
import { useTranslation } from "@/hooks/useTranslation";
import { useTranslatedData } from "@/hooks/useTranslatedData";

interface DepartureBoardProps {
  currentTime: string;
  branchId?: string;
  onAnnouncement?: (departure: Departure) => void;
}

const DepartureBoard = ({ currentTime, branchId, onAnnouncement }: DepartureBoardProps) => {
  const { departures, loading } = useDepartures(branchId);
  const { t, currentLanguage } = useTranslation();
  const { getTranslatedDestination, getTranslatedStatus, getTranslatedFleetType } = useTranslatedData();
  const [announcedDepartures, setAnnouncedDepartures] = useState<Set<string>>(new Set());

  const calculateCountdown = (departureTime: string): string => {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const now = new Date();
    const departureDate = new Date();
    departureDate.setHours(hours, minutes, 0, 0);
    
    // If departure time has passed today, assume it's tomorrow
    if (departureDate <= now) {
      departureDate.setDate(departureDate.getDate() + 1);
    }
    
    const diff = departureDate.getTime() - now.getTime();
    const totalMinutes = Math.floor(diff / 60000);
    
    if (totalMinutes <= 0) return t('now');
    if (totalMinutes < 60) return `${totalMinutes}${t('minutes')}`;
    
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hrs}${t('hours')} ${mins}${t('minutes')}` : `${hrs}${t('hours')}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "on-time":
        return "bg-green-500 text-white";
      case "delayed":
        return "bg-red-500 text-white";
      case "boarding":
        return "bg-blue-500 text-white";
      case "departed":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getFleetTypeColor = (fleetType: string) => {
    switch (fleetType) {
      case "VIP Van": return "bg-purple-500 text-white";
      case "Bus": return "bg-blue-500 text-white";
      case "Sleeping Bus": return "bg-indigo-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  // Check for announcements when time updates
  useEffect(() => {
    // Debug log for fleet images
    console.log('Departures data:', departures.map(d => ({
      id: d.id,
      destination: d.destination,
      fleet_image_url: d.fleet_image_url,
      fleet_image_url_type: typeof d.fleet_image_url,
      fleet_image_url_length: d.fleet_image_url?.length
    })));
    
    if (onAnnouncement) {
      departures.forEach((departure) => {
        const countdown = calculateCountdown(departure.departure_time);
        const countdownMinutes = parseInt(countdown.replace(/[^\d]/g, ''));
        
        if (countdownMinutes === 10 && onAnnouncement && !announcedDepartures.has(departure.id)) {
          onAnnouncement(departure);
          setAnnouncedDepartures(prev => new Set([...prev, departure.id]));
        }
      });
    }
  }, [currentTime, departures, onAnnouncement, announcedDepartures]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-text-display">
            {t('bus_departures')}
          </h1>
          <p className="text-lg text-text-display/80">{currentTime}</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-xl text-text-display/60">{t('loading_departures')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-text-display">
          {t('bus_departures')}
        </h1>
        <p className="text-lg text-text-display/80">
          {formatLocalizedDate(new Date(), currentLanguage)} • {currentTime}
        </p>
      </div>

      {/* Departures Grid */}
      <div className="grid gap-4">
        {departures.map((departure, index) => {
          const countdown = calculateCountdown(departure.departure_time);
          const isBoarding = departure.status === "boarding";
          
          return (
            <Card 
              key={departure.id} 
              className={`bg-card transition-all duration-500 animate-fade-in ${
                isBoarding 
                  ? "border-2 border-blue-400 shadow-lg" 
                  : "border-2 border-border"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Fleet Picture */}
                  <div className="col-span-2">
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {departure.fleet_image_url && departure.fleet_image_url.trim() !== '' ? (
                        <img 
                          src={departure.fleet_image_url} 
                          alt="Fleet vehicle" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            console.error('Failed to load fleet image:', departure.fleet_image_url);
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `
                              <div class="w-16 h-12 bg-primary/20 rounded-sm flex items-center justify-center">
                                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0"></path>
                                </svg>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="w-16 h-12 bg-primary/20 rounded-sm flex items-center justify-center">
                          <Truck className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="col-span-3">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-text-display/60 font-medium">{t('destination')}</span>
                        <h3 className="text-xl font-bold text-text-display">{getTranslatedDestination(departure.destination)}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Fleet Type */}
                  <div className="col-span-2">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-text-display/60 font-medium">{t('fleet_type')}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getFleetTypeColor(departure.fleet_type)}>
                            <Truck className="w-4 h-4 mr-1" />
                            {getTranslatedFleetType(departure.fleet_type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plate Number */}
                  <div className="col-span-1">
                    {departure.plate_number && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-text-display/60 font-medium">{t('plate')}</span>
                          <div className="text-text-display/80 font-medium">{departure.plate_number}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Departure Time */}
                  <div className="col-span-2">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-text-display/60 font-medium">{t('departure_time')}</span>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-text-display/60" />
                          <span className="text-lg font-bold text-text-display">{departure.departure_time}</span>
                        </div>
                        {departure.estimated_time && departure.status === "delayed" && (
                          <div className="text-red-500 text-sm">{t('estimated')} {departure.estimated_time}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex justify-end">
                    <div className="text-right">
                      <span className="text-sm text-text-display/60 font-medium">{t('status')}</span>
                      <div className="mt-1 space-y-1">
                        <Badge className={getStatusColor(departure.status)}>
                          {getTranslatedStatus(departure.status)}
                        </Badge>
                        {departure.status === "boarding" && (
                          <div className="text-sm font-medium text-text-display">
                            {calculateCountdown(departure.departure_time)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {departures.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-display/60 text-xl">{t('no_departures')}</p>
          </div>
        )}
      </div>
    </div>
  );
  };

// Helper function to format localized date
const formatLocalizedDate = (date: Date, language: string): string => {
  const days = {
    english: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    khmer: ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'],
    chinese: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  };

  const months = {
    english: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    khmer: ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'],
    chinese: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  };

  const dayName = days[language as keyof typeof days] ? days[language as keyof typeof days][date.getDay()] : days.english[date.getDay()];
  const monthName = months[language as keyof typeof months] ? months[language as keyof typeof months][date.getMonth()] : months.english[date.getMonth()];
  
  return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
};

export default DepartureBoard;