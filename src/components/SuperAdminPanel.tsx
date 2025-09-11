import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useOperators } from "@/hooks/useOperators";
import { useBranches } from "@/hooks/useBranches";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Building2, Trash2, Edit2, MapPin } from "lucide-react";

const SuperAdminPanel = () => {
  const { operators, loading, createOperator, refetch } = useOperators();
  const { branches, createBranch, refetch: refetchBranches } = useBranches();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingOperator, setEditingOperator] = useState<string | null>(null);
  const [managingBranches, setManagingBranches] = useState<string | null>(null);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [showAddBranch, setShowAddBranch] = useState<string | null>(null);
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
    </div>
  );
};

export default SuperAdminPanel;