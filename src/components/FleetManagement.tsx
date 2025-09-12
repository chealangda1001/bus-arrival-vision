import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Plus, Upload, Truck } from "lucide-react";
import { useFleets, type Fleet } from "@/hooks/useFleets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FleetManagementProps {
  operatorId: string;
  isSuperAdmin?: boolean;
}

const FleetManagement = ({ operatorId, isSuperAdmin = false }: FleetManagementProps) => {
  const { fleets, loading, addFleet, updateFleet, deleteFleet } = useFleets(operatorId);
  const { toast } = useToast();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFleet, setEditingFleet] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [newFleet, setNewFleet] = useState({
    name: "",
    plate_number: "",
    fleet_type: "Bus" as "VIP Van" | "Bus" | "Sleeping Bus",
    fleet_image_url: "",
    capacity: 0
  });
  
  const [editFleet, setEditFleet] = useState({
    name: "",
    plate_number: "",
    fleet_type: "Bus" as "VIP Van" | "Bus" | "Sleeping Bus",
    fleet_image_url: "",
    capacity: 0
  });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `fleet-${Date.now()}.${fileExt}`;
      const filePath = `fleet-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fleet-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fleet-images')
        .getPublicUrl(filePath);

      if (editingFleet) {
        setEditFleet(prev => ({ ...prev, fleet_image_url: publicUrl }));
      } else {
        setNewFleet(prev => ({ ...prev, fleet_image_url: publicUrl }));
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

  const handleCreateFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFleet.name || !newFleet.plate_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    await addFleet({
      operator_id: operatorId,
      name: newFleet.name,
      plate_number: newFleet.plate_number,
      fleet_type: newFleet.fleet_type,
      fleet_image_url: newFleet.fleet_image_url || undefined,
      capacity: newFleet.capacity || 0,
      is_active: true
    });
    
    setNewFleet({
      name: "",
      plate_number: "",
      fleet_type: "Bus",
      fleet_image_url: "",
      capacity: 0
    });
    setShowCreateForm(false);
  };

  const handleEditFleet = (fleet: Fleet) => {
    setEditingFleet(fleet.id);
    setEditFleet({
      name: fleet.name,
      plate_number: fleet.plate_number,
      fleet_type: fleet.fleet_type,
      fleet_image_url: fleet.fleet_image_url || "",
      capacity: fleet.capacity
    });
  };

  const handleUpdateFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editFleet.name || !editFleet.plate_number || !editingFleet) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    await updateFleet(editingFleet, {
      name: editFleet.name,
      plate_number: editFleet.plate_number,
      fleet_type: editFleet.fleet_type,
      fleet_image_url: editFleet.fleet_image_url || undefined,
      capacity: editFleet.capacity
    });
    
    setEditingFleet(null);
    setEditFleet({
      name: "",
      plate_number: "",
      fleet_type: "Bus",
      fleet_image_url: "",
      capacity: 0
    });
  };

  const cancelEdit = () => {
    setEditingFleet(null);
    setEditFleet({
      name: "",
      plate_number: "",
      fleet_type: "Bus",
      fleet_image_url: "",
      capacity: 0
    });
    setShowCreateForm(false);
    setNewFleet({
      name: "",
      plate_number: "",
      fleet_type: "Bus",
      fleet_image_url: "",
      capacity: 0
    });
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
    return <div className="flex justify-center p-8">Loading fleets...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Fleet Management</h3>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Fleet
        </Button>
      </div>

      {/* Create Fleet Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Fleet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateFleet} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fleet-name">Fleet Name *</Label>
                <Input
                  id="fleet-name"
                  value={newFleet.name}
                  onChange={(e) => setNewFleet(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g., VIP Van 001"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plate-number">Plate Number *</Label>
                <Input
                  id="plate-number"
                  value={newFleet.plate_number}
                  onChange={(e) => setNewFleet(prev => ({...prev, plate_number: e.target.value}))}
                  placeholder="e.g., PP-1234"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fleet-type">Fleet Type *</Label>
                <Select 
                  value={newFleet.fleet_type} 
                  onValueChange={(value: "VIP Van" | "Bus" | "Sleeping Bus") => 
                    setNewFleet(prev => ({...prev, fleet_type: value}))
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
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={newFleet.capacity || ""}
                  onChange={(e) => setNewFleet(prev => ({...prev, capacity: parseInt(e.target.value) || 0}))}
                  placeholder="Number of seats"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="fleet-image">Fleet Image</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="fleet-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                  {newFleet.fleet_image_url && (
                    <img 
                      src={newFleet.fleet_image_url} 
                      alt="Fleet preview" 
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                </div>
              </div>
              
              <div className="col-span-2 flex space-x-2">
                <Button type="submit" disabled={uploading}>
                  <Upload className="w-4 h-4 mr-2" />
                  Add Fleet
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Fleets List */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Vehicles ({fleets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fleets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No fleets available. Add your first fleet to get started.
              </div>
            ) : (
              fleets.map((fleet) => (
                <div
                  key={fleet.id}
                  className="border border-border rounded-lg p-4"
                >
                  {editingFleet === fleet.id ? (
                    // Edit Form
                    <form onSubmit={handleUpdateFleet} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-fleet-name">Fleet Name *</Label>
                          <Input
                            id="edit-fleet-name"
                            value={editFleet.name}
                            onChange={(e) => setEditFleet(prev => ({...prev, name: e.target.value}))}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-plate-number">Plate Number *</Label>
                          <Input
                            id="edit-plate-number"
                            value={editFleet.plate_number}
                            onChange={(e) => setEditFleet(prev => ({...prev, plate_number: e.target.value}))}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-fleet-type">Fleet Type *</Label>
                          <Select 
                            value={editFleet.fleet_type} 
                            onValueChange={(value: "VIP Van" | "Bus" | "Sleeping Bus") => 
                              setEditFleet(prev => ({...prev, fleet_type: value}))
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
                          <Label htmlFor="edit-capacity">Capacity</Label>
                          <Input
                            id="edit-capacity"
                            type="number"
                            value={editFleet.capacity || ""}
                            onChange={(e) => setEditFleet(prev => ({...prev, capacity: parseInt(e.target.value) || 0}))}
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
                            {editFleet.fleet_image_url && (
                              <img 
                                src={editFleet.fleet_image_url} 
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
                    // Display Fleet
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {fleet.fleet_image_url ? (
                          <img 
                            src={fleet.fleet_image_url} 
                            alt={fleet.name} 
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <Truck className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{fleet.name}</h4>
                          <p className="text-sm text-muted-foreground">Plate: {fleet.plate_number}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getFleetTypeColor(fleet.fleet_type)}>
                              {fleet.fleet_type}
                            </Badge>
                            {fleet.capacity > 0 && (
                              <Badge variant="outline">
                                {fleet.capacity} seats
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditFleet(fleet)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {(isSuperAdmin) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFleet(fleet.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetManagement;