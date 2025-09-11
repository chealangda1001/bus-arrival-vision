import SuperAdminPanel from "@/components/SuperAdminPanel";
import AdminLogin from "@/components/AdminLogin";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMultiAuth } from "@/hooks/useMultiAuth";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { user, logout } = useMultiAuth();

  if (!user || user.role !== 'super_admin') {
    return <AdminLogin />;
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
            onClick={logout}
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