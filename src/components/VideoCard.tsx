import { useState, useRef, useEffect } from "react";
import { Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VideoCardProps {
  videoUrl: string;
  brand: string;
  description: string;
  isActive: boolean;
  shouldPreload: boolean;
  onWatched: () => void;
  onLoaded?: () => void;
  showLoadingSpinner?: boolean;
}

export const VideoCard = ({ videoUrl, brand, description, isActive, shouldPreload, onWatched, onLoaded, showLoadingSpinner = true }: VideoCardProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAwardedPointRef = useRef(false);
  const watchTimerRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load video immediately if shouldPreload is true, otherwise use IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // If shouldPreload is true, load immediately without waiting for observer
    if (shouldPreload && !videoSrc) {
      setVideoSrc(videoUrl);
      setIsLoading(true);
      return;
    }

    // For videos that shouldn't preload, use IntersectionObserver for lazy loading
    // Check if already in viewport on mount
    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const isInViewport = rect.top < viewportHeight * 1.5 && rect.bottom > -viewportHeight * 0.5;
    
    if (isInViewport && !videoSrc) {
      setVideoSrc(videoUrl);
      setIsLoading(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Load video when it's within 150% of viewport (allows smooth preloading)
          if (entry.isIntersecting && !videoSrc) {
            setVideoSrc(videoUrl);
            setIsLoading(true);
          }
        });
      },
      {
        rootMargin: "50% 0px",
        threshold: 0,
      }
    );

    observerRef.current.observe(container);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [videoUrl, videoSrc, shouldPreload]);

  // Handle video loading events and force load when preloading
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    
    // Force video to load if shouldPreload is true
    if (shouldPreload && video.readyState === 0) {
      video.load();
    }
    
    const handleCanPlayThrough = () => {
      setIsLoading(false);
      setHasError(false);
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
        onLoaded?.();
      }
    };
    
    const handleLoadedData = () => {
      if (video.readyState >= 2) {
        setIsLoading(false);
        setHasError(false);
        if (!hasLoadedOnce) {
          setHasLoadedOnce(true);
          onLoaded?.();
        }
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      toast.error(`Failed to load video: ${brand}`);
    };
    
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    
    return () => {
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, [videoSrc, brand, onLoaded, hasLoadedOnce, shouldPreload]);

  // Wait for video to be ready before playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    if (isActive) {
      hasAwardedPointRef.current = false;
      video.muted = isMuted;
      video.currentTime = 0;
      
      const attemptPlay = async () => {
        // Wait for video to be ready - if preloaded, it should be ready quickly
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onLoadedData = () => {
              video.removeEventListener('loadeddata', onLoadedData);
              resolve();
            };
            video.addEventListener('loadeddata', onLoadedData);
            
            // Shorter timeout for preloaded videos
            const timeout = shouldPreload ? 200 : 500;
            setTimeout(resolve, timeout);
          });
        }
        
        // Now play
        try {
          await video.play();
        } catch (error) {
          console.error('Video play failed:', error);
          // Retry with shorter delay for preloaded videos
          setTimeout(() => video.play().catch(() => {}), 100);
        }
      };
      
      attemptPlay();
      
      // Award point after 5 seconds
      watchTimerRef.current = setTimeout(() => {
        if (!hasAwardedPointRef.current) {
          hasAwardedPointRef.current = true;
          onWatched();
        }
      }, 5000);
    } else {
      video.pause();
      hasAwardedPointRef.current = false;
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
    }

    return () => {
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
    };
  }, [isActive, onWatched, brand, isMuted, videoSrc, shouldPreload]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this ad from ${brand}`,
          text: description,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setVideoSrc("");
    // Trigger reload by resetting and setting src again
    setTimeout(() => setVideoSrc(videoUrl), 100);
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen snap-item overflow-hidden bg-background">
      {/* Loading skeleton - only show if showLoadingSpinner is true */}
      {isLoading && !hasError && showLoadingSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{brand}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6">
            <p className="text-sm text-destructive">Failed to load video</p>
            <Button onClick={handleRetry} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        src={videoSrc}
        loop
        muted={isMuted}
        playsInline
        preload={shouldPreload ? "auto" : "none"}
        className={`w-full h-full object-contain md:object-cover transition-opacity duration-300 ${isLoading && showLoadingSpinner ? 'opacity-0' : 'opacity-100'}`}
        crossOrigin="anonymous"
        webkit-playsinline="true"
        x-webkit-airplay="allow"
      />
      
      {/* Gradient overlay - hidden on mobile */}
      <div className="absolute inset-0 bg-gradient-overlay pointer-events-none hidden md:block" />
      
      {/* Content overlay - minimal on mobile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pb-6 md:pb-8 animate-fade-in-up">
        <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">{brand}</h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2 hidden md:block">{description}</p>
      </div>

      {/* Right side controls - adjusted for mobile */}
      <div className="absolute right-3 md:right-4 bottom-20 md:bottom-24 flex flex-col gap-3 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-card/40 md:bg-card/30 backdrop-blur-sm hover:bg-card/60 md:hover:bg-card/50 h-10 w-10 md:h-12 md:w-12"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-card/40 md:bg-card/30 backdrop-blur-sm hover:bg-card/60 md:hover:bg-card/50 h-10 w-10 md:h-12 md:w-12"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>
    </div>
  );
};
