import { useState, useEffect } from "react";
import DepartureBoard from "@/components/DepartureBoard";
import AnnouncementSystem from "@/components/AnnouncementSystem";
import AdminPanel from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Settings } from "lucide-react";

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

// Mock data for demonstration
const initialDepartures: Departure[] = [
  {
    id: "1",
    routeNumber: "101",
    destination: "Phnom Penh International Airport",
    plateNumber: "PP-1234",
    departureTime: "14:30",
    status: "on-time",
    gate: "A1",
    passengerCount: 45
  },
  {
    id: "2",
    routeNumber: "205",
    destination: "Central Market",
    plateNumber: "PP-5678",
    departureTime: "14:45",
    status: "delayed",
    gate: "B2",
    estimatedTime: "15:00",
    passengerCount: 32
  },
  {
    id: "3",
    routeNumber: "89",
    destination: "Riverside Boulevard",
    plateNumber: "PP-9012",
    departureTime: "15:00",
    status: "boarding",
    gate: "A3",
    passengerCount: 28
  },
  {
    id: "4",
    routeNumber: "340",
    destination: "Royal Palace",
    plateNumber: "PP-3456",
    departureTime: "15:15",
    status: "on-time",
    gate: "C1",
    passengerCount: 51
  }
];

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [departures, setDepartures] = useState<Departure[]>(initialDepartures);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Departure | undefined>();
  const [activeTab, setActiveTab] = useState("dashboard");

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

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Announcement Banner */}
        {currentAnnouncement && (
          <AnnouncementSystem 
            departure={currentAnnouncement}
            onComplete={handleAnnouncementComplete}
          />
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-dashboard-surface border-dashboard-border">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Display Board
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Admin Panel
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <DepartureBoard 
              departures={departures}
              currentTime={currentTime}
              onAnnouncement={handleAnnouncement}
            />
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <AdminPanel 
              departures={departures}
              onUpdateDepartures={setDepartures}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
