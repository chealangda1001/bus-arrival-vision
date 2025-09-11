import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users } from "lucide-react";
import { useDepartures, type Departure } from "@/hooks/useDepartures";

interface DepartureBoardProps {
  currentTime: string;
  onAnnouncement?: (departure: Departure) => void;
}

const DepartureBoard: React.FC<DepartureBoardProps> = ({ 
  currentTime, 
  onAnnouncement 
}) => {
  const { departures, loading } = useDepartures();
  const [announcedDepartures, setAnnouncedDepartures] = useState<Set<string>>(new Set());

  const calculateCountdown = (departureTime: string) => {
    const currentDate = new Date();
    const departure = new Date(`${currentDate.toDateString()} ${departureTime}`);
    const diff = departure.getTime() - currentDate.getTime();
    
    if (diff <= 0) return "Now";
    
    const minutes = Math.floor(diff / 60000);
    
    if (minutes <= 15) {
      const seconds = Math.floor((diff % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `in ${hours}h ${remainingMinutes}mn` : `in ${hours}h`;
    }
    
    return `in ${minutes}mn`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-time": return "bg-green-100 text-green-800";
      case "delayed": return "bg-red-100 text-red-800";  
      case "boarding": return "bg-blue-100 text-blue-800";
      case "departed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    if (onAnnouncement) {
      departures.forEach((departure) => {
        if (announcedDepartures.has(departure.id)) return;
        
        const countdown = calculateCountdown(departure.departure_time);
        if (countdown === "10:00" && departure.status !== "departed") {
          setAnnouncedDepartures(prev => new Set(prev).add(departure.id));
          onAnnouncement(departure);
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
          <p className="text-lg text-text-secondary">{currentTime}</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-xl text-text-secondary">Loading departures...</div>
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
        <p className="text-lg text-text-secondary">{currentTime}</p>
      </div>

      {/* Departures Grid */}
      <div className="grid gap-4">
        {departures.map((departure, index) => {
          const countdown = calculateCountdown(departure.departure_time);
          const isBoarding = departure.status === "boarding";
          
          return (
            <Card 
              key={departure.id} 
              className={`bg-card-bg transition-all duration-500 animate-fade-in ${
                isBoarding 
                  ? "border-2 border-blue-400 shadow-lg animate-pulse" 
                  : "border-2 border-card-border"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Fleet Picture - 2x bigger */}
                  <div className="col-span-1">
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {departure.fleet_image_url ? (
                        <img 
                          src={departure.fleet_image_url} 
                          alt="Bus" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-16 h-12 bg-primary/20 rounded-sm flex items-center justify-center">
                          <div className="text-sm text-primary font-bold">BUS</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Route & Destination */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-lg">
                        {departure.route_number}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-text-display">
                          {departure.destination}
                        </h3>
                        <p className="text-text-secondary flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Gate {departure.gate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Plate Number */}
                  <div className="col-span-2">
                    <p className="text-text-secondary text-sm">Plate Number</p>
                    <p className="font-mono font-semibold text-text-display">
                      {departure.plate_number}
                    </p>
                  </div>

                  {/* Departure Time */}
                  <div className="col-span-2">
                    <p className="text-text-secondary text-sm">Departure</p>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <span className="font-semibold text-text-display">
                        {departure.departure_time}
                      </span>
                    </div>
                    {departure.estimated_time && departure.status === "delayed" && (
                      <p className="text-xs text-red-600">
                        Est: {departure.estimated_time}
                      </p>
                    )}
                  </div>

                  {/* Countdown */}
                  <div className="col-span-2">
                    <p className="text-text-secondary text-sm">Countdown</p>
                    <div className="font-mono text-xl font-bold text-blue-600">
                      {countdown}
                    </div>
                  </div>

                  {/* Status & Passengers */}
                  <div className="col-span-2 text-right">
                    <Badge className={`mb-2 font-semibold px-3 py-1 ${getStatusColor(departure.status)}`}>
                      {departure.status.toUpperCase()}
                    </Badge>
                    {departure.passenger_count && (
                      <div className="flex items-center justify-end gap-1 text-text-secondary">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{departure.passenger_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {departures.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary text-xl">No departures scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartureBoard;