import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, MapPin, Star } from "lucide-react";
import { useBranches, type Branch } from "@/hooks/useBranches";
import { useToast } from "@/hooks/use-toast";

interface BranchManagementProps {
  operatorId?: string;
}

const BranchManagement = ({ operatorId }: BranchManagementProps) => {
  const { branches, loading, createBranch, updateBranch, deleteBranch } = useBranches(operatorId);
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "", location: "" });

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId || !formData.name) return;

    await createBranch({
      operator_id: operatorId,
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      location: formData.location || undefined,
    });
    setFormData({ name: "", slug: "", location: "" });
    setShowAddForm(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !formData.name) return;

    await updateBranch(editingBranch, {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      location: formData.location || undefined,
    });
    setEditingBranch(null);
    setFormData({ name: "", slug: "", location: "" });
  };

  const handleDelete = async (branch: Branch) => {
    if (branch.is_default) {
      toast({
        title: "Cannot delete",
        description: "Cannot delete the default (HQ) branch.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Delete branch "${branch.name}"? Departures linked to this branch must be moved first.`)) return;
    await deleteBranch(branch.id);
  };

  const startEdit = (branch: Branch) => {
    setEditingBranch(branch.id);
    setFormData({ name: branch.name, slug: branch.slug, location: branch.location || "" });
    setShowAddForm(false);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingBranch(null);
    setFormData({ name: "", slug: "", location: "" });
  };

  if (loading) return <div className="text-center py-4">Loading branches...</div>;

  const renderForm = (onSubmit: (e: React.FormEvent) => void, title: string, submitLabel: string) => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={cancelForm}>Cancel</Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Branch Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  name,
                  slug: prev.slug === generateSlug(prev.name) || !prev.slug ? generateSlug(name) : prev.slug,
                }));
              }}
              placeholder="e.g., Siem Reap Branch"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="auto-generated"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Street 1, Siem Reap"
            />
          </div>
          <div className="col-span-3">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Branch Management</h3>
        {!showAddForm && !editingBranch && (
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Branch
          </Button>
        )}
      </div>

      {showAddForm && renderForm(handleCreate, "Add New Branch", "Create Branch")}
      {editingBranch && renderForm(handleUpdate, "Edit Branch", "Update Branch")}

      <div className="grid gap-3">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{branch.name}</span>
                    {branch.is_default && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="w-3 h-3" /> HQ
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    /{branch.slug}
                    {branch.location && ` · ${branch.location}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(branch)}>
                  <Edit className="w-4 h-4" />
                </Button>
                {!branch.is_default && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(branch)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {branches.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No branches yet. Create your first branch above.</p>
        )}
      </div>
    </div>
  );
};

export default BranchManagement;
