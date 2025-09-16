import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Trash2, Upload, Truck, Volume2, Play, Clock, Edit, Eye, EyeOff, MoreVertical } from "lucide-react";
import { useDepartures, type Departure } from "@/hooks/useDepartures";
import { useFleets } from "@/hooks/useFleets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FleetManagement from "./FleetManagement";
import OperatorSettings from "./OperatorSettings";
import AnnouncementSystem from "./AnnouncementSystem";
import { TranslationManagement } from "./TranslationManagement";

interface AdminPanelProps {
  branchId?: string;
  operatorId?: string;
}

const AdminPanel = ({ branchId, operatorId }: AdminPanelProps) => {
  const hookResult = useDepartures(branchId);
  console.log('AdminPanel - received from useDepartures:', Object.keys(hookResult));
  const { departures, loading, addDeparture, updateDepartureStatus, updateDepartureVisibility, deleteDeparture, refetch } = hookResult;
  const { fleets } = useFleets(operatorId);
  const { toast } = useToast();
  
  // State variables
  const [editMode, setEditMode] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingAudioForDeparture, setUploadingAudioForDeparture] = useState<string | null>(null);
  const [editingDeparture, setEditingDeparture] = useState<string | null>(null);
  const [manualAnnouncements, setManualAnnouncements] = useState<Record<string, boolean>>({});
  const [newDeparture, setNewDeparture] = useState({
    destination: "",
    leaving_from: "",
    departure_time: "",
    status: "on-time" as "on-time" | "delayed" | "boarding" | "departed",
    estimated_time: "",
    fleet_id: "",
    trip_duration: "",
    break_duration: "",
    // Legacy fields for manual entry
    plate_number: "",
    fleet_type: "Bus" as "VIP Van" | "Bus" | "Sleeping Bus",
    fleet_image_url: ""
  });
  const [editDeparture, setEditDeparture] = useState({
    destination: "",
    leaving_from: "",
    departure_time: "",
    status: "on-time" as "on-time" | "delayed" | "boarding" | "departed",
    estimated_time: "",
    fleet_id: "",
    trip_duration: "",
    break_duration: "",
    // Legacy fields for manual entry
    plate_number: "",
    fleet_type: "Bus" as "VIP Van" | "Bus" | "Sleeping Bus",
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

    // Get fleet data if fleet selected (but not manual)
    const selectedFleet = newDeparture.fleet_id && newDeparture.fleet_id !== "manual" 
      ? fleets.find(f => f.id === newDeparture.fleet_id) 
      : null;

    const departureData = {
      branch_id: branchId,
      destination: newDeparture.destination,
      leaving_from: newDeparture.leaving_from || undefined,
      departure_time: newDeparture.departure_time,
      status: newDeparture.status,
      estimated_time: newDeparture.estimated_time || undefined,
      fleet_id: newDeparture.fleet_id !== "manual" ? newDeparture.fleet_id || undefined : undefined,
      // Use fleet data if available, otherwise use manual input
      plate_number: selectedFleet?.plate_number || newDeparture.plate_number,
      fleet_type: selectedFleet?.fleet_type || newDeparture.fleet_type,
      fleet_image_url: selectedFleet?.fleet_image_url || newDeparture.fleet_image_url || undefined,
      trip_duration: newDeparture.trip_duration || undefined,
      break_duration: newDeparture.break_duration || undefined,
      is_visible: true, // New departures are visible by default
    };

    await addDeparture(departureData);
    
    // Reset form and hide it
    setNewDeparture({
      destination: "",
      leaving_from: "",
      departure_time: "",
      status: "on-time",
      estimated_time: "",
      fleet_id: "",
      trip_duration: "",
      break_duration: "",
      plate_number: "",
      fleet_type: "Bus",
      fleet_image_url: ""
    });
    setShowAddForm(false);
  };

  const handleEditDeparture = (departure: Departure) => {
    setEditingDeparture(departure.id);
    setEditDeparture({
      destination: departure.destination,
      leaving_from: departure.leaving_from || "",
      departure_time: departure.departure_time,
      status: departure.status,
      estimated_time: departure.estimated_time || "",
      fleet_id: (departure as any).fleet_id || "",
      trip_duration: departure.trip_duration || "",
      break_duration: departure.break_duration || "",
      plate_number: departure.plate_number,
      fleet_type: departure.fleet_type,
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

    // Get fleet data if fleet selected (but not manual)
    const selectedFleet = editDeparture.fleet_id && editDeparture.fleet_id !== "manual" 
      ? fleets.find(f => f.id === editDeparture.fleet_id) 
      : null;

    try {
        const { error } = await supabase
        .from('departures')
        .update({
          destination: editDeparture.destination,
          leaving_from: editDeparture.leaving_from || null,
          departure_time: editDeparture.departure_time,
          status: editDeparture.status,
          estimated_time: editDeparture.estimated_time || null,
          fleet_id: editDeparture.fleet_id !== "manual" ? editDeparture.fleet_id || null : null,
          // Use fleet data if available, otherwise use manual input
          plate_number: selectedFleet?.plate_number || editDeparture.plate_number,
          fleet_type: selectedFleet?.fleet_type || editDeparture.fleet_type,
          fleet_image_url: selectedFleet?.fleet_image_url || editDeparture.fleet_image_url || null,
          trip_duration: editDeparture.trip_duration || null,
          break_duration: editDeparture.break_duration || null,
          is_visible: true, // Keep visible when editing
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
        leaving_from: "",
        departure_time: "",
        status: "on-time",
        estimated_time: "",
        fleet_id: "",
        trip_duration: "",
        break_duration: "",
        plate_number: "",
        fleet_type: "Bus",
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
      leaving_from: "",
      departure_time: "",
      status: "on-time",
      estimated_time: "",
      fleet_id: "",
      trip_duration: "",
      break_duration: "",
      plate_number: "",
      fleet_type: "Bus",
      fleet_image_url: ""
    });
  };

  const handleUpdateStatus = async (id: string, status: Departure['status']) => {
    const estimatedTime = status === "delayed" ? 
      prompt("Enter estimated departure time (HH:MM):") : undefined;
    
    await updateDepartureStatus(id, status, estimatedTime || undefined);
  };

  const triggerManualAnnouncement = (departureId: string) => {
    setManualAnnouncements(prev => ({
      ...prev,
      [departureId]: true
    }));
  };

  // Audio upload functionality
  const handleAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    departureId: string,
    language: 'english' | 'khmer' | 'chinese'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file (MP3, WAV, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadingAudio(true);

    try {
      // Create unique file path
      const fileExtension = file.name.split('.').pop();
      const fileName = `${departureId}/${language}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('announcement-audio')
        .upload(fileName, file, {
          upsert: true, // Replace existing file
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('announcement-audio')
        .getPublicUrl(fileName);

      // Update departure record with audio URL
      const columnName = `${language}_audio_url`;
      const { error: updateError } = await supabase
        .from('departures')
        .update({ [columnName]: publicUrl })
        .eq('id', departureId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Audio uploaded",
        description: `${language.charAt(0).toUpperCase() + language.slice(1)} audio file uploaded successfully`,
      });

      // Refresh departures to show updated data
      refetch();

    } catch (error) {
      console.error('Audio upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleDeleteAudio = async (
    departureId: string,
    language: 'english' | 'khmer' | 'chinese'
  ) => {
    setUploadingAudio(true);

    try {
      // Get the current file path from the database
      const { data: departure } = await supabase
        .from('departures')
        .select(`${language}_audio_url`)
        .eq('id', departureId)
        .single();

      if (departure && departure[`${language}_audio_url`]) {
        // Extract filename from URL for deletion
        const fileName = `${departureId}/${language}.mp3`; // Assuming mp3 for simplicity

        // Delete from storage
        await supabase.storage
          .from('announcement-audio')
          .remove([fileName]);
      }

      // Update database to remove URL
      const columnName = `${language}_audio_url`;
      const { error: updateError } = await supabase
        .from('departures')
        .update({ [columnName]: null })
        .eq('id', departureId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Audio deleted",
        description: `${language.charAt(0).toUpperCase() + language.slice(1)} audio file deleted`,
      });

      // Refresh departures
      refetch();

    } catch (error) {
      console.error('Audio deletion error:', error);
      toast({
        title: "Deletion failed",
        description: "Failed to delete audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio(false);
    }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text-display">Admin Panel</h2>
        <Button 
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "destructive" : "default"}
        >
          {editMode ? "Exit Edit Mode" : "Edit Mode"}
        </Button>
      </div>

      {/* Tabs for different management sections */}
      <Tabs defaultValue="departures" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="departures">Departure Management</TabsTrigger>
          <TabsTrigger value="fleets" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Fleet Management
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Announcement Settings
          </TabsTrigger>
          <TabsTrigger value="translations" className="flex items-center gap-2">
            Translations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="departures" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Departure Management</h3>
            {editMode && !showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                Add New Departure
              </Button>
            )}
          </div>

          {/* Add New Departure Form */}
          {editMode && showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Add New Departure</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDeparture} className="grid grid-cols-2 gap-4">
              {/* Fleet Selection */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="fleet">Select Fleet (Optional)</Label>
                <Select 
                  value={newDeparture.fleet_id} 
                  onValueChange={(value) => 
                    setNewDeparture(prev => ({...prev, fleet_id: value}))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an existing fleet or enter manually below" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="manual">Manual Entry</SelectItem>
                    {fleets.map((fleet) => (
                      <SelectItem key={fleet.id} value={fleet.id}>
                        {fleet.name} - {fleet.plate_number} ({fleet.fleet_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="leaving-from">Leaving From</Label>
                <Input
                  id="leaving-from"
                  value={newDeparture.leaving_from}
                  onChange={(e) => setNewDeparture(prev => ({...prev, leaving_from: e.target.value}))}
                  placeholder="e.g., Phnom Penh Central Station"
                />
              </div>

              {/* Manual entry fields - only show when no fleet selected or manual selected */}
              {(!newDeparture.fleet_id || newDeparture.fleet_id === "manual") && (
                <>
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
                    <Label htmlFor="plateNumber">Plate Number</Label>
                    <Input
                      id="plateNumber"
                      value={newDeparture.plate_number}
                      onChange={(e) => setNewDeparture(prev => ({...prev, plate_number: e.target.value}))}
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  value={newDeparture.destination}
                  onChange={(e) => setNewDeparture(prev => ({...prev, destination: e.target.value}))}
                  required
                />
              </div>
              
              {/* Only show manual plate number if not using fleet selection */}
              {(!newDeparture.fleet_id || newDeparture.fleet_id === "manual") && (
                <div className="space-y-2">
                  <Label htmlFor="plateNumberManual">Plate Number</Label>
                  <Input
                    id="plateNumberManual"
                    value={newDeparture.plate_number}
                    onChange={(e) => setNewDeparture(prev => ({...prev, plate_number: e.target.value}))}
                  />
                </div>
              )}
                
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
                <Label htmlFor="estimatedTime">Estimated Time (if delayed)</Label>
                <Input
                  id="estimatedTime"
                  type="time"
                  value={newDeparture.estimated_time}
                  onChange={(e) => setNewDeparture(prev => ({...prev, estimated_time: e.target.value}))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tripDuration">Trip Duration (hours)</Label>
                <Input
                  id="tripDuration"
                  placeholder="e.g., 3.5"
                  value={newDeparture.trip_duration}
                  onChange={(e) => setNewDeparture(prev => ({...prev, trip_duration: e.target.value}))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                <Input
                  id="breakDuration"
                  placeholder="e.g., 15"
                  value={newDeparture.break_duration}
                  onChange={(e) => setNewDeparture(prev => ({...prev, break_duration: e.target.value}))}
                />
              </div>

              {/* Fleet image only for manual entry */}
              {!newDeparture.fleet_id && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="fleetImage">Fleet Image (Optional)</Label>
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
              )}
              
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

        {/* Edit Departure Form */}
        {editMode && editingDeparture && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Edit Departure</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateDeparture} className="grid grid-cols-2 gap-4">
                {/* Fleet Selection */}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-fleet">Select Fleet (Optional)</Label>
                  <Select 
                    value={editDeparture.fleet_id} 
                    onValueChange={(value) => 
                      setEditDeparture(prev => ({...prev, fleet_id: value}))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an existing fleet or enter manually below" />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="manual">Manual Entry</SelectItem>
                      {fleets.map((fleet) => (
                        <SelectItem key={fleet.id} value={fleet.id}>
                          {fleet.name} - {fleet.plate_number} ({fleet.fleet_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-leaving-from">Leaving From</Label>
                  <Input
                    id="edit-leaving-from"
                    value={editDeparture.leaving_from}
                    onChange={(e) => setEditDeparture(prev => ({...prev, leaving_from: e.target.value}))}
                    placeholder="e.g., Phnom Penh Central Station"
                  />
                </div>

                {/* Manual entry fields - only show when no fleet selected or manual selected */}
                {(!editDeparture.fleet_id || editDeparture.fleet_id === "manual") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-fleetType">Fleet Type *</Label>
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
                      <Label htmlFor="edit-plateNumber">Plate Number</Label>
                      <Input
                        id="edit-plateNumber"
                        value={editDeparture.plate_number}
                        onChange={(e) => setEditDeparture(prev => ({...prev, plate_number: e.target.value}))}
                      />
                    </div>
                  </>
                )}
                
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
                  <Label htmlFor="edit-plateNumber2">Plate Number</Label>
                  <Input
                    id="edit-plateNumber2"
                    value={editDeparture.plate_number}
                    onChange={(e) => setEditDeparture(prev => ({...prev, plate_number: e.target.value}))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-departureTime">Departure Time *</Label>
                  <Input
                    id="edit-departureTime"
                    type="time"
                    value={editDeparture.departure_time}
                    onChange={(e) => setEditDeparture(prev => ({...prev, departure_time: e.target.value}))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-estimatedTime">Estimated Time (if delayed)</Label>
                  <Input
                    id="edit-estimatedTime"
                    type="time"
                    value={editDeparture.estimated_time}
                    onChange={(e) => setEditDeparture(prev => ({...prev, estimated_time: e.target.value}))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tripDuration">Trip Duration (hours)</Label>
                  <Input
                    id="edit-tripDuration"
                    placeholder="e.g., 3.5"
                    value={editDeparture.trip_duration}
                    onChange={(e) => setEditDeparture(prev => ({...prev, trip_duration: e.target.value}))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-breakDuration">Break Duration (minutes)</Label>
                  <Input
                    id="edit-breakDuration"
                    placeholder="e.g., 15"
                    value={editDeparture.break_duration}
                    onChange={(e) => setEditDeparture(prev => ({...prev, break_duration: e.target.value}))}
                  />
                </div>

                {/* Fleet image only for manual entry */}
                {(!editDeparture.fleet_id || editDeparture.fleet_id === "manual") && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-fleetImage">Fleet Image (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="edit-fleetImage"
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
                )}
                
                <div className="col-span-2 flex gap-2">
                  <Button type="submit" disabled={uploading}>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Departure
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Current Departures */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-text-display">Current Departures ({departures.length})</h2>
          </div>
          
          {/* Departures Grid */}
          <div className="grid gap-4">
            {departures.map((departure, index) => {
              const countdown = departure.status === "boarding" ? "Boarding Now" : "";
              const isBoarding = departure.status === "boarding";
              
              return (
                <Card 
                  key={departure.id} 
                  className={`bg-card transition-all duration-500 ${
                    isBoarding 
                      ? "border-2 border-blue-400 shadow-lg" 
                      : "border-2 border-border"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Fleet Picture */}
                      <div className="col-span-2">
                        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {departure.fleet_image_url && departure.fleet_image_url.trim() !== '' ? (
                            <img 
                              src={departure.fleet_image_url} 
                              alt="Fleet vehicle" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                console.error('Failed to load fleet image:', departure.fleet_image_url);
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `
                                  <div class="w-16 h-12 bg-primary/20 rounded-sm flex items-center justify-center">
                                    <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0"></path>
                                    </svg>
                                  </div>
                                `;
                              }}
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

                      {/* Fleet Type */}
                      <div className="col-span-2">
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
                        </div>
                      </div>

                      {/* Plate Number */}
                      <div className="col-span-2">
                        {departure.plate_number && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-text-display/60 font-medium">Plate:</span>
                              <div className="text-text-display/80 font-medium">{departure.plate_number}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Departure Time */}
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
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <div className="col-span-1 flex justify-end">
                        {editMode && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {/* Visibility Status */}
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                                {departure.is_visible ? (
                                  <>
                                    <Eye className="w-3 h-3 text-green-600" />
                                    <span className="text-green-600">Public</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3 h-3 text-orange-600" />
                                    <span className="text-orange-600">Hidden</span>
                                  </>
                                )}
                              </div>
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem onClick={() => updateDepartureVisibility(departure.id, !departure.is_visible)}>
                                {departure.is_visible ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                {departure.is_visible ? "Hide from public" : "Show on public"}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => triggerManualAnnouncement(departure.id)}>
                                <Play className="w-4 h-4 mr-2" />
                                Play announcement
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => setUploadingAudioForDeparture(departure.id)}>
                                <Volume2 className="w-4 h-4 mr-2" />
                                Upload audio
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => handleEditDeparture(departure)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit departure
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                onClick={() => deleteDeparture(departure.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete departure
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Status and Audio Info - Second Row */}
                    <div className="grid grid-cols-12 gap-4 items-center mt-4 pt-4 border-t border-border/10">
                      {/* Status */}
                      <div className="col-span-4">
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-text-display/60 font-medium">Status:</span>
                            <div className="mt-1">
                              <Badge className={getStatusColor(departure.status)}>
                                {departure.status.toUpperCase()}
                              </Badge>
                              {departure.status === "boarding" && (
                                <div className="text-sm font-medium text-text-display mt-1">
                                  {countdown}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Audio Status Indicators */}
                      <div className="col-span-4">
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-text-display/60 font-medium">Audio:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {departure.english_audio_url && (
                                <Badge variant="secondary" className="text-xs">EN</Badge>
                              )}
                              {departure.khmer_audio_url && (
                                <Badge variant="secondary" className="text-xs">KH</Badge>
                              )}
                              {departure.chinese_audio_url && (
                                <Badge variant="secondary" className="text-xs">CN</Badge>
                              )}
                              {!departure.english_audio_url && !departure.khmer_audio_url && !departure.chinese_audio_url && (
                                <Badge variant="outline" className="text-xs">AI Voice</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div className="col-span-4">
                        {editMode && (
                          <Select 
                            value={departure.status} 
                            onValueChange={(value: Departure['status']) => 
                              handleUpdateStatus(departure.id, value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="on-time">On Time</SelectItem>
                              <SelectItem value="delayed">Delayed</SelectItem>
                              <SelectItem value="boarding">Boarding</SelectItem>
                              <SelectItem value="departed">Departed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    
                    {/* Audio Upload Section */}
                    {uploadingAudioForDeparture === departure.id && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-text-display">Upload Custom Audio Files</h4>
                          <p className="text-sm text-text-display/60">
                            Upload MP3 files for each language. These will be used instead of AI-generated voice.
                          </p>
                          
                          <div className="grid grid-cols-3 gap-4">
                            {/* English Audio Upload */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">English</Label>
                              <div className="space-y-2">
                                <Input
                                  type="file"
                                  accept="audio/mp3,audio/mpeg,audio/wav"
                                  onChange={(e) => handleAudioUpload(e, departure.id, 'english')}
                                  disabled={uploadingAudio}
                                  className="text-sm"
                                />
                                {departure.english_audio_url && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-green-600">✓ Uploaded</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteAudio(departure.id, 'english')}
                                      className="text-xs h-6"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Khmer Audio Upload */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Khmer</Label>
                              <div className="space-y-2">
                                <Input
                                  type="file"
                                  accept="audio/mp3,audio/mpeg,audio/wav"
                                  onChange={(e) => handleAudioUpload(e, departure.id, 'khmer')}
                                  disabled={uploadingAudio}
                                  className="text-sm"
                                />
                                {departure.khmer_audio_url && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-green-600">✓ Uploaded</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteAudio(departure.id, 'khmer')}
                                      className="text-xs h-6"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Chinese Audio Upload */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Chinese</Label>
                              <div className="space-y-2">
                                <Input
                                  type="file"
                                  accept="audio/mp3,audio/mpeg,audio/wav"
                                  onChange={(e) => handleAudioUpload(e, departure.id, 'chinese')}
                                  disabled={uploadingAudio}
                                  className="text-sm"
                                />
                                {departure.chinese_audio_url && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-green-600">✓ Uploaded</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteAudio(departure.id, 'chinese')}
                                      className="text-xs h-6"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUploadingAudioForDeparture(null)}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Manual Announcement System */}
                    {manualAnnouncements[departure.id] && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <AnnouncementSystem
                          departure={departure}
                          operatorId={operatorId}
                          manualTrigger={true}
                          onComplete={() => {
                            setManualAnnouncements(prev => ({
                              ...prev,
                              [departure.id]: false
                            }));
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            {departures.length === 0 && (
              <div className="text-center py-12">
                <p className="text-text-display/60 text-xl">No departures scheduled</p>
                {editMode && (
                  <p className="text-text-display/40 text-sm mt-2">Add some departures to get started.</p>
                )}
              </div>
            )}
          </div>
        </div>
        </TabsContent>
        
        <TabsContent value="fleets">
          <FleetManagement operatorId={operatorId} />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <OperatorSettings operatorId={operatorId} />
        </TabsContent>

        <TabsContent value="translations" className="space-y-6">
          <TranslationManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;