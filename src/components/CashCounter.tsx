import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface CashCounterProps {
  points: number;
}

export const CashCounter = ({ points }: CashCounterProps) => {
  const [displayPoints, setDisplayPoints] = useState(0);
  const navigate = useNavigate();
  const cashValue = (points * 0.01).toFixed(2);

  useEffect(() => {
    // Smooth counter animation
    const difference = points - displayPoints;
    if (difference !== 0) {
      const increment = Math.ceil(difference / 10);
      const timer = setTimeout(() => {
        setDisplayPoints(prev => prev + increment);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [points, displayPoints]);

  const handleWithdraw = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      navigate("/withdraw");
    }
  };

  return (
    <div className="fixed bottom-6 md:top-6 md:bottom-auto left-0 right-0 flex justify-center z-50 animate-fade-in-up">
      <Button
        onClick={handleWithdraw}
        className="bg-gradient-cash px-6 py-3 rounded-full shadow-lg flex items-center gap-3 hover:scale-105 transition-transform border-2 border-primary-foreground/20"
      >
        <Coins className="h-6 w-6 text-primary-foreground" />
        <div className="text-2xl font-bold text-primary-foreground cash-glow">
          ${cashValue}
        </div>
      </Button>
    </div>
  );
};
