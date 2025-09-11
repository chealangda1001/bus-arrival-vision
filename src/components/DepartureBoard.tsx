import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Truck } from "lucide-react";
import { useDepartures, type Departure } from "@/hooks/useDepartures";

interface DepartureBoardProps {
  currentTime: string;
  branchId?: string;
  onAnnouncement?: (departure: Departure) => void;
}

const DepartureBoard = ({ currentTime, branchId, onAnnouncement }: DepartureBoardProps) => {
  const { departures, loading } = useDepartures(branchId);
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
    
    if (totalMinutes <= 0) return "Now";
    if (totalMinutes < 60) return `${totalMinutes}mn`;
    
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hrs}h ${mins}mn` : `${hrs}h`;
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
            Bus Departures
          </h1>
          <p className="text-lg text-text-display/80">{currentTime}</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-xl text-text-display/60">Loading departures...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-text-display">
          Bus Departures
        </h1>
        <p className="text-lg text-text-display/80">{currentTime}</p>
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
                      {departure.fleet_image_url ? (
                        <img 
                          src={departure.fleet_image_url} 
                          alt="Fleet vehicle" 
                          className="w-full h-full object-cover" 
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
                        <span className="text-sm text-text-display/60 font-medium">Destination:</span>
                        <h3 className="text-xl font-bold text-text-display">{departure.destination}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Fleet Details */}
                  <div className="col-span-3">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-text-display/60 font-medium">Fleet Type:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getFleetTypeColor(departure.fleet_type)}>
                            <Truck className="w-4 h-4 mr-1" />
                            {departure.fleet_type}
                          </Badge>
                        </div>
                      </div>
                      {departure.plate_number && (
                        <div>
                          <span className="text-sm text-text-display/60 font-medium">Plate Number:</span>
                          <div className="text-text-display/80">{departure.plate_number}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Departure Time & Countdown */}
                  <div className="col-span-2">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-text-display/60 font-medium">Departure Time:</span>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-text-display/60" />
                          <span className="text-lg font-bold text-text-display">{departure.departure_time}</span>
                        </div>
                        {departure.estimated_time && departure.status === "delayed" && (
                          <div className="text-red-500 text-sm">Est: {departure.estimated_time}</div>
                        )}
                      </div>
                      <div>
                        <span className="text-sm text-text-display/60 font-medium">Countdown:</span>
                        <div className="text-lg font-bold text-text-display">
                          {calculateCountdown(departure.departure_time)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex justify-end">
                    <div className="text-right">
                      <span className="text-sm text-text-display/60 font-medium">Status:</span>
                      <div className="mt-1">
                        <Badge className={getStatusColor(departure.status)}>
                          {departure.status.toUpperCase()}
                        </Badge>
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
            <p className="text-text-display/60 text-xl">No departures scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartureBoard;