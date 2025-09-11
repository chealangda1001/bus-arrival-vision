import { useParams } from "react-router-dom";
import { useBranches } from "@/hooks/useBranches";
import BranchBoard from "./BranchBoard";

const OperatorBoard = () => {
  const { operatorSlug } = useParams();
  const { getDefaultBranch } = useBranches();

  const defaultBranch = getDefaultBranch(operatorSlug!);

  if (!defaultBranch) {
    return <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
      <div className="text-text-display text-xl">Operator not found</div>
    </div>;
  }

  return <BranchBoard />;
};

export default OperatorBoard;