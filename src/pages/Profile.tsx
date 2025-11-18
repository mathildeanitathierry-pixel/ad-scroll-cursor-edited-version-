import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, TrendingUp, Eye, DollarSign, Clock, CreditCard, Save } from "lucide-react";
import { getUserStats, getWatchHistory } from "@/lib/stats";
import { getRevolutId, updateRevolutId } from "@/lib/profile";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserStats {
  total_ads_watched: number;
  total_points_earned: number;
  total_watch_time_seconds: number;
}

interface WatchHistoryItem {
  id: string;
  brand: string;
  points_earned: number;
  watched_at: string;
}

const Profile = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revolutId, setRevolutId] = useState("");
  const [savingRevolutId, setSavingRevolutId] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (!session) {
          navigate("/auth", { replace: true });
        }
      }
    );

    // Check for existing session
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
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      const [userStats, userHistory, savedRevolutId] = await Promise.all([
        getUserStats(session.user.id),
        getWatchHistory(session.user.id, 10),
        getRevolutId(session.user.id),
      ]);

      setStats(userStats);
      setHistory(userHistory);
      setRevolutId(savedRevolutId || "");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRevolutId = async () => {
    if (!session?.user) return;

    setSavingRevolutId(true);
    try {
      await updateRevolutId(session.user.id, revolutId);
      toast.success("Revolut ID saved successfully!");
    } catch (error) {
      console.error("Error saving Revolut ID:", error);
      toast.error("Failed to save Revolut ID");
    } finally {
      setSavingRevolutId(false);
    }
  };

  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const cashValue = ((stats?.total_points_earned || 0) * 0.001).toFixed(3);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-cash p-6 pb-20 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="absolute top-6 left-4 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        
        <div className="text-center mt-12">
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">
            Your Profile
          </h1>
          <p className="text-primary-foreground/80 text-sm">
            {session.user.email}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-12 space-y-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${cashValue}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total_points_earned || 0} points earned
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Ads Watched
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_ads_watched || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Watch Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor((stats?.total_watch_time_seconds || 0) / 60)}m
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revolut ID Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Revolut ID
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="revolut-id">Your Revolut Username or Phone Number</Label>
              <Input
                id="revolut-id"
                type="text"
                placeholder="@username or +1234567890"
                value={revolutId}
                onChange={(e) => setRevolutId(e.target.value)}
                disabled={savingRevolutId}
              />
              <p className="text-xs text-muted-foreground">
                Save your Revolut ID to make withdrawals faster. This will be used for manual transfers.
              </p>
            </div>
            <Button
              onClick={handleSaveRevolutId}
              disabled={savingRevolutId || !revolutId.trim()}
              className="w-full"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {savingRevolutId ? "Saving..." : "Save Revolut ID"}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet. Start watching ads to earn!
              </p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.brand}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.watched_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      +{item.points_earned} pts
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
