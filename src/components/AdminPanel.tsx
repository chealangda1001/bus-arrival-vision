import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload } from "lucide-react";
import { useDepartures, type Departure } from "@/hooks/useDepartures";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminPanel = () => {
  const { departures, loading, addDeparture, updateDepartureStatus, deleteDeparture } = useDepartures();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDeparture, setNewDeparture] = useState({
    route_number: "",
    destination: "",
    plate_number: "",
    departure_time: "",
    status: "on-time" as const,
    gate: "",
    estimated_time: "",
    passenger_count: 0,
    fleet_image_url: ""
  });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fleet-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fleet-images')
        .getPublicUrl(filePath);

      setNewDeparture(prev => ({
        ...prev,
        fleet_image_url: publicUrl
      }));

      toast({
        title: "Success",
        description: "Fleet image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDeparture.route_number || !newDeparture.destination || !newDeparture.departure_time || !newDeparture.gate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    await addDeparture(newDeparture);
    
    // Reset form
    setNewDeparture({
      route_number: "",
      destination: "",
      plate_number: "",
      departure_time: "",
      status: "on-time",
      gate: "",
      estimated_time: "",
      passenger_count: 0,
      fleet_image_url: ""
    });
  };

  const handleUpdateStatus = async (id: string, status: Departure['status']) => {
    const estimatedTime = status === "delayed" ? 
      prompt("Enter estimated departure time (HH:MM):") : undefined;
    
    await updateDepartureStatus(id, status, estimatedTime || undefined);
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

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toggle Edit Mode */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Departure Management</h2>
        <Button 
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "destructive" : "default"}
        >
          {editMode ? "Exit Edit Mode" : "Edit Mode"}
        </Button>
      </div>

      {/* Add New Departure Form */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Departure</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDeparture} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="routeNumber">Route Number *</Label>
                <Input
                  id="routeNumber"
                  value={newDeparture.route_number}
                  onChange={(e) => setNewDeparture(prev => ({...prev, route_number: e.target.value}))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  value={newDeparture.destination}
                  onChange={(e) => setNewDeparture(prev => ({...prev, destination: e.target.value}))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plateNumber">Plate Number</Label>
                <Input
                  id="plateNumber"
                  value={newDeparture.plate_number}
                  onChange={(e) => setNewDeparture(prev => ({...prev, plate_number: e.target.value}))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="departureTime">Departure Time *</Label>
                <Input
                  id="departureTime"
                  type="time"
                  value={newDeparture.departure_time}
                  onChange={(e) => setNewDeparture(prev => ({...prev, departure_time: e.target.value}))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gate">Gate *</Label>
                <Input
                  id="gate"
                  value={newDeparture.gate}
                  onChange={(e) => setNewDeparture(prev => ({...prev, gate: e.target.value}))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="passengerCount">Passenger Count</Label>
                <Input
                  id="passengerCount"
                  type="number"
                  min="0"
                  value={newDeparture.passenger_count}
                  onChange={(e) => setNewDeparture(prev => ({...prev, passenger_count: parseInt(e.target.value) || 0}))}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="fleetImage">Fleet Image</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="fleetImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                  {newDeparture.fleet_image_url && (
                    <img 
                      src={newDeparture.fleet_image_url} 
                      alt="Fleet preview" 
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                </div>
              </div>
              
              <div className="col-span-2">
                <Button type="submit" disabled={uploading}>
                  <Upload className="w-4 h-4 mr-2" />
                  Add Departure
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Current Departures */}
      <Card>
        <CardHeader>
          <CardTitle>Current Departures ({departures.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departures.map((departure) => (
              <div
                key={departure.id}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  {departure.fleet_image_url && (
                    <img
                      src={departure.fleet_image_url}
                      alt="Fleet"
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">Route {departure.route_number}</span>
                      <Badge className={getStatusColor(departure.status)}>
                        {departure.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600">{departure.destination}</p>
                    <p className="text-sm text-gray-500">
                      Gate {departure.gate} • {departure.departure_time}
                      {departure.estimated_time && departure.status === "delayed" && 
                        ` → ${departure.estimated_time}`
                      }
                      {departure.passenger_count && 
                        ` • ${departure.passenger_count} passengers`
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {editMode && (
                    <>
                      <Select 
                        value={departure.status} 
                        onValueChange={(value: Departure['status']) => 
                          handleUpdateStatus(departure.id, value)
                        }
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
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteDeparture(departure.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {departures.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No departures found. {editMode ? "Add some departures to get started." : ""}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;