import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOperators } from "@/hooks/useOperators";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload } from "lucide-react";

const SuperAdminPanel = () => {
  const { operators, loading, createOperator, refetch } = useOperators();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingOperator, setEditingOperator] = useState<string | null>(null);
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
                          Edit
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