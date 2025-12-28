import { useParams, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useBranches } from "@/hooks/useBranches";
import AdminPanel from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, User, Building2 } from "lucide-react";
import { useEffect } from "react";

const OperatorAdmin = () => {
  const { operatorSlug } = useParams();
  const navigate = useNavigate();
  const { profile, signOut, loading, user } = useSupabaseAuth();
  const { getDefaultBranch } = useBranches();

  const defaultBranch = getDefaultBranch(operatorSlug!);
  
  // Use the user's assigned branch if they have one, otherwise use the default branch
  const activeBranchId = profile?.branch_id || defaultBranch?.id;
  const activeOperatorId = profile?.operator_id || defaultBranch?.operator_id;

  console.log('OperatorAdmin - profile:', profile, 'loading:', loading, 'operatorSlug:', operatorSlug, 'activeBranchId:', activeBranchId);

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Loading...</div>
    </div>;
  }

  if (!profile || (profile.role !== 'super_admin' && profile.operator?.slug !== operatorSlug)) {
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Access denied. Operator admin role required.</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/operator/${operatorSlug}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Board
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-text-display">
                {profile.operator?.name || operatorSlug} Admin
              </h1>
            </div>
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
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Branch: </span>
                  <span className="font-medium text-foreground">
                    {profile.branch?.name || 'All Branches'}
                  </span>
                </div>
              </div>
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

        <AdminPanel branchId={activeBranchId} operatorId={activeOperatorId} />
      </div>
    </div>
  );
};

export default OperatorAdmin;