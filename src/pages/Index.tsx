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
  const [videoList, setVideoList] = useState<VideoAd[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const navigate = useNavigate();

  // Initialize video list - use local videos only
  useEffect(() => {
    setVideoList(mockVideoAds);
  }, []);

  // Optimized preloading strategy - more aggressive for first videos
  useEffect(() => {
    if (videoList.length === 0) return;

    const isMobile = isMobileDevice();
    
    // On mobile, be more aggressive with first 2 videos for smoother scrolling
    if (isMobile) {
      // Preload first video immediately
      setLoadedVideos(prev => new Set([...prev, 0]));
      // Also preload second video for smoother scrolling
      setLoadedVideos(prev => new Set([...prev, 0, 1]));
    } else {
      // Desktop: preload first video
      setLoadedVideos(prev => new Set([...prev, 0]));
    }

    // Shorter timeout for mobile
    const timeout = isMobile ? 1000 : 2000;
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, [videoList.length]);

  // Preload videos as user scrolls (when they become active or are about to)
  // More conservative on mobile to save bandwidth
  useEffect(() => {
    if (videoList.length === 0) return;

    const isMobile = isMobileDevice();
    // On mobile, preload next 2 videos for smoother experience
    // On desktop, preload next 2 videos
    const preloadCount = isMobile ? 2 : 2;
    
    // CRITICAL FIX: Always ensure current video is marked for preload
    // This fixes the issue where videos after index 5 (Oakley) don't load on mobile
    const videosToPreload = [
      currentVideoIndex, // Always include current video
      ...Array.from({ length: preloadCount }, (_, i) => currentVideoIndex + i + 1),
    ].filter(index => index >= 0 && index < videoList.length);

    // On mobile, be more aggressive - preload current and next 3 videos
    if (isMobile) {
      const mobilePreloadIndices = [
        currentVideoIndex,
        currentVideoIndex + 1,
        currentVideoIndex + 2,
        currentVideoIndex + 3,
      ].filter(index => index >= 0 && index < videoList.length);
      
      mobilePreloadIndices.forEach((index) => {
        setLoadedVideos(prev => {
          const newSet = new Set(prev);
          newSet.add(index);
          return newSet;
        });
      });
      
      // Debug logging
      if (currentVideoIndex >= 5) {
        console.log(`[Index] MOBILE: Preloading videos starting from index ${currentVideoIndex}:`, mobilePreloadIndices);
      }
    } else {
      videosToPreload.forEach((index) => {
        setLoadedVideos(prev => {
          const newSet = new Set(prev);
          newSet.add(index);
          return newSet;
        });
      });
    }
    
    // Also ensure current video is ALWAYS loaded
    setLoadedVideos(prev => {
      const newSet = new Set(prev);
      newSet.add(currentVideoIndex);
      return newSet;
    });
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


  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentVideoIndex < videoList.length - 1) {
        // Swipe up - next video
        containerRef.current?.scrollTo({
          top: (currentVideoIndex + 1) * window.innerHeight,
          behavior: 'smooth'
        });
      } else if (diff < 0 && currentVideoIndex > 0) {
        // Swipe down - previous video
        containerRef.current?.scrollTo({
          top: (currentVideoIndex - 1) * window.innerHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  // Track when first video is loaded to hide initial spinner
  const handleVideoLoaded = useCallback((index: number) => {
    // Hide initial loading as soon as first video loads (especially important for iOS)
    if (index === 0 || isInitialLoading) {
      setIsInitialLoading(false);
    }
    setLoadedVideos(prev => new Set([...prev, index]));
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
      {videoList.map((video, index) => {
          const isActive = index === currentVideoIndex;
          // CRITICAL FIX: On mobile, always mark active video and next 2 for preload
          // This ensures videos after index 5 load properly
          const isMobile = isMobileDevice();
          const shouldPreload = loadedVideos.has(index) || (isMobile && (isActive || index === currentVideoIndex + 1 || index === currentVideoIndex + 2));
          
          // Debug logging for mobile
          if (isMobile && isActive && !loadedVideos.has(index)) {
            console.log(`[Index] MOBILE: Video ${index} (${video.brand}) is active but not in loadedVideos set`);
          }
          
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
