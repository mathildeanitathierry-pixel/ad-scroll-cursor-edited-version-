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

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [points, setPoints] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoList, setVideoList] = useState<VideoAd[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const navigate = useNavigate();

  // Initialize video list - use local videos only
  useEffect(() => {
    setVideoList(mockVideoAds);
  }, []);

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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <CashCounter points={points} />
      
      <div 
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
      {videoList.map((video, index) => {
          const isActive = index === currentVideoIndex;
          // Preload all videos for instant playback when website opens
          const shouldPreload = true;
          
          return (
            <VideoCard
              key={`${video.id}-${index}-${video.videoUrl}`}
              videoUrl={video.videoUrl}
              brand={video.brand}
              description={video.description}
              isActive={isActive}
              shouldPreload={shouldPreload}
              onWatched={handleWatched}
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
