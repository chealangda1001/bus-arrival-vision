import { useParams, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useBranches } from "@/hooks/useBranches";
import AdminPanel from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useEffect } from "react";

const OperatorAdmin = () => {
  const { operatorSlug } = useParams();
  const navigate = useNavigate();
  const { profile, signOut, loading, user } = useSupabaseAuth();
  const { getDefaultBranch } = useBranches();

  const defaultBranch = getDefaultBranch(operatorSlug!);

  console.log('OperatorAdmin - profile:', profile, 'loading:', loading, 'operatorSlug:', operatorSlug);

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
            <h1 className="text-3xl font-bold text-text-display">
              {profile.operator?.name || operatorSlug} Admin
            </h1>
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

        <AdminPanel branchId={defaultBranch?.id} />
      </div>
    </div>
  );
};

export default OperatorAdmin;