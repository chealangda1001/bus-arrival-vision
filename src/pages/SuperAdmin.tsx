import SuperAdminPanel from "@/components/SuperAdminPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useEffect } from "react";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { profile, signOut, loading, user } = useSupabaseAuth();

  console.log('SuperAdmin - profile:', profile, 'loading:', loading);

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

  if (!profile || profile.role !== 'super_admin') {
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Access denied. Super admin role required.</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              Super Admin Panel
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

        {/* Super Admin Panel */}
        <SuperAdminPanel />
      </div>
    </div>
  );
};

export default SuperAdmin;