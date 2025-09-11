import { useParams, useNavigate } from "react-router-dom";
import { useBranches } from "@/hooks/useBranches";
import { useEffect } from "react";

const OperatorBoard = () => {
  const { operatorSlug } = useParams();
  const navigate = useNavigate();
  const { getDefaultBranch } = useBranches();

  const defaultBranch = getDefaultBranch(operatorSlug!);

  useEffect(() => {
    if (defaultBranch) {
      // Redirect to the default branch URL
      navigate(`/operator/${operatorSlug}/branch/${defaultBranch.slug}`, { replace: true });
    }
  }, [defaultBranch, operatorSlug, navigate]);

  if (!defaultBranch) {
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Operator not found</div>
    </div>;
  }

  // Show loading while redirecting
  return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
    <div className="text-text-display text-xl">Loading...</div>
  </div>;
};

export default OperatorBoard;