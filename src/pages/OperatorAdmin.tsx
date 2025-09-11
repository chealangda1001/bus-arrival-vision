import { useParams, useNavigate } from "react-router-dom";
import { useMultiAuth } from "@/hooks/useMultiAuth";
import { useBranches } from "@/hooks/useBranches";
import AdminPanel from "@/components/AdminPanel";
import AdminLogin from "@/components/AdminLogin";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";

const OperatorAdmin = () => {
  const { operatorSlug } = useParams();
  const navigate = useNavigate();
  const { user, logout, loading } = useMultiAuth();
  const { getDefaultBranch } = useBranches();

  const defaultBranch = getDefaultBranch(operatorSlug!);

  console.log('OperatorAdmin - user:', user, 'loading:', loading, 'operatorSlug:', operatorSlug);

  if (loading) {
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Loading...</div>
    </div>;
  }

  if (!user || (user.role !== 'super_admin' && user.operator?.slug !== operatorSlug)) {
    console.log('Showing AdminLogin - user check failed');
    return <AdminLogin />;
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
              {user.operator?.name || operatorSlug} Admin
            </h1>
          </div>
          <Button 
            variant="outline" 
            onClick={logout}
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