import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Volume2 } from "lucide-react";

interface Departure {
  id: string;
  routeNumber: string;
  destination: string;
  plateNumber: string;
  departureTime: string;
  status: "on-time" | "delayed" | "boarding" | "departed";
  gate: string;
  estimatedTime?: string;
  passengerCount?: number;
}

interface DepartureBoardProps {
  departures: Departure[];
  currentTime: Date;
  onAnnouncement?: (departure: Departure) => void;
}

export default function DepartureBoard({ departures, currentTime, onAnnouncement }: DepartureBoardProps) {
  const [announcedDepartures, setAnnouncedDepartures] = useState<Set<string>>(new Set());

  // Calculate countdown for each departure
  const calculateCountdown = (departureTime: string) => {
    const departure = new Date(`${currentTime.toDateString()} ${departureTime}`);
    const diff = departure.getTime() - currentTime.getTime();
    
    if (diff <= 0) return "Now";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Check for announcements (10 minutes before departure)
  useEffect(() => {
    departures.forEach(departure => {
      if (announcedDepartures.has(departure.id)) return;
      
      const departureDate = new Date(`${currentTime.toDateString()} ${departure.departureTime}`);
      const timeDiff = departureDate.getTime() - currentTime.getTime();
      const minutesUntilDeparture = Math.floor(timeDiff / 60000);
      
      if (minutesUntilDeparture === 10 && departure.status === "on-time") {
        setAnnouncedDepartures(prev => new Set(prev).add(departure.id));
        onAnnouncement?.(departure);
      }
    });
  }, [currentTime, departures, announcedDepartures, onAnnouncement]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-time": return "status-on-time";
      case "delayed": return "status-delayed";
      case "boarding": return "status-boarding";
      case "departed": return "status-departed";
      default: return "status-on-time";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "on-time": return "On Time";
      case "delayed": return "Delayed";
      case "boarding": return "Boarding";
      case "departed": return "Departed";
      default: return "On Time";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold dashboard-display text-text-display">
          Bus Departures
        </h1>
        <p className="text-lg text-text-secondary">
          {currentTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>

      {/* Departures Grid */}
      <div className="grid gap-4">
        {departures.map((departure) => {
          const countdown = calculateCountdown(departure.departureTime);
          
          return (
            <Card key={departure.id} className="bg-dashboard-surface border-dashboard-border p-6">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Route & Destination */}
                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-lg">
                      {departure.routeNumber}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-text-primary dashboard-title">
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
                  <p className="font-mono font-semibold text-text-primary">
                    {departure.plateNumber}
                  </p>
                </div>

                {/* Departure Time */}
                <div className="col-span-2">
                  <p className="text-text-secondary text-sm">Departure</p>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-text-muted" />
                    <span className="font-semibold text-text-primary">
                      {departure.departureTime}
                    </span>
                  </div>
                  {departure.estimatedTime && (
                    <p className="text-xs text-status-delayed">
                      Est: {departure.estimatedTime}
                    </p>
                  )}
                </div>

                {/* Countdown */}
                <div className="col-span-2">
                  <p className="text-text-secondary text-sm">Countdown</p>
                  <div className="font-mono text-xl font-bold text-text-display">
                    {countdown}
                  </div>
                </div>

                {/* Status & Passengers */}
                <div className="col-span-2 text-right">
                  <Badge 
                    className={`mb-2 text-white font-semibold px-3 py-1`}
                    style={{ backgroundColor: `hsl(var(--${getStatusColor(departure.status)}))` }}
                  >
                    {getStatusText(departure.status)}
                  </Badge>
                  {departure.passengerCount && (
                    <div className="flex items-center justify-end gap-1 text-text-secondary">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{departure.passengerCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}