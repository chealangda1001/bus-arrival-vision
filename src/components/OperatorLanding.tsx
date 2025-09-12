import { Card, CardContent } from "@/components/ui/card";
import { useOperators } from "@/hooks/useOperators";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

const OperatorLanding = () => {
  const { operators, loading } = useOperators();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard p-6 flex items-center justify-center">
        <div className="text-text-display text-xl">Loading operators...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-text-display">
            Bus Departure Board System
          </h1>
          <p className="text-lg text-text-display/80">
            Select an operator to view their departure schedules
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate("/auth")}
            className="flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Admin Login
          </Button>
        </div>

        {/* Operators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operators.map((operator) => (
            <Card 
              key={operator.id} 
              className="bg-accent/5 border-border hover:bg-accent/10 cursor-pointer transition-all duration-200 hover:scale-105"
              onClick={() => navigate(`/operator/${operator.slug}`)}
            >
              <CardContent className="p-6 text-center space-y-4">
                {operator.logo_url && (
                  <img 
                    src={operator.logo_url} 
                    alt={`${operator.name} logo`}
                    className="w-20 h-20 mx-auto rounded-full object-cover"
                  />
                )}
                <h3 className="text-2xl font-semibold text-text-display">
                  {operator.name}
                </h3>
                <Button variant="outline" className="w-full">
                  View Departure Board
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {operators.length === 0 && (
          <div className="text-center text-text-display/60">
            No operators available
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorLanding;