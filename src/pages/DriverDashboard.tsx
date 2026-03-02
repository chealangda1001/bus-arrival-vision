import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useDriverDepartures } from "@/hooks/useDriverDepartures";
import { useAnnouncementTypes } from "@/hooks/useAnnouncementTypes";
import DriverAnnouncementPlayer from "@/components/DriverAnnouncementPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock, MapPin, Loader2 } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";

const DriverDashboard = () => {
  const { user, profile, loading: authLoading, signOut } = useSupabaseAuth();
  const { departures, loading: departuresLoading } = useDriverDepartures(user?.id);
  const { types: announcementTypes } = useAnnouncementTypes(profile?.operator_id);
  
  // Track which announcement panels are expanded: { departureId_typeKey: true }
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Record<string, boolean>>({});
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && (profile.role as string) !== 'driver') {
    return <Navigate to="/" replace />;
  }

  const driverPlayableTypes = announcementTypes.filter(t => t.driver_playable && t.is_active);

  const getAnnouncementKey = (departureId: string, typeKey: string) => `${departureId}_${typeKey}`;

  const toggleExpanded = (departureId: string, typeKey: string) => {
    setExpandedAnnouncements(prev => ({
      ...prev,
      [getAnnouncementKey(departureId, typeKey)]: !prev[getAnnouncementKey(departureId, typeKey)]
    }));
  };

  const getTypeColor = (typeKey: string) => {
    switch (typeKey) {
      case 'break_stop': return 'bg-primary hover:bg-primary/90';
      case 'meal_break': return 'bg-[hsl(25,95%,53%)] hover:bg-[hsl(25,95%,45%)]';
      default: return 'bg-accent hover:bg-accent/90';
    }
  };

  const getTypeIcon = (typeKey: string) => {
    switch (typeKey) {
      case 'break_stop': return '☕';
      case 'meal_break': return '🍴';
      default: return '📢';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {profile?.username || 'Driver'}
          </h1>
          <p className="text-xs text-muted-foreground">Driver Dashboard</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={signOut}
          className="flex items-center gap-1 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {departuresLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : departures.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-xl font-semibold text-foreground">No Departures Assigned</p>
            <p className="text-muted-foreground">
              Contact your admin to assign departures to your account.
            </p>
          </div>
        ) : (
          departures.map(departure => (
            <Card key={departure.id} className="border-2 border-border">
              <CardContent className="p-4 space-y-3">
                {/* Departure Info */}
                <div className="space-y-1">
                  {departure.leaving_from && (
                    <p className="text-xs text-muted-foreground truncate">
                      {departure.leaving_from} →
                    </p>
                  )}
                  <h2 className="text-xl font-bold text-foreground truncate">
                    {departure.destination}
                  </h2>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span className="text-base font-semibold text-foreground">{departure.departure_time}</span>
                    </div>
                    {departure.plate_number && (
                      <Badge variant="secondary" className="text-xs">
                        {departure.plate_number}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Play Buttons - One per driver-playable type */}
                <div className="space-y-2">
                  {driverPlayableTypes.map(type => {
                    const key = getAnnouncementKey(departure.id, type.type_key);
                    const isExpanded = expandedAnnouncements[key];

                    return (
                      <div key={type.type_key} className="space-y-0">
                        <button
                          onClick={() => toggleExpanded(departure.id, type.type_key)}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-3 text-primary-foreground ${getTypeColor(type.type_key)} active:scale-[0.98] transition-transform ${isExpanded ? 'rounded-b-none' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">{getTypeIcon(type.type_key)}</span>
                            <span className="text-sm font-semibold truncate">{type.type_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {type.default_break_duration && (
                              <span className="text-xs opacity-80">
                                ({type.default_break_duration}min)
                              </span>
                            )}
                            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                          </div>
                        </button>
                        {isExpanded && (
                          <DriverAnnouncementPlayer
                            departure={departure}
                            operatorId={profile?.operator_id}
                            announcementTypeKey={type.type_key}
                            breakDurationOverride={type.default_break_duration ?? undefined}
                            onClose={() => toggleExpanded(departure.id, type.type_key)}
                          />
                        )}
                      </div>
                    );
                  })}

                  {driverPlayableTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No announcement types available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default DriverDashboard;
