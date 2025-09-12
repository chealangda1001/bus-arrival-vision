import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOperators } from "@/hooks/useOperators";
import { useBranches } from "@/hooks/useBranches";
import { useDepartures } from "@/hooks/useDepartures";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Building2, Trash2, Edit2, MapPin, Clock, Bus, Truck } from "lucide-react";
import FleetManagement from "./FleetManagement";

const SuperAdminPanel = () => {
  const { user } = useSupabaseAuth();
  const { operators, loading, createOperator, refetch } = useOperators();
  const { branches, createBranch, refetch: refetchBranches } = useBranches();
  const { departures, addDeparture, updateDepartureStatus, deleteDeparture, refetch: refetchDepartures } = useDepartures();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingOperator, setEditingOperator] = useState<string | null>(null);
  const [managingBranches, setManagingBranches] = useState<string | null>(null);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [showAddBranch, setShowAddBranch] = useState<string | null>(null);
  const [managingDepartures, setManagingDepartures] = useState<string | null>(null);
  const [editingDeparture, setEditingDeparture] = useState<string | null>(null);
  const [showAddDeparture, setShowAddDeparture] = useState<string | null>(null);
  const [newOperator, setNewOperator] = useState({
    name: "",
    slug: "",
    logo_url: "",
    admin_username: "",
    admin_password: "",
    branch_name: "",
    branch_location: ""
  });
  const [editOperator, setEditOperator] = useState({
    name: "",
    slug: "",
    logo_url: ""
  });
  const [newBranch, setNewBranch] = useState({
    name: "",
    slug: "",
    location: "",
    is_default: false
  });
  const [editBranch, setEditBranch] = useState({
    name: "",
    slug: "",
    location: "",
    is_default: false
  });
  const [newDeparture, setNewDeparture] = useState({
    destination: "",
    plate_number: "",
    departure_time: "",
    status: "on-time" as const,
    estimated_time: "",
    fleet_type: "Bus" as const,
    fleet_image_url: ""
  });
  const [editDeparture, setEditDeparture] = useState({
    destination: "",
    plate_number: "",
    departure_time: "",
    status: "on-time" as const,
    estimated_time: "",
    fleet_type: "Bus" as const,
    fleet_image_url: ""
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `operator-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fleet-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('fleet-images')
        .getPublicUrl(filePath);

      // Update the appropriate state based on whether we're creating or editing
      if (editingOperator) {
        setEditOperator(prev => ({ ...prev, logo_url: data.publicUrl }));
      } else {
        setNewOperator(prev => ({ ...prev, logo_url: data.publicUrl }));
      }
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFleetImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `fleet-${Math.random()}.${fileExt}`;
      const filePath = `fleet-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fleet-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('fleet-images')
        .getPublicUrl(filePath);

      // Update the appropriate state based on whether we're creating or editing
      if (editingDeparture) {
        setEditDeparture(prev => ({ ...prev, fleet_image_url: data.publicUrl }));
      } else {
        setNewDeparture(prev => ({ ...prev, fleet_image_url: data.publicUrl }));
      }
      
      toast({
        title: "Success",
        description: "Fleet image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading fleet image:', error);
      toast({
        title: "Error",
        description: "Failed to upload fleet image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newOperator.name || !newOperator.slug || !newOperator.admin_username || !newOperator.admin_password || !newOperator.branch_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (including first branch name)",
        variant: "destructive",
      });
      return;
    }

    await createOperator(newOperator);
    setNewOperator({
      name: "",
      slug: "",
      logo_url: "",
      admin_username: "",
      admin_password: "",
      branch_name: "",
      branch_location: ""
    });
    setShowCreateForm(false);
  };

  const handleEditOperator = (operator: any) => {
    setEditingOperator(operator.id);
    setEditOperator({
      name: operator.name,
      slug: operator.slug,
      logo_url: operator.logo_url || ""
    });
  };

  const handleUpdateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editOperator.name || !editOperator.slug || !editingOperator) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('operators')
        .update({
          name: editOperator.name,
          slug: editOperator.slug,
          logo_url: editOperator.logo_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOperator);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Operator "${editOperator.name}" updated successfully`,
      });
      
      setEditingOperator(null);
      setEditOperator({ name: "", slug: "", logo_url: "" });
      refetch();
    } catch (error) {
      console.error('Update operator error:', error);
      toast({
        title: "Error",
        description: "Failed to update operator",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingOperator(null);
    setEditOperator({ name: "", slug: "", logo_url: "" });
  };

  // Branch Management Functions
  const handleAddBranch = (operatorId: string) => {
    setShowAddBranch(operatorId);
    setNewBranch({ name: "", slug: "", location: "", is_default: false });
  };

  const handleCreateBranch = async (e: React.FormEvent, operatorId: string) => {
    e.preventDefault();
    
    if (!newBranch.name || !newBranch.slug) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    await createBranch({
      operator_id: operatorId,
      name: newBranch.name,
      slug: newBranch.slug,
      location: newBranch.location || null
    });
    
    setShowAddBranch(null);
    setNewBranch({ name: "", slug: "", location: "", is_default: false });
    refetchBranches();
  };

  const handleEditBranch = (branch: any) => {
    setEditingBranch(branch.id);
    setEditBranch({
      name: branch.name,
      slug: branch.slug,
      location: branch.location || "",
      is_default: branch.is_default
    });
  };

  const handleUpdateBranch = async (e: React.FormEvent, branchId: string) => {
    e.preventDefault();
    
    if (!editBranch.name || !editBranch.slug) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: editBranch.name,
          slug: editBranch.slug,
          location: editBranch.location || null,
          is_default: editBranch.is_default,
          updated_at: new Date().toISOString()
        })
        .eq('id', branchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Branch updated successfully",
      });
      
      setEditingBranch(null);
      setEditBranch({ name: "", slug: "", location: "", is_default: false });
      refetchBranches();
    } catch (error) {
      console.error('Update branch error:', error);
      toast({
        title: "Error",
        description: "Failed to update branch",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Branch "${branchName}" deleted successfully`,
      });
      
      refetchBranches();
    } catch (error) {
      console.error('Delete branch error:', error);
      toast({
        title: "Error",
        description: "Failed to delete branch",
        variant: "destructive",
      });
    }
  };

  const cancelBranchEdit = () => {
    setEditingBranch(null);
    setEditBranch({ name: "", slug: "", location: "", is_default: false });
    setShowAddBranch(null);
    setNewBranch({ name: "", slug: "", location: "", is_default: false });
  };

  const getBranchesForOperator = (operatorId: string) => {
    return branches.filter(branch => branch.operator_id === operatorId);
  };

  const getDeparturesForBranch = (branchId: string) => {
    return departures.filter(departure => departure.branch_id === branchId);
  };

  // Departure Management Functions
  const handleAddDeparture = (branchId: string) => {
    setShowAddDeparture(branchId);
    setNewDeparture({
      destination: "",
      plate_number: "",
      departure_time: "",
      status: "on-time",
      estimated_time: "",
      fleet_type: "Bus",
      fleet_image_url: ""
    });
  };

  const handleCreateDeparture = async (e: React.FormEvent, branchId: string) => {
    e.preventDefault();
    
    if (!newDeparture.destination || !newDeparture.plate_number || !newDeparture.departure_time) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    await addDeparture({
      branch_id: branchId,
      destination: newDeparture.destination,
      plate_number: newDeparture.plate_number,
      departure_time: newDeparture.departure_time,
      status: newDeparture.status,
      estimated_time: newDeparture.estimated_time || undefined,
      fleet_type: newDeparture.fleet_type,
      fleet_image_url: newDeparture.fleet_image_url || undefined
    });
    
    setShowAddDeparture(null);
    setNewDeparture({
      destination: "",
      plate_number: "",
      departure_time: "",
      status: "on-time",
      estimated_time: "",
      fleet_type: "Bus",
      fleet_image_url: ""
    });
    refetchDepartures();
  };

  const handleEditDeparture = (departure: any) => {
    setEditingDeparture(departure.id);
    setEditDeparture({
      destination: departure.destination,
      plate_number: departure.plate_number,
      departure_time: departure.departure_time,
      status: departure.status,
      estimated_time: departure.estimated_time || "",
      fleet_type: departure.fleet_type,
      fleet_image_url: departure.fleet_image_url || ""
    });
  };

  const handleUpdateDeparture = async (e: React.FormEvent, departureId: string) => {
    e.preventDefault();
    
    if (!editDeparture.destination || !editDeparture.plate_number || !editDeparture.departure_time) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
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
          estimated_time: editDeparture.estimated_time || null,
          fleet_type: editDeparture.fleet_type,
          fleet_image_url: editDeparture.fleet_image_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', departureId);

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
        estimated_time: "",
        fleet_type: "Bus",
        fleet_image_url: ""
      });
      refetchDepartures();
    } catch (error) {
      console.error('Update departure error:', error);
      toast({
        title: "Error",
        description: "Failed to update departure",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDeparture = async (departureId: string, destination: string) => {
    if (!confirm(`Are you sure you want to delete departure to "${destination}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('departures')
        .delete()
        .eq('id', departureId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Departure to "${destination}" deleted successfully`,
      });
      
      refetchDepartures();
    } catch (error) {
      console.error('Delete departure error:', error);
      toast({
        title: "Error",
        description: "Failed to delete departure",
        variant: "destructive",
      });
    }
  };

  const cancelDepartureEdit = () => {
    setEditingDeparture(null);
    setEditDeparture({
      destination: "",
      plate_number: "",
      departure_time: "",
      status: "on-time",
      estimated_time: "",
      fleet_type: "Bus",
      fleet_image_url: ""
    });
    setShowAddDeparture(null);
    setNewDeparture({
      destination: "",
      plate_number: "",
      departure_time: "",
      status: "on-time",
      estimated_time: "",
      fleet_type: "Bus",
      fleet_image_url: ""
    });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-text-display text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-display">Super Admin Panel</h2>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Operator
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="operators" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operators">Operator Management</TabsTrigger>
          <TabsTrigger value="fleets" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Fleet Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="operators" className="space-y-6">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-display">Super Admin Panel</h2>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Operator
        </Button>
      </div>

      {/* Create Operator Form */}
      {showCreateForm && (
        <Card className="bg-accent/5">
          <CardHeader>
            <CardTitle>Create New Operator</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOperator} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="operator-name">Operator Name *</Label>
                  <Input
                    id="operator-name"
                    value={newOperator.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewOperator(prev => ({
                        ...prev,
                        name,
                        slug: generateSlug(name)
                      }));
                    }}
                    placeholder="Premium Bus Co."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="operator-slug">URL Slug *</Label>
                  <Input
                    id="operator-slug"
                    value={newOperator.slug}
                    onChange={(e) => setNewOperator(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="premium-bus-co"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-username">Admin Username *</Label>
                  <Input
                    id="admin-username"
                    value={newOperator.admin_username}
                    onChange={(e) => setNewOperator(prev => ({ ...prev, admin_username: e.target.value }))}
                    placeholder="premium_admin"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-password">Admin Password *</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={newOperator.admin_password}
                    onChange={(e) => setNewOperator(prev => ({ ...prev, admin_password: e.target.value }))}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="branch-name">First Branch Name *</Label>
                  <Input
                    id="branch-name"
                    value={newOperator.branch_name}
                    onChange={(e) => setNewOperator(prev => ({ ...prev, branch_name: e.target.value }))}
                    placeholder="Main Terminal"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="branch-location">Branch Location</Label>
                  <Input
                    id="branch-location"
                    value={newOperator.branch_location}
                    onChange={(e) => setNewOperator(prev => ({ ...prev, branch_location: e.target.value }))}
                    placeholder="City Center, Main St."
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="logo-upload">Logo Upload</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <Button type="button" variant="outline" disabled={uploading}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Logo"}
                  </Button>
                </div>
                {newOperator.logo_url && (
                  <img 
                    src={newOperator.logo_url} 
                    alt="Logo preview" 
                    className="mt-2 w-16 h-16 rounded-lg object-cover"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Operator</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Operators List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Operators</CardTitle>
        </CardHeader>
        <CardContent>
          {operators.length === 0 ? (
            <div className="text-center py-8 text-text-display/60">
              No operators created yet
            </div>
          ) : (
            <div className="space-y-4">
              {operators.map((operator) => (
                <Card key={operator.id} className="p-6">
                  {editingOperator === operator.id ? (
                    <form onSubmit={handleUpdateOperator} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-name">Operator Name *</Label>
                          <Input
                            id="edit-name"
                            value={editOperator.name}
                            onChange={(e) => setEditOperator(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-slug">Slug *</Label>
                          <Input
                            id="edit-slug"
                            value={editOperator.slug}
                            onChange={(e) => setEditOperator(prev => ({ ...prev, slug: e.target.value }))}
                            placeholder="operator-slug"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="edit-logo">Logo Upload</Label>
                          <Input
                            id="edit-logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={uploading}
                          />
                          {editOperator.logo_url && (
                            <img 
                              src={editOperator.logo_url} 
                              alt="Current logo"
                              className="w-16 h-16 object-cover rounded mt-2"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button type="submit" disabled={uploading}>
                          {uploading ? "Uploading..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {operator.logo_url && (
                          <img 
                            src={operator.logo_url} 
                            alt={`${operator.name} logo`}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-text-display">{operator.name}</h3>
                          <p className="text-text-display/60">Slug: /{operator.slug}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleEditOperator(operator)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setManagingBranches(managingBranches === operator.id ? null : operator.id)}
                        >
                          <Building2 className="w-4 h-4 mr-1" />
                          Branches
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(`/operator/${operator.slug}`, '_blank')}
                        >
                          View Board
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Branch Management Section */}
                  {managingBranches === operator.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-text-display">Manage Branches</h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddBranch(operator.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Branch
                        </Button>
                      </div>

                      {/* Add Branch Form */}
                      {showAddBranch === operator.id && (
                        <Card className="mb-4 bg-accent/5">
                          <CardContent className="p-4">
                            <form onSubmit={(e) => handleCreateBranch(e, operator.id)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="new-branch-name">Branch Name *</Label>
                                  <Input
                                    id="new-branch-name"
                                    value={newBranch.name}
                                    onChange={(e) => {
                                      const name = e.target.value;
                                      setNewBranch(prev => ({
                                        ...prev,
                                        name,
                                        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                                      }));
                                    }}
                                    placeholder="Main Terminal"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="new-branch-slug">Branch Slug *</Label>
                                  <Input
                                    id="new-branch-slug"
                                    value={newBranch.slug}
                                    onChange={(e) => setNewBranch(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="main-terminal"
                                    required
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <Label htmlFor="new-branch-location">Location</Label>
                                  <Input
                                    id="new-branch-location"
                                    value={newBranch.location}
                                    onChange={(e) => setNewBranch(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="City Center, Main St."
                                  />
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button type="submit" size="sm">Create Branch</Button>
                                <Button type="button" variant="outline" size="sm" onClick={cancelBranchEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      )}

                      {/* Branches List */}
                      <div className="space-y-2">
                        {getBranchesForOperator(operator.id).map((branch) => (
                          <Card key={branch.id} className="bg-background/50">
                            <CardContent className="p-4">
                              {editingBranch === branch.id ? (
                                <form onSubmit={(e) => handleUpdateBranch(e, branch.id)} className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="edit-branch-name">Branch Name *</Label>
                                      <Input
                                        id="edit-branch-name"
                                        value={editBranch.name}
                                        onChange={(e) => setEditBranch(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-branch-slug">Branch Slug *</Label>
                                      <Input
                                        id="edit-branch-slug"
                                        value={editBranch.slug}
                                        onChange={(e) => setEditBranch(prev => ({ ...prev, slug: e.target.value }))}
                                        required
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <Label htmlFor="edit-branch-location">Location</Label>
                                      <Input
                                        id="edit-branch-location"
                                        value={editBranch.location}
                                        onChange={(e) => setEditBranch(prev => ({ ...prev, location: e.target.value }))}
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="edit-branch-default"
                                        checked={editBranch.is_default}
                                        onCheckedChange={(checked) => setEditBranch(prev => ({ ...prev, is_default: Boolean(checked) }))}
                                      />
                                      <Label htmlFor="edit-branch-default">Default Branch</Label>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button type="submit" size="sm">Save Changes</Button>
                                    <Button type="button" variant="outline" size="sm" onClick={cancelBranchEdit}>
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Building2 className="w-4 h-4 text-primary" />
                                    <div>
                                      <span className="font-medium text-text-display">
                                        {branch.name}
                                        {branch.is_default && (
                                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                            DEFAULT
                                          </span>
                                        )}
                                      </span>
                                      <div className="text-sm text-text-display/60">
                                        /{branch.slug}
                                        {branch.location && (
                                          <span className="ml-2">
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {branch.location}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                   <div className="flex space-x-2">
                                     <Button 
                                       variant="ghost" 
                                       size="sm"
                                       onClick={() => setManagingDepartures(managingDepartures === branch.id ? null : branch.id)}
                                     >
                                       <Bus className="w-3 h-3 mr-1" />
                                       Departures
                                     </Button>
                                     <Button 
                                       variant="ghost" 
                                       size="sm"
                                       onClick={() => handleEditBranch(branch)}
                                     >
                                       <Edit2 className="w-3 h-3" />
                                     </Button>
                                     <Button 
                                       variant="ghost" 
                                       size="sm"
                                       onClick={() => handleDeleteBranch(branch.id, branch.name)}
                                       className="text-red-500 hover:text-red-600"
                                     >
                                       <Trash2 className="w-3 h-3" />
                                     </Button>
                                   </div>
                                </div>
                               )}

                               {/* Departure Management Section */}
                               {managingDepartures === branch.id && (
                                 <div className="mt-4 pt-4 border-t border-border">
                                   <div className="flex items-center justify-between mb-4">
                                     <h5 className="font-medium text-text-display">Manage Departures</h5>
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => handleAddDeparture(branch.id)}
                                     >
                                       <Plus className="w-3 h-3 mr-1" />
                                       Add Departure
                                     </Button>
                                   </div>

                                   {/* Add Departure Form */}
                                   {showAddDeparture === branch.id && (
                                     <Card className="mb-4 bg-accent/10">
                                       <CardContent className="p-4">
                                         <form onSubmit={(e) => handleCreateDeparture(e, branch.id)} className="space-y-4">
                                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                             <div>
                                               <Label htmlFor="new-departure-destination">Destination *</Label>
                                               <Input
                                                 id="new-departure-destination"
                                                 value={newDeparture.destination}
                                                 onChange={(e) => setNewDeparture(prev => ({ ...prev, destination: e.target.value }))}
                                                 placeholder="Phnom Penh"
                                                 required
                                               />
                                             </div>
                                             <div>
                                               <Label htmlFor="new-departure-plate">Plate Number *</Label>
                                               <Input
                                                 id="new-departure-plate"
                                                 value={newDeparture.plate_number}
                                                 onChange={(e) => setNewDeparture(prev => ({ ...prev, plate_number: e.target.value }))}
                                                 placeholder="1A-2345"
                                                 required
                                               />
                                             </div>
                                             <div>
                                               <Label htmlFor="new-departure-time">Departure Time *</Label>
                                               <Input
                                                 id="new-departure-time"
                                                 type="time"
                                                 value={newDeparture.departure_time}
                                                 onChange={(e) => setNewDeparture(prev => ({ ...prev, departure_time: e.target.value }))}
                                                 required
                                               />
                                             </div>
                                             <div>
                                               <Label htmlFor="new-departure-fleet">Fleet Type *</Label>
                                               <Select 
                                                 value={newDeparture.fleet_type} 
                                                 onValueChange={(value) => setNewDeparture(prev => ({ ...prev, fleet_type: value as any }))}
                                               >
                                                 <SelectTrigger>
                                                   <SelectValue placeholder="Select fleet type" />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                   <SelectItem value="VIP Van">VIP Van</SelectItem>
                                                   <SelectItem value="Bus">Bus</SelectItem>
                                                   <SelectItem value="Sleeping Bus">Sleeping Bus</SelectItem>
                                                 </SelectContent>
                                               </Select>
                                             </div>
                                             <div>
                                               <Label htmlFor="new-departure-status">Status</Label>
                                               <Select 
                                                 value={newDeparture.status} 
                                                 onValueChange={(value) => setNewDeparture(prev => ({ ...prev, status: value as any }))}
                                               >
                                                 <SelectTrigger>
                                                   <SelectValue placeholder="Select status" />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                   <SelectItem value="on-time">On Time</SelectItem>
                                                   <SelectItem value="delayed">Delayed</SelectItem>
                                                   <SelectItem value="boarding">Boarding</SelectItem>
                                                   <SelectItem value="departed">Departed</SelectItem>
                                                 </SelectContent>
                                               </Select>
                                             </div>
                                              <div>
                                                <Label htmlFor="new-departure-estimated">Estimated Time</Label>
                                                <Input
                                                  id="new-departure-estimated"
                                                  type="time"
                                                  value={newDeparture.estimated_time}
                                                  onChange={(e) => setNewDeparture(prev => ({ ...prev, estimated_time: e.target.value }))}
                                                />
                                              </div>
                                            </div>
                                            <div>
                                              <Label htmlFor="new-departure-fleet-image">Fleet Image</Label>
                                              <div className="flex items-center gap-4">
                                                <Input
                                                  id="new-departure-fleet-image"
                                                  type="file"
                                                  accept="image/*"
                                                  onChange={handleFleetImageUpload}
                                                  disabled={uploading}
                                                />
                                                <Button type="button" variant="outline" disabled={uploading}>
                                                  <Upload className="w-4 h-4 mr-2" />
                                                  {uploading ? "Uploading..." : "Upload Image"}
                                                </Button>
                                              </div>
                                              {newDeparture.fleet_image_url && (
                                                <img 
                                                  src={newDeparture.fleet_image_url} 
                                                  alt="Fleet preview" 
                                                  className="mt-2 w-16 h-16 rounded-lg object-cover"
                                                />
                                              )}
                                            </div>
                                           <div className="flex space-x-2">
                                             <Button type="submit" size="sm">Create Departure</Button>
                                             <Button type="button" variant="outline" size="sm" onClick={cancelDepartureEdit}>
                                               Cancel
                                             </Button>
                                           </div>
                                         </form>
                                       </CardContent>
                                     </Card>
                                   )}

                                   {/* Departures List */}
                                   <div className="space-y-2">
                                     {getDeparturesForBranch(branch.id).map((departure) => (
                                       <Card key={departure.id} className="bg-background/30">
                                         <CardContent className="p-3">
                                           {editingDeparture === departure.id ? (
                                             <form onSubmit={(e) => handleUpdateDeparture(e, departure.id)} className="space-y-4">
                                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                 <div>
                                                   <Label htmlFor="edit-departure-destination">Destination *</Label>
                                                   <Input
                                                     id="edit-departure-destination"
                                                     value={editDeparture.destination}
                                                     onChange={(e) => setEditDeparture(prev => ({ ...prev, destination: e.target.value }))}
                                                     required
                                                   />
                                                 </div>
                                                 <div>
                                                   <Label htmlFor="edit-departure-plate">Plate Number *</Label>
                                                   <Input
                                                     id="edit-departure-plate"
                                                     value={editDeparture.plate_number}
                                                     onChange={(e) => setEditDeparture(prev => ({ ...prev, plate_number: e.target.value }))}
                                                     required
                                                   />
                                                 </div>
                                                 <div>
                                                   <Label htmlFor="edit-departure-time">Departure Time *</Label>
                                                   <Input
                                                     id="edit-departure-time"
                                                     type="time"
                                                     value={editDeparture.departure_time}
                                                     onChange={(e) => setEditDeparture(prev => ({ ...prev, departure_time: e.target.value }))}
                                                     required
                                                   />
                                                 </div>
                                                 <div>
                                                   <Label htmlFor="edit-departure-fleet">Fleet Type</Label>
                                                   <Select 
                                                     value={editDeparture.fleet_type} 
                                                     onValueChange={(value) => setEditDeparture(prev => ({ ...prev, fleet_type: value as any }))}
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
                                                 <div>
                                                   <Label htmlFor="edit-departure-status">Status</Label>
                                                   <Select 
                                                     value={editDeparture.status} 
                                                     onValueChange={(value) => setEditDeparture(prev => ({ ...prev, status: value as any }))}
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
                                                  <div>
                                                    <Label htmlFor="edit-departure-estimated">Estimated Time</Label>
                                                    <Input
                                                      id="edit-departure-estimated"
                                                      type="time"
                                                      value={editDeparture.estimated_time}
                                                      onChange={(e) => setEditDeparture(prev => ({ ...prev, estimated_time: e.target.value }))}
                                                    />
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label htmlFor="edit-departure-fleet-image">Fleet Image</Label>
                                                  <div className="flex items-center gap-4">
                                                    <Input
                                                      id="edit-departure-fleet-image"
                                                      type="file"
                                                      accept="image/*"
                                                      onChange={handleFleetImageUpload}
                                                      disabled={uploading}
                                                    />
                                                    <Button type="button" variant="outline" disabled={uploading}>
                                                      <Upload className="w-4 h-4 mr-2" />
                                                      {uploading ? "Uploading..." : "Upload Image"}
                                                    </Button>
                                                  </div>
                                                  {editDeparture.fleet_image_url && (
                                                    <img 
                                                      src={editDeparture.fleet_image_url} 
                                                      alt="Fleet preview" 
                                                      className="mt-2 w-16 h-16 rounded-lg object-cover"
                                                    />
                                                  )}
                                                </div>
                                               <div className="flex space-x-2">
                                                 <Button type="submit" size="sm">Save Changes</Button>
                                                 <Button type="button" variant="outline" size="sm" onClick={cancelDepartureEdit}>
                                                   Cancel
                                                 </Button>
                                               </div>
                                             </form>
                                           ) : (
                                             <div className="flex items-center justify-between">
                                               <div className="flex items-center space-x-3">
                                                 <Clock className="w-4 h-4 text-primary" />
                                                 <div>
                                                   <div className="font-medium text-text-display">
                                                     {departure.destination} - {departure.departure_time}
                                                   </div>
                                                   <div className="text-sm text-text-display/60">
                                                     {departure.plate_number} | {departure.fleet_type} | 
                                                     <span className={`ml-1 ${
                                                       departure.status === 'on-time' ? 'text-green-600' :
                                                       departure.status === 'delayed' ? 'text-red-600' :
                                                       departure.status === 'boarding' ? 'text-blue-600' :
                                                       'text-gray-600'
                                                     }`}>
                                                       {departure.status.toUpperCase()}
                                                     </span>
                                                     {departure.estimated_time && (
                                                       <span className="ml-1">| Est: {departure.estimated_time}</span>
                                                     )}
                                                   </div>
                                                 </div>
                                               </div>
                                               <div className="flex space-x-2">
                                                 <Button 
                                                   variant="ghost" 
                                                   size="sm"
                                                   onClick={() => handleEditDeparture(departure)}
                                                 >
                                                   <Edit2 className="w-3 h-3" />
                                                 </Button>
                                                 <Button 
                                                   variant="ghost" 
                                                   size="sm"
                                                   onClick={() => handleDeleteDeparture(departure.id, departure.destination)}
                                                   className="text-red-500 hover:text-red-600"
                                                 >
                                                   <Trash2 className="w-3 h-3" />
                                                 </Button>
                                               </div>
                                             </div>
                                           )}
                                         </CardContent>
                                       </Card>
                                     ))}
                                     
                                     {getDeparturesForBranch(branch.id).length === 0 && (
                                       <div className="text-center py-4 text-text-display/60">
                                         No departures found for this branch
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               )}
                             </CardContent>
                           </Card>
                         ))}
                         
                         {getBranchesForOperator(operator.id).length === 0 && (
                           <div className="text-center py-4 text-text-display/60">
                             No branches found for this operator
                           </div>
                         )}
                       </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="fleets">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-text-display">Fleet Management</h2>
            {operators.map((operator) => (
              <Card key={operator.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {operator.name} Fleet Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FleetManagement operatorId={operator.id} isSuperAdmin={true} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

export default SuperAdminPanel;