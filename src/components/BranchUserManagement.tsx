import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Copy, Check, KeyRound, Mail, Calendar, Building2 } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BranchUser {
  id: string;
  username: string;
  role: string;
  branch_id: string | null;
  email: string;
  created_at: string;
  branches: { name: string; slug: string; location: string | null } | null;
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
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetCredentials, setResetCredentials] = useState<{ email: string; password: string } | null>(null);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { action: 'list-branch-users', operator_id: operatorId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBranchUsers(data?.users || []);
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
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          action: 'create',
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
      setCreatedCredentials({ email: form.email, password: form.password, branch: branchName });
      toast({ title: 'Success', description: `Branch admin account created for ${branchName}` });
      setForm({ username: '', email: '', password: '', branch_id: '' });
      fetchBranchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create branch user', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { action: 'delete', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Deleted', description: `Account "${username}" has been removed` });
      fetchBranchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete user', variant: 'destructive' });
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = `Reset${Math.random().toString(36).slice(2, 8)}!`;
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { action: 'reset-password', user_id: userId, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResetPasswordUserId(userId);
      setResetCredentials({ email, password: newPassword });
      toast({ title: 'Password Reset', description: 'New password generated successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reset password', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading branch users...</div>;

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
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}{branch.is_default ? ' (HQ)' : ''}{branch.location ? ` — ${branch.location}` : ''}
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
              <CredentialsCard
                label="Account created! Share these credentials:"
                branch={createdCredentials.branch}
                email={createdCredentials.email}
                password={createdCredentials.password}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            )}
          </CardContent>
        </Card>
      )}

      {branchUsers.length > 0 ? (
        <div className="grid gap-3">
          {branchUsers.map(user => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-base">{user.username}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{user.branches?.name || 'Unknown Branch'}</span>
                      {user.branches?.location && (
                        <span className="text-xs">({user.branches.location})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Created {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Branch Admin</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user.id, user.email)}
                      className="flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Reset Password
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Branch Admin Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the account for <strong>{user.username}</strong> ({user.email})?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(user.id, user.username)}>
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {resetPasswordUserId === user.id && resetCredentials && (
                  <CredentialsCard
                    label="New password generated:"
                    email={resetCredentials.email}
                    password={resetCredentials.password}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}
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

function CredentialsCard({
  label, branch, email, password, copiedField, onCopy,
}: {
  label: string;
  branch?: string;
  email: string;
  password: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  return (
    <div className="mt-4 p-4 bg-muted rounded-lg border border-border space-y-2">
      <p className="font-medium text-sm">{label}</p>
      {branch && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Branch:</span>
          <span className="font-medium">{branch}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Email:</span>
        <code className="bg-background px-2 py-0.5 rounded">{email}</code>
        <Button variant="ghost" size="sm" onClick={() => onCopy(email, 'email')}>
          {copiedField === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Password:</span>
        <code className="bg-background px-2 py-0.5 rounded">{password}</code>
        <Button variant="ghost" size="sm" onClick={() => onCopy(password, 'password')}>
          {copiedField === 'password' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

export default BranchUserManagement;
