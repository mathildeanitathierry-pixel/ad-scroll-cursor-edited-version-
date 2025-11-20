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
    const nextCount = isMobile ? 2 : 3;

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

  // Optimized scroll handling with requestAnimationFrame and debounce
  useEffect(() => {
    const container = containerRef.current;
    if (!container || videoList.length === 0) return;

    let scrollTimeout: NodeJS.Timeout;
    let rafId: number;

    const updateActiveVideo = () => {
      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const scrollRatio = scrollTop / windowHeight;
      const newIndex = Math.max(0, Math.min(Math.round(scrollRatio), videoList.length - 1));

      if (newIndex !== currentVideoIndex) {
        setCurrentVideoIndex(newIndex);
      }

      // Load more videos when approaching the end (more aggressively)
      if (newIndex >= videoList.length - 5 && videoList.length < 50) {
        setVideoList(prev => [...prev, ...mockVideoAds]);
      }
    };

    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Use RAF for smooth updates
      rafId = requestAnimationFrame(() => {
        scrollTimeout = setTimeout(() => {
          updateActiveVideo();
        }, 100);
      });
    };

    // Initial update
    updateActiveVideo();

    // Add scroll listener with passive for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [videoList.length, currentVideoIndex]);

  const handleWatched = useCallback(async () => {
    setPoints(prev => prev + 1);

    // Save to database if user is logged in
    if (session?.user && videoList.length > 0) {
      const currentVideo = videoList[currentVideoIndex];
      await incrementUserStats(session.user.id, 1);
      await addWatchHistory(
        session.user.id,
        currentVideo.id,
        currentVideo.brand,
        1
      );
    }
  }, [session, videoList, currentVideoIndex]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth", { replace: true });
    }
  };




  // Track when first video is loaded to hide initial spinner
  const handleVideoLoaded = useCallback((index: number) => {
    // Hide initial loading as soon as first video loads (especially important for iOS)
    if (index === 0 || isInitialLoading) {
      setIsInitialLoading(false);
    }
    // We don't add to loadedVideos here anymore, as that is controlled by the sliding window
  }, [isInitialLoading]);


  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <CashCounter points={points} />

      {/* Global loading spinner - only shown at the beginning */}
      {isInitialLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading videos...</p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-container"
      >
        {videoList.map((video, index) => {
          const isActive = index === currentVideoIndex;
          // Preload if in loadedVideos set OR if active (always load active video)
          const shouldPreload = loadedVideos.has(index) || isActive;

          return (
            <VideoCard
              key={`${video.id}-${index}-${video.videoUrl}`}
              videoUrl={video.videoUrl}
              brand={video.brand}
              description={video.description}
              isActive={isActive}
              shouldPreload={shouldPreload}
              onWatched={handleWatched}
              onLoaded={() => handleVideoLoaded(index)}
              showLoadingSpinner={false}
            />
          );
        })}
      </div>

      {/* App branding and logout */}
      <div className="fixed top-6 left-6 z-50 animate-fade-in-up">
        <h1 className="text-3xl font-black italic tracking-wider uppercase bg-gradient-cash bg-clip-text text-transparent">
          Reward Ad
        </h1>
      </div>

      <div className="fixed top-6 right-6 z-50 animate-fade-in-up flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="rounded-full bg-card/30 backdrop-blur-sm hover:bg-card/50"
        >
          <User className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="rounded-full bg-card/30 backdrop-blur-sm hover:bg-card/50"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
