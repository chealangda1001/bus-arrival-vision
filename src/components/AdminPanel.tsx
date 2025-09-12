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

interface AdminPanelProps {
  branchId?: string;
}

const AdminPanel = ({ branchId }: AdminPanelProps) => {
  const { departures, loading, addDeparture, updateDepartureStatus, deleteDeparture } = useDepartures(branchId);
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<string | null>(null);
  const [newDeparture, setNewDeparture] = useState({
    destination: "",
    plate_number: "",
    departure_time: "",
    status: "on-time" as "on-time" | "delayed" | "boarding" | "departed",
    fleet_type: "Bus" as "VIP Van" | "Bus" | "Sleeping Bus",
    estimated_time: "",
    fleet_image_url: ""
  });
  const [editDeparture, setEditDeparture] = useState({
    destination: "",
    plate_number: "",
    departure_time: "",
    status: "on-time" as "on-time" | "delayed" | "boarding" | "departed",
    fleet_type: "Bus" as "VIP Van" | "Bus" | "Sleeping Bus",
    estimated_time: "",
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

      // Update the appropriate state based on whether we're creating or editing
      if (editingDeparture) {
        setEditDeparture(prev => ({
          ...prev,
          fleet_image_url: publicUrl
        }));
      } else {
        setNewDeparture(prev => ({
          ...prev,
          fleet_image_url: publicUrl
        }));
      }

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
    
    if (!newDeparture.destination || !newDeparture.departure_time || !branchId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const departureData = {
      branch_id: branchId,
      destination: newDeparture.destination,
      plate_number: newDeparture.plate_number,
      departure_time: newDeparture.departure_time,
      status: newDeparture.status,
      fleet_type: newDeparture.fleet_type,
      estimated_time: newDeparture.estimated_time || undefined,
      fleet_image_url: newDeparture.fleet_image_url || undefined,
    };

    await addDeparture(departureData);
    
    // Reset form
    setNewDeparture({
      destination: "",
      plate_number: "",
      departure_time: "",
      status: "on-time",
      fleet_type: "Bus",
      estimated_time: "",
      fleet_image_url: ""
    });
  };

  const handleEditDeparture = (departure: Departure) => {
    setEditingDeparture(departure.id);
    setEditDeparture({
      destination: departure.destination,
      plate_number: departure.plate_number,
      departure_time: departure.departure_time,
      status: departure.status,
      fleet_type: departure.fleet_type,
      estimated_time: departure.estimated_time || "",
      fleet_image_url: departure.fleet_image_url || ""
    });
  };

  const handleUpdateDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editDeparture.destination || !editDeparture.departure_time || !editingDeparture) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('departures')
        .update({
          destination: editDeparture.destination,
          plate_number: editDeparture.plate_number,
          departure_time: editDeparture.departure_time,
          status: editDeparture.status,
          fleet_type: editDeparture.fleet_type,
          estimated_time: editDeparture.estimated_time || null,
          fleet_image_url: editDeparture.fleet_image_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingDeparture);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Departure updated successfully",
      });
      
      setEditingDeparture(null);
      setEditDeparture({
        destination: "",
        plate_number: "",
        departure_time: "",
        status: "on-time",
        fleet_type: "Bus",
        estimated_time: "",
        fleet_image_url: ""
      });
      
      // Refresh departures list
      window.location.reload();
    } catch (error) {
      console.error('Update departure error:', error);
      toast({
        title: "Error",
        description: "Failed to update departure",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingDeparture(null);
    setEditDeparture({
      destination: "",
      plate_number: "",
      departure_time: "",
      status: "on-time",
      fleet_type: "Bus",
      estimated_time: "",
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

  const getFleetTypeColor = (fleetType: string) => {
    switch (fleetType) {
      case "VIP Van": return "bg-purple-100 text-purple-800";
      case "Bus": return "bg-blue-100 text-blue-800";
      case "Sleeping Bus": return "bg-indigo-100 text-indigo-800";
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
        <h2 className="text-2xl font-bold text-text-display">Departure Management</h2>
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
                <Label htmlFor="fleetType">Fleet Type *</Label>
                <Select 
                  value={newDeparture.fleet_type} 
                  onValueChange={(value: "VIP Van" | "Bus" | "Sleeping Bus") => 
                    setNewDeparture(prev => ({...prev, fleet_type: value}))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIP Van">VIP Van</SelectItem>
                    <SelectItem value="Bus">Bus</SelectItem>
                    <SelectItem value="Sleeping Bus">Sleeping Bus</SelectItem>
                  </SelectContent>
                </Select>
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
                className="border border-border rounded-lg p-4"
              >
                {editingDeparture === departure.id ? (
                  // Edit Form
                  <form onSubmit={handleUpdateDeparture} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-fleet-type">Fleet Type *</Label>
                        <Select 
                          value={editDeparture.fleet_type} 
                          onValueChange={(value: "VIP Van" | "Bus" | "Sleeping Bus") => 
                            setEditDeparture(prev => ({...prev, fleet_type: value}))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIP Van">VIP Van</SelectItem>
                            <SelectItem value="Bus">Bus</SelectItem>
                            <SelectItem value="Sleeping Bus">Sleeping Bus</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-destination">Destination *</Label>
                        <Input
                          id="edit-destination"
                          value={editDeparture.destination}
                          onChange={(e) => setEditDeparture(prev => ({...prev, destination: e.target.value}))}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-plate-number">Plate Number</Label>
                        <Input
                          id="edit-plate-number"
                          value={editDeparture.plate_number}
                          onChange={(e) => setEditDeparture(prev => ({...prev, plate_number: e.target.value}))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-departure-time">Departure Time *</Label>
                        <Input
                          id="edit-departure-time"
                          type="time"
                          value={editDeparture.departure_time}
                          onChange={(e) => setEditDeparture(prev => ({...prev, departure_time: e.target.value}))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select 
                          value={editDeparture.status} 
                          onValueChange={(value: "on-time" | "delayed" | "boarding" | "departed") => 
                            setEditDeparture(prev => ({...prev, status: value}))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on-time">On Time</SelectItem>
                            <SelectItem value="delayed">Delayed</SelectItem>
                            <SelectItem value="boarding">Boarding</SelectItem>
                            <SelectItem value="departed">Departed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-estimated-time">Estimated Time</Label>
                        <Input
                          id="edit-estimated-time"
                          type="time"
                          value={editDeparture.estimated_time}
                          onChange={(e) => setEditDeparture(prev => ({...prev, estimated_time: e.target.value}))}
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="edit-fleet-image">Fleet Image</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            id="edit-fleet-image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            disabled={uploading}
                          />
                          {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                          {editDeparture.fleet_image_url && (
                            <img 
                              src={editDeparture.fleet_image_url} 
                              alt="Fleet preview" 
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={uploading}>
                        Save Changes
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  // Display Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {departure.fleet_image_url && (
                        <img
                          src={departure.fleet_image_url}
                          alt="Fleet"
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-lg text-text-display">{departure.destination}</span>
                          <Badge className={getStatusColor(departure.status)}>
                            {departure.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getFleetTypeColor(departure.fleet_type)}>
                            {departure.fleet_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-display/60 mt-2">
                          {departure.plate_number && `${departure.plate_number} • `}
                          {departure.departure_time}
                          {departure.estimated_time && departure.status === "delayed" && 
                            ` → ${departure.estimated_time}`
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {editMode && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDeparture(departure)}
                          >
                            Edit
                          </Button>
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
                )}
              </div>
            ))}
            
            {departures.length === 0 && (
              <p className="text-center text-text-display/60 py-8">
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