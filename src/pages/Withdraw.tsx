import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { getUserStats } from "@/lib/stats";
import { requestWithdrawal, getWithdrawalHistory } from "@/lib/withdrawals";
import { getRevolutId } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface UserStats {
  total_points_earned: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  points_used: number;
  payout_method: string;
  status: string;
  created_at: string;
}

const Withdraw = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  
  // Withdrawal form state
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<string>("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedRevolutId, setSavedRevolutId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth", { replace: true });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    if (!session?.user) return;

    try {
      const [userStats, history, revolutId] = await Promise.all([
        getUserStats(session.user.id),
        getWithdrawalHistory(session.user.id),
        getRevolutId(session.user.id),
      ]);

      setStats(userStats);
      setWithdrawalHistory(history);
      setSavedRevolutId(revolutId);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!session?.user || !stats) return;

    const requestedAmount = parseFloat(amount);
    const pointsNeeded = Math.ceil(requestedAmount / 0.001);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (requestedAmount < 0.10) {
      toast.error("Minimum withdrawal amount is $0.10");
      return;
    }

    if (pointsNeeded > stats.total_points_earned) {
      toast.error("Insufficient points for this withdrawal");
      return;
    }

    if (!payoutMethod) {
      toast.error("Please select a payout method");
      return;
    }

    if (!payoutDetails.trim()) {
      toast.error(`Please enter your ${getPayoutMethodName(payoutMethod)} details`);
      return;
    }

    setSubmitting(true);

    try {
      await requestWithdrawal(
        session.user.id,
        requestedAmount,
        pointsNeeded,
        payoutMethod,
        { [payoutMethod]: payoutDetails }
      );

      toast.success("Withdrawal requested successfully! Processing may take 3-5 business days.");
      
      // Reset form
      setAmount("");
      setPayoutMethod("");
      setPayoutDetails("");
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast.error("Failed to process withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  const getPayoutMethodName = (method: string) => {
    const names: { [key: string]: string } = {
      revolut: "Revolut"
    };
    return names[method] || method;
  };

  const getPayoutMethodIcon = (method: string) => {
    switch (method) {
      case "revolut":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const availableCash = ((stats?.total_points_earned || 0) * 0.001).toFixed(2);
  const pointsNeededForRequest = amount ? Math.ceil(parseFloat(amount) / 0.001) : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Withdraw Cash</h1>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 bg-gradient-cash border-0">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-primary-foreground/80 mb-2">Available Balance</p>
              <p className="text-5xl font-bold text-primary-foreground cash-glow">
                ${availableCash}
              </p>
              <p className="text-sm text-primary-foreground/80 mt-2">
                {stats?.total_points_earned.toLocaleString()} points
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
            <CardDescription>
              Minimum withdrawal: $0.10 • Processing time: 3-5 business days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9"
                  min="0.10"
                  step="0.01"
                />
              </div>
              {amount && pointsNeededForRequest > (stats?.total_points_earned || 0) && (
                <p className="text-sm text-destructive">
                  Insufficient points. You need {pointsNeededForRequest.toLocaleString()} points.
                </p>
              )}
              {amount && pointsNeededForRequest <= (stats?.total_points_earned || 0) && (
                <p className="text-sm text-muted-foreground">
                  This will use {pointsNeededForRequest.toLocaleString()} points
                </p>
              )}
            </div>

            {/* Payout Method */}
            <div className="space-y-2">
              <Label htmlFor="payout-method">Payout Method</Label>
              <Select 
                value={payoutMethod} 
                onValueChange={(value) => {
                  setPayoutMethod(value);
                  // Auto-fill if Revolut is selected and we have a saved ID
                  if (value === "revolut" && savedRevolutId && !payoutDetails) {
                    setPayoutDetails(savedRevolutId);
                  } else if (value !== "revolut") {
                    // Clear payout details when switching away from Revolut
                    setPayoutDetails("");
                  }
                }}
              >
                <SelectTrigger id="payout-method">
                  <SelectValue placeholder="Select payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revolut">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Revolut
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payout Details */}
            {payoutMethod && (
              <div className="space-y-2">
                <Label htmlFor="payout-details">
                  Revolut Username / Phone
                </Label>
                <Input
                  id="payout-details"
                  type="text"
                  placeholder="@username or +1234567890"
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={handleWithdrawal}
              disabled={submitting || !amount || !payoutMethod || !payoutDetails || pointsNeededForRequest > (stats?.total_points_earned || 0)}
              className="w-full"
            >
              {submitting ? "Processing..." : "Request Withdrawal"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By requesting a withdrawal, you agree to deduct the required points from your balance.
              Withdrawals are typically processed within 3-5 business days.
            </p>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawalHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No withdrawal requests yet
              </p>
            ) : (
              <div className="space-y-3">
                {withdrawalHistory.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {getPayoutMethodIcon(withdrawal.payout_method)}
                      <div>
                        <p className="font-medium">${withdrawal.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          withdrawal.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : withdrawal.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {withdrawal.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {withdrawal.points_used.toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Withdraw;
