import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface AdminPanelProps {
  departures: Departure[];
  onUpdateDepartures: (departures: Departure[]) => void;
}

export default function AdminPanel({ departures, onUpdateDepartures }: AdminPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDeparture, setNewDeparture] = useState<Partial<Departure>>({
    routeNumber: '',
    destination: '',
    plateNumber: '',
    departureTime: '',
    status: 'on-time',
    gate: '',
  });
  
  const { toast } = useToast();

  const handleAddDeparture = () => {
    if (!newDeparture.routeNumber || !newDeparture.destination || !newDeparture.departureTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const departure: Departure = {
      id: Date.now().toString(),
      routeNumber: newDeparture.routeNumber!,
      destination: newDeparture.destination!,
      plateNumber: newDeparture.plateNumber!,
      departureTime: newDeparture.departureTime!,
      status: newDeparture.status as any || 'on-time',
      gate: newDeparture.gate!,
      estimatedTime: newDeparture.estimatedTime,
      passengerCount: newDeparture.passengerCount,
    };

    onUpdateDepartures([...departures, departure]);
    setNewDeparture({
      routeNumber: '',
      destination: '',
      plateNumber: '',
      departureTime: '',
      status: 'on-time',
      gate: '',
    });
    
    toast({
      title: "Success",
      description: "Departure added successfully"
    });
  };

  const handleUpdateStatus = (id: string, status: Departure['status'], estimatedTime?: string) => {
    const updated = departures.map(dep => 
      dep.id === id 
        ? { ...dep, status, estimatedTime: estimatedTime || dep.estimatedTime }
        : dep
    );
    onUpdateDepartures(updated);
    
    toast({
      title: "Status Updated",
      description: `Departure status changed to ${status}`
    });
  };

  const handleDeleteDeparture = (id: string) => {
    const updated = departures.filter(dep => dep.id !== id);
    onUpdateDepartures(updated);
    
    toast({
      title: "Deleted",
      description: "Departure removed successfully"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-time": return "bg-status-on-time";
      case "delayed": return "bg-status-delayed";
      case "boarding": return "bg-status-boarding";
      case "departed": return "bg-status-departed";
      default: return "bg-status-on-time";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dashboard-title text-text-display">
          Admin Panel
        </h2>
        <Button onClick={() => setIsEditing(!isEditing)}>
          <Settings className="w-4 h-4 mr-2" />
          {isEditing ? 'View Mode' : 'Edit Mode'}
        </Button>
      </div>

      {isEditing && (
        <Card className="bg-dashboard-surface border-dashboard-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Add New Departure</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="route">Route Number*</Label>
              <Input
                id="route"
                value={newDeparture.routeNumber}
                onChange={(e) => setNewDeparture({...newDeparture, routeNumber: e.target.value})}
                placeholder="e.g., 101"
              />
            </div>
            <div>
              <Label htmlFor="destination">Destination*</Label>
              <Input
                id="destination"
                value={newDeparture.destination}
                onChange={(e) => setNewDeparture({...newDeparture, destination: e.target.value})}
                placeholder="e.g., Airport Terminal"
              />
            </div>
            <div>
              <Label htmlFor="plate">Plate Number*</Label>
              <Input
                id="plate"
                value={newDeparture.plateNumber}
                onChange={(e) => setNewDeparture({...newDeparture, plateNumber: e.target.value})}
                placeholder="e.g., PP-1234"
              />
            </div>
            <div>
              <Label htmlFor="time">Departure Time*</Label>
              <Input
                id="time"
                type="time"
                value={newDeparture.departureTime}
                onChange={(e) => setNewDeparture({...newDeparture, departureTime: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="gate">Gate*</Label>
              <Input
                id="gate"
                value={newDeparture.gate}
                onChange={(e) => setNewDeparture({...newDeparture, gate: e.target.value})}
                placeholder="e.g., A1"
              />
            </div>
            <div>
              <Label htmlFor="passengers">Passenger Count</Label>
              <Input
                id="passengers"
                type="number"
                value={newDeparture.passengerCount || ''}
                onChange={(e) => setNewDeparture({...newDeparture, passengerCount: parseInt(e.target.value) || undefined})}
                placeholder="Optional"
              />
            </div>
          </div>
          <Button onClick={handleAddDeparture} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Departure
          </Button>
        </Card>
      )}

      <Card className="bg-dashboard-surface border-dashboard-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Current Departures</h3>
        <div className="space-y-3">
          {departures.map((departure) => (
            <div key={departure.id} className="flex items-center justify-between p-4 bg-dashboard-bg rounded-lg border border-dashboard-border">
              <div className="flex items-center gap-4">
                <Badge className="bg-primary text-primary-foreground">
                  {departure.routeNumber}
                </Badge>
                <div>
                  <p className="font-semibold text-text-primary">{departure.destination}</p>
                  <p className="text-sm text-text-secondary">
                    {departure.departureTime} • Gate {departure.gate} • {departure.plateNumber}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Select
                  value={departure.status}
                  onValueChange={(status) => handleUpdateStatus(departure.id, status as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on-time">On Time</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="boarding">Boarding</SelectItem>
                    <SelectItem value="departed">Departed</SelectItem>
                  </SelectContent>
                </Select>
                
                {isEditing && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteDeparture(departure.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}