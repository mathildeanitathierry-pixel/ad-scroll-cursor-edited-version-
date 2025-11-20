import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { VideoCard } from "@/components/VideoCard";
import { CashCounter } from "@/components/CashCounter";
import { mockVideoAds, VideoAd } from "@/data/mockVideos";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import { incrementUserStats, addWatchHistory } from "@/lib/stats";
import { isMobileDevice } from "@/lib/video-utils";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [points, setPoints] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  // Initialize with data directly to save a render cycle
  const [videoList, setVideoList] = useState<VideoAd[]>(mockVideoAds);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Optimized preloading strategy - more aggressive for first videos
  useEffect(() => {
    if (videoList.length === 0) return;

    const isMobile = isMobileDevice();

    // Shorter timeout for mobile - fallback if video loaded event doesn't fire
    const timeout = isMobile ? 500 : 1000;
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, [videoList.length]);

  // Preload videos as user scrolls (when they become active or are about to)
  // Sliding window strategy to manage memory on mobile
  useEffect(() => {
    if (videoList.length === 0) return;

    const isMobile = isMobileDevice();

    // Balanced approach for iOS: keep a reasonable window
    // This prevents memory crashes while ensuring smooth scrolling
    const prevCount = isMobile ? 1 : 1;
    const nextCount = isMobile ? 1 : 3; // Reduced to 1 on mobile to save memory

    const start = Math.max(0, currentVideoIndex - prevCount);
    const end = Math.min(videoList.length - 1, currentVideoIndex + nextCount);

    const newLoadedSet = new Set<number>();
    for (let i = start; i <= end; i++) {
      newLoadedSet.add(i);
    }

    setLoadedVideos(newLoadedSet);
  }, [currentVideoIndex, videoList.length]);

  // Auth state management (no redirect, allow browsing without login)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleWatched = useCallback(() => {
    if (session?.user) {
      setPoints((prev) => prev + 10);
      toast.success("You earned 10 points!");
    } else {
      toast.success("Video watched! Sign in to earn points.");
    }
  }, [session]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth", { replace: true });
    }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black">
      <CashCounter points={points} />

      {/* Main Scroll Container */}
      <div
        ref={containerRef}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollBehavior: "smooth" }}
      >
        {videoList.map((video, index) => {
          // STRICT MEMORY MANAGEMENT:
          // Only mount the current video and the immediate next one.
          // Everything else is a placeholder.
          // This guarantees we never exceed iOS memory limits.

          const isActive = index === currentVideoIndex;
          const isNext = index === currentVideoIndex + 1;
          const isPrev = index === currentVideoIndex - 1;

          // We render the component if it's active, next, or previous (for smooth scrolling back)
          // But we prioritize keeping the DOM light.
          const shouldMount = isActive || isNext || isPrev;

          if (!shouldMount) {
            return (
              <div
                key={`placeholder-${video.id}`}
                className="h-[100dvh] w-full snap-start snap-always bg-black"
              />
            );
          }

          return (
            <div key={video.id} className="h-[100dvh] w-full snap-start snap-always">
              <VideoCard
                videoUrl={video.videoUrl}
                brand={video.brand}
                description={video.description}
                isActive={isActive}
                shouldPreload={isNext} // Hint to preload if it's the next one
                onWatched={handleWatched}
              />
            </div>
          );
        })}
      </div>

      {/* Header / Controls */}
      <div className="fixed top-6 left-6 z-50 pointer-events-none">
        <h1 className="text-3xl font-black italic tracking-wider uppercase bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-md">
          Reward Ad
        </h1>
      </div>

      <div className="fixed top-6 right-6 z-50 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
        >
          <User className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
