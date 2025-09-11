import { useState, useEffect } from "react";
import AdminPanel from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  fleetImage?: string;
}

// Mock data for demonstration (should match the main data)
const initialDepartures: Departure[] = [
  {
    id: "1",
    routeNumber: "101",
    destination: "Phnom Penh International Airport",
    plateNumber: "PP-1234",
    departureTime: "14:30",
    status: "on-time",
    gate: "A1",
    passengerCount: 45,
    fleetImage: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center"
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
    passengerCount: 32,
    fleetImage: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop&crop=center"
  },
  {
    id: "3",
    routeNumber: "89",
    destination: "Riverside Boulevard",
    plateNumber: "PP-9012",
    departureTime: "15:00",
    status: "boarding",
    gate: "A3",
    passengerCount: 28,
    fleetImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center"
  },
  {
    id: "4",
    routeNumber: "340",
    destination: "Royal Palace",
    plateNumber: "PP-3456",
    departureTime: "15:15",
    status: "on-time",
    gate: "C1",
    passengerCount: 51,
    fleetImage: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop&crop=center"
  }
];

const Admin = () => {
  const navigate = useNavigate();
  const [departures, setDepartures] = useState<Departure[]>(initialDepartures);

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Display
            </Button>
            <h1 className="text-3xl font-bold text-text-display">
              Admin Panel
            </h1>
          </div>
        </div>

        {/* Admin Panel */}
        <AdminPanel 
          departures={departures}
          onUpdateDepartures={setDepartures}
        />
      </div>
    </div>
  );
};

export default Admin;