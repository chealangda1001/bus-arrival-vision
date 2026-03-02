import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Copy, Check } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BranchUser {
  id: string;
  username: string;
  role: string;
  branch_id: string | null;
  branch?: { name: string; slug: string } | null;
}

interface BranchUserManagementProps {
  operatorId?: string;
}

const BranchUserManagement = ({ operatorId }: BranchUserManagementProps) => {
  const { branches } = useBranches(operatorId);
  const { toast } = useToast();
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    branch: string;
  } | null>(null);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    branch_id: '',
  });

  const fetchBranchUsers = async () => {
    if (!operatorId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, role, branch_id,
          branches:branch_id (name, slug)
        `)
        .eq('operator_id', operatorId)
        .eq('role', 'operator_admin')
        .not('branch_id', 'is', null);

      if (error) throw error;
      setBranchUsers(data || []);
    } catch (error) {
      console.error('Error fetching branch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchUsers();
  }, [operatorId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password || !form.branch_id) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: form.email,
          password: form.password,
          username: form.username,
          role: 'operator_admin',
          operator_id: operatorId,
          branch_id: form.branch_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const branchName = branches.find(b => b.id === form.branch_id)?.name || '';
      setCreatedCredentials({
        email: form.email,
        password: form.password,
        branch: branchName,
      });

      toast({ title: 'Success', description: `Branch admin account created for ${branchName}` });
      setForm({ username: '', email: '', password: '', branch_id: '' });
      fetchBranchUsers();
    } catch (error: any) {
      console.error('Error creating branch user:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create branch user', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) return <div className="text-center py-8">Loading branch users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Branch User Accounts</h3>
          <p className="text-sm text-muted-foreground">Create admin accounts scoped to specific branches</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setCreatedCredentials(null); }} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Create Branch User
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">New Branch Admin Account</CardTitle>
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setCreatedCredentials(null); }}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g., Siem Reap Admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select value={form.branch_id} onValueChange={(v) => setForm(prev => ({ ...prev, branch_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.filter(b => !b.is_default).map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                    {branches.filter(b => b.is_default).map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} (HQ)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="branch-admin@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              <div className="col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Branch Admin'}
                </Button>
              </div>
            </form>

            {createdCredentials && (
              <div className="mt-4 p-4 bg-muted rounded-lg border border-border space-y-2">
                <p className="font-medium text-sm">Account created! Share these credentials:</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Branch:</span>
                  <span className="font-medium">{createdCredentials.branch}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <code className="bg-background px-2 py-0.5 rounded">{createdCredentials.email}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(createdCredentials.email, 'email')}>
                    {copiedField === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Password:</span>
                  <code className="bg-background px-2 py-0.5 rounded">{createdCredentials.password}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(createdCredentials.password, 'password')}>
                    {copiedField === 'password' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing branch users list */}
      {branchUsers.length > 0 ? (
        <div className="grid gap-3">
          {branchUsers.map(user => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-muted-foreground">Branch Admin</p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {user.branch?.name || 'Unknown Branch'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No branch user accounts yet. Create one to allow branch-specific departure management.
        </div>
      )}
    </div>
  );
};

export default BranchUserManagement;
