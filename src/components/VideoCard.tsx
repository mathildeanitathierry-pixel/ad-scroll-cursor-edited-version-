import { useState, useRef, useEffect, useMemo } from "react";
import { Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isMobileDevice, getVideoSources } from "@/lib/video-utils";

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

export const VideoCard = ({
  videoUrl,
  brand,
  description,
  isActive,
  shouldPreload,
  onWatched,
  onLoaded,
  showLoadingSpinner = true
}: VideoCardProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Use useMemo to calculate sources immediately on render, avoiding an effect cycle
  const videoSources = useMemo(() => getVideoSources(videoUrl), [videoUrl]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAwardedPointRef = useRef(false);
  const watchTimerRef = useRef<NodeJS.Timeout>();

  // Handle video loading with progressive strategy
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // Active video: load fully
      video.preload = 'auto';
      if (video.networkState === HTMLMediaElement.NETWORK_EMPTY ||
        video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        video.load();
      }
    } else if (shouldPreload) {
      // Preload video: only load metadata (first few KB)
      // This allows instant playback when it becomes active
      video.preload = 'metadata';
      if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
        video.load();
      }
    } else {
      // Not needed: don't load anything
      video.preload = 'none';
    }
  }, [isActive, shouldPreload, videoSources]);

  // Handle play/pause and cleanup
  useEffect(() => {
    const video = videoRef.current;
    // Only run if video element exists
    if (!video) return;

    if (isActive) {
      // Reset state for new view
      hasAwardedPointRef.current = false;

      const playVideo = async () => {
        try {
          // Ensure muted for autoplay policy
          video.muted = isMuted;
          video.currentTime = 0;
          await video.play();
        } catch (error) {
          console.warn("Autoplay failed:", error);
        }
      };

      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.oncanplay = playVideo;
      }

      // Start watch timer
      watchTimerRef.current = setTimeout(() => {
        if (!hasAwardedPointRef.current) {
          hasAwardedPointRef.current = true;
          onWatched();
        }
      }, 5000);

    } else {
      // Pause if not active
      video.pause();
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
    }

    // Cleanup function - CRITICAL for iOS
    return () => {
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
      video.oncanplay = null;

      // If the component is unmounting or video is being removed from DOM
      // We must explicitly unload the video to free memory
      if (!isActive && !shouldPreload) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [isActive, shouldPreload, onWatched, isMuted]);

  const handleVideoLoad = () => {
    setIsLoading(false);
    onLoaded?.();
  };

  const handleError = (e: any) => {
    // Only report error if all sources failed or if it's a critical error
    const video = e.target as HTMLVideoElement;
    if (video && video.error) {
      console.error(`Failed to load video ${brand}:`, video.error);
      // If network no source, it means all sources failed
      if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        setIsLoading(false);
        setHasError(true);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

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

  return (
    <div ref={containerRef} className="relative w-full h-screen snap-item overflow-hidden bg-background">
      {/* Loading skeleton */}
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
            <Button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Video Element - Always rendered but controlled via preload */}
      <video
        ref={videoRef}
        className={`w-full h-full object-contain md:object-cover transition-opacity duration-200 ${isLoading && showLoadingSpinner ? 'opacity-0' : 'opacity-100'}`}
        loop
        muted={isMuted}
        playsInline
        webkit-playsinline="true"
        onLoadedData={handleVideoLoad}
        onError={handleError}
      >
        {videoSources.map((source, index) => (
          <source key={index} src={source.src} type={source.type} />
        ))}
      </video>

      {/* Gradient overlay - hidden on mobile */}
      <div className="absolute inset-0 bg-gradient-overlay pointer-events-none hidden md:block" />

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pb-6 md:pb-8 animate-fade-in-up pointer-events-none">
        <div className="pointer-events-auto">
          <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-white drop-shadow-md">{brand}</h3>
          <p className="text-xs md:text-sm text-white/90 mb-2 md:mb-4 line-clamp-2 hidden md:block drop-shadow-md">{description}</p>
        </div>
      </div>

      {/* Right side controls */}
      <div className="absolute right-3 md:right-4 bottom-20 md:bottom-24 flex flex-col gap-3 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white h-10 w-10 md:h-12 md:w-12"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white h-10 w-10 md:h-12 md:w-12"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>
    </div>
  );
};
