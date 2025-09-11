import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MultiAuthProvider } from "@/hooks/useMultiAuth";
import OperatorLanding from "./components/OperatorLanding";
import BranchBoard from "./pages/BranchBoard";
import OperatorBoard from "./pages/OperatorBoard";
import SuperAdmin from "./pages/SuperAdmin";
import OperatorAdmin from "./pages/OperatorAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MultiAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<OperatorLanding />} />
            <Route path="/admin" element={<SuperAdmin />} />
            <Route path="/operator/:operatorSlug" element={<OperatorBoard />} />
            <Route path="/operator/:operatorSlug/branch/:branchSlug" element={<BranchBoard />} />
            <Route path="/operator/:operatorSlug/admin" element={<OperatorAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </MultiAuthProvider>
  </QueryClientProvider>
);

export default App;
