import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDepartures, type Departure } from "@/hooks/useDepartures";

interface DriverProfile {
  id: string;
  username: string;
  role: string;
  operator_id: string | null;
  branch_id: string | null;
}

interface DriverManagementProps {
  operatorId?: string;
  branchId?: string;
}

const DriverManagement = ({ operatorId, branchId }: DriverManagementProps) => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driverAssignments, setDriverAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newDriver, setNewDriver] = useState({ email: '', password: '', username: '' });
  const { departures } = useDepartures(branchId);
  const { toast } = useToast();

  const fetchDrivers = async () => {
    if (!operatorId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, operator_id, branch_id')
        .eq('operator_id', operatorId)
        .eq('role', 'driver' as any);

      if (error) throw error;
      setDrivers((data || []) as DriverProfile[]);

      // Fetch assignments for all drivers
      if (data && data.length > 0) {
        const driverIds = data.map(d => d.id);
        const { data: assignments, error: assignError } = await supabase
          .from('driver_departures')
          .select('driver_id, departure_id')
          .in('driver_id', driverIds);

        if (!assignError && assignments) {
          const assignMap: Record<string, string[]> = {};
          assignments.forEach(a => {
            if (!assignMap[a.driver_id]) assignMap[a.driver_id] = [];
            assignMap[a.driver_id].push(a.departure_id);
          });
          setDriverAssignments(assignMap);
        }
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [operatorId]);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId || !branchId) {
      toast({ title: "Error", description: "Operator and branch must be set", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: newDriver.email,
          password: newDriver.password,
          username: newDriver.username,
          role: 'driver',
          operator_id: operatorId,
          branch_id: branchId,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Success", description: `Driver account created for ${newDriver.email}` });
      setNewDriver({ email: '', password: '', username: '' });
      fetchDrivers();
    } catch (error: any) {
      console.error('Error creating driver:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create driver account",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleDepartureAssignment = async (driverId: string, departureId: string) => {
    const currentAssignments = driverAssignments[driverId] || [];
    const isAssigned = currentAssignments.includes(departureId);

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('driver_departures')
          .delete()
          .eq('driver_id', driverId)
          .eq('departure_id', departureId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('driver_departures')
          .insert({ driver_id: driverId, departure_id: departureId });
        if (error) throw error;
      }

      // Update local state
      setDriverAssignments(prev => ({
        ...prev,
        [driverId]: isAssigned
          ? currentAssignments.filter(id => id !== departureId)
          : [...currentAssignments, departureId]
      }));

      toast({
        title: isAssigned ? "Unassigned" : "Assigned",
        description: `Departure ${isAssigned ? 'removed from' : 'assigned to'} driver`,
      });
    } catch (error) {
      console.error('Error toggling assignment:', error);
      toast({ title: "Error", description: "Failed to update assignment", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Driver Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create Driver Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateDriver} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Display Name</Label>
              <Input
                id="driver-name"
                value={newDriver.username}
                onChange={e => setNewDriver(prev => ({ ...prev, username: e.target.value }))}
                placeholder="e.g., Sokha"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-email">Email</Label>
              <Input
                id="driver-email"
                type="email"
                value={newDriver.email}
                onChange={e => setNewDriver(prev => ({ ...prev, email: e.target.value }))}
                placeholder="driver@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-password">Password</Label>
              <Input
                id="driver-password"
                type="password"
                value={newDriver.password}
                onChange={e => setNewDriver(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Create Driver
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Driver List with Departure Assignments */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      ) : drivers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No driver accounts yet. Create one above.
          </CardContent>
        </Card>
      ) : (
        drivers.map(driver => (
          <Card key={driver.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{driver.username}</span>
                  <Badge variant="secondary">Driver</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Assigned Departures:</Label>
                {departures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No departures available to assign.</p>
                ) : (
                  <div className="grid gap-2">
                    {departures.map((dep: Departure) => {
                      const isAssigned = (driverAssignments[driver.id] || []).includes(dep.id);
                      return (
                        <div
                          key={dep.id}
                          className="flex items-center gap-3 p-2 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleDepartureAssignment(driver.id, dep.id)}
                        >
                          <Checkbox checked={isAssigned} />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{dep.departure_time}</span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span>{dep.destination}</span>
                            {dep.plate_number && (
                              <span className="ml-2 text-sm text-muted-foreground">({dep.plate_number})</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default DriverManagement;
