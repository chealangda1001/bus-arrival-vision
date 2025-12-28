import SuperAdminPanel from "@/components/SuperAdminPanel";
import AdminPanel from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, User, Building2, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useEffect } from "react";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { profile, signOut, loading, user } = useSupabaseAuth();

  console.log('SuperAdmin - profile:', profile, 'loading:', loading, 'user:', user);
  console.log('Profile role check:', profile?.role, 'Is super_admin?', profile?.role === 'super_admin');

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('No user, redirecting to auth');
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  if (loading) {
    console.log('Still loading...');
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Loading...</div>
    </div>;
  }

  if (!profile) {
    console.log('No profile found');
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Profile not found. Please try logging out and back in.</div>
    </div>;
  }

  // Allow both super_admin and operator_admin to access this page
  const isSuperAdmin = profile.role === 'super_admin';
  const isOperatorAdmin = profile.role === 'operator_admin';

  if (!isSuperAdmin && !isOperatorAdmin) {
    console.log('Access denied - role is:', profile.role);
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Access denied. Admin role required. Current role: {profile.role}</div>
    </div>;
  }

  // For operator admins, use their assigned branch/operator
  const activeBranchId = profile.branch_id || undefined;
  const activeOperatorId = profile.operator_id || undefined;

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Operators
            </Button>
            <h1 className="text-3xl font-bold text-text-display">
              {isSuperAdmin ? 'Super Admin Panel' : `${profile.operator?.name || 'Operator'} Admin`}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* User Session Info Card */}
            <div className="bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Logged in as: </span>
                  <span className="font-medium text-foreground">{profile.username}</span>
                </div>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Role: </span>
                  <span className="font-medium text-foreground">
                    {isSuperAdmin ? 'Super Admin' : 'Operator Admin'}
                  </span>
                </div>
              </div>
              {isOperatorAdmin && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Branch: </span>
                      <span className="font-medium text-foreground">
                        {profile.branch?.name || 'All Branches'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <Button 
              variant="outline" 
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Admin Panel - Show SuperAdminPanel for super admins, AdminPanel for operator admins */}
        {isSuperAdmin ? (
          <SuperAdminPanel />
        ) : (
          <AdminPanel branchId={activeBranchId} operatorId={activeOperatorId} />
        )}
      </div>
    </div>
  );
};

export default SuperAdmin;