import { useState, useRef, useEffect } from "react";
import { Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isMobileDevice, getOptimalVideoUrl, getVideoSources } from "@/lib/video-utils";

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
  const [videoSources, setVideoSources] = useState<Array<{ src: string; type: string }>>([]);
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

    // Detect iOS for special handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Load video when it becomes active or should be preloaded
    // For ad videos, we use preload="none" and only load when active or near viewport
    if (shouldPreload && !videoSrc) {
      // Get optimal video URL based on device and network
      const optimalUrl = getOptimalVideoUrl(videoUrl);
      const sources = getVideoSources(videoUrl);
      
      setVideoSrc(optimalUrl);
      setVideoSources(sources);
      setIsLoading(true);
      return;
    }

    // For videos that shouldn't preload, use IntersectionObserver for lazy loading
    // Check if already in viewport on mount
    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const isInViewport = rect.top < viewportHeight * 1.5 && rect.bottom > -viewportHeight * 0.5;
    
    if (isInViewport && !videoSrc) {
      // Get optimal video URL based on device and network
      const optimalUrl = getOptimalVideoUrl(videoUrl);
      const sources = getVideoSources(videoUrl);
      
      setVideoSrc(optimalUrl);
      setVideoSources(sources);
      setIsLoading(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Load video when it's within 150% of viewport (allows smooth preloading)
          if (entry.isIntersecting && !videoSrc) {
            // Get optimal video URL based on device and network
            const optimalUrl = getOptimalVideoUrl(videoUrl);
            const sources = getVideoSources(videoUrl);
            
            setVideoSrc(optimalUrl);
            setVideoSources(sources);
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

  // Handle video loading events - iOS optimized with crash prevention
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Load video only when active or when shouldPreload is true
    // For ad videos, we use preload="none" to save bandwidth until needed
    if (videoSrc) {
      try {
        if (video) {
          // Ensure src is set first (critical for loading)
          if (video.src !== videoSrc) {
            video.src = videoSrc;
          }
          
          // Only load if video is active or should be preloaded
          // This prevents loading videos that won't be watched
          if (isActive || shouldPreload) {
            // On iOS or if not loaded, explicitly call load() to start loading
            if (isIOS || video.readyState === 0 || video.readyState === undefined) {
              // Use requestAnimationFrame for immediate execution
              requestAnimationFrame(() => {
                if (video && videoRef.current && video.src === videoSrc) {
                  video.load();
                }
              });
            }
          }
        }
      } catch (error) {
        console.warn('Video load failed (non-critical):', error);
      }
      
      // For iOS, don't use aggressive buffering as it can cause issues
      if (!isIOS) {
        // Force video to buffer more by seeking ahead (desktop only)
        const forceBuffer = () => {
          try {
            if (video && videoRef.current && 
                video.readyState >= 2 && 
                video.duration > 0 && 
                !isActive &&
                !isNaN(video.duration)) {
              const seekTime = Math.min(10, video.duration * 0.5);
              const savedTime = video.currentTime;
              if (savedTime < 1 && !isNaN(savedTime)) {
                video.currentTime = seekTime;
                setTimeout(() => {
                  if (video && videoRef.current && video.currentTime === seekTime) {
                    video.currentTime = 0;
                  }
                }, 100);
              }
            }
          } catch (error) {
            console.warn('Video buffering failed (non-critical):', error);
          }
        };
        
        try {
          video.addEventListener('loadedmetadata', forceBuffer, { once: true });
          video.addEventListener('canplay', forceBuffer, { once: true });
        } catch (error) {
          console.warn('Failed to add buffer listeners (non-critical):', error);
        }
      }
    }
    
    const handleCanPlayThrough = () => {
      try {
        if (video && videoRef.current && !hasLoadedOnce) {
          setIsLoading(false);
          setHasError(false);
          setHasLoadedOnce(true);
          onLoaded?.();
        }
      } catch (error) {
        console.warn('CanPlayThrough handler error (non-critical):', error);
      }
    };
    
    const handleLoadedData = () => {
      try {
        if (video && videoRef.current && !hasLoadedOnce) {
          // For iOS, accept readyState >= 1 (just metadata is enough to show video)
          const minReadyState = isIOS ? 1 : 2;
          if (video.readyState >= minReadyState) {
            setIsLoading(false);
            setHasError(false);
            setHasLoadedOnce(true);
            onLoaded?.();
          }
        }
      } catch (error) {
        console.warn('LoadedData handler error (non-critical):', error);
      }
    };
    
    // Also handle loadedmetadata for iOS (fires earlier) - optimized
    const handleLoadedMetadata = () => {
      try {
        if (video && videoRef.current && isIOS && !hasLoadedOnce) {
          // On iOS, metadata is enough to consider video "loaded" for UI purposes
          setIsLoading(false);
          setHasError(false);
          setHasLoadedOnce(true);
          onLoaded?.();
        }
      } catch (error) {
        console.warn('LoadedMetadata handler error (non-critical):', error);
      }
    };

    const handleError = (e: Event) => {
      try {
        const error = e.target as HTMLVideoElement;
        if (error && error.error) {
          console.error('Video error:', error.error);
        }
        
        // If we have multiple sources and one fails, the browser will try the next one
        // Only show error if all sources have failed
        if (video && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          setIsLoading(false);
          setHasError(true);
          toast.error(`Failed to load video: ${brand}`);
        } else {
          // Browser is trying alternative sources, wait a bit
          setTimeout(() => {
            if (video && video.readyState === 0 && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
              setIsLoading(false);
              setHasError(true);
            }
          }, 2000);
        }
      } catch (error) {
        console.warn('Error handler failed (non-critical):', error);
      }
    };
    
    // iOS-specific: Listen for stalled events
    const handleStalled = () => {
      try {
        if (video && videoRef.current && 
            video.networkState === HTMLMediaElement.NETWORK_STALLED) {
          console.warn('Video stalled, attempting to reload:', brand);
          video.load();
        }
      } catch (error) {
        console.warn('Stalled handler error (non-critical):', error);
      }
    };
    
    try {
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);
      if (isIOS) {
        video.addEventListener('stalled', handleStalled);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      }
    } catch (error) {
      console.warn('Failed to add event listeners (non-critical):', error);
    }
    
    return () => {
      try {
        if (video) {
          video.removeEventListener('canplaythrough', handleCanPlayThrough);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('error', handleError);
          if (isIOS) {
            video.removeEventListener('stalled', handleStalled);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          }
        }
      } catch (error) {
        console.warn('Failed to remove event listeners (non-critical):', error);
      }
    };
  }, [videoSrc, brand, onLoaded, hasLoadedOnce, shouldPreload, isActive]);

  // Wait for video to be ready before playing - iOS optimized with crash prevention
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isActive) {
      hasAwardedPointRef.current = false;
      
      // Safe video operations with error handling - optimized
      try {
        if (video && videoSrc) {
          // Ensure video is muted for iOS autoplay
          video.muted = true; // Always start muted on iOS
          video.currentTime = 0;
        }
      } catch (error) {
        console.warn('Video operation failed (non-critical):', error);
      }
      
      const attemptPlay = async () => {
        // Check if video is still valid before proceeding
        if (!video || !videoSrc || !videoRef.current) {
          console.warn('Video element no longer valid, skipping play');
          return;
        }
        
        try {
          // For iOS, be less strict - just need some data loaded (readyState >= 1)
          // iOS Safari often doesn't reach readyState 3 until user interaction
          const minReadyState = isIOS ? 1 : 2; // iOS just needs metadata
          
          // Check if video has valid readyState
          if (video.readyState === undefined || isNaN(video.readyState)) {
            // Try again immediately with requestAnimationFrame
            requestAnimationFrame(() => attemptPlay());
            return;
          }
          
          // If we have at least metadata, try to play immediately on iOS
          if (video.readyState < minReadyState) {
            await new Promise<void>((resolve) => {
              // Shorter timeout for faster loading
              const timeoutId = setTimeout(() => {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('loadedmetadata', onMetadata);
                resolve();
              }, isIOS ? 1000 : 1500); // Reduced timeouts
              
              const onCanPlay = () => {
                clearTimeout(timeoutId);
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('loadedmetadata', onMetadata);
                resolve();
              };
              const onLoadedData = () => {
                if (video.readyState >= minReadyState) {
                  clearTimeout(timeoutId);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('loadeddata', onLoadedData);
                  video.removeEventListener('loadedmetadata', onMetadata);
                  resolve();
                }
              };
              const onMetadata = () => {
                // For iOS, metadata is enough to try playing
                if (isIOS && video.readyState >= 1) {
                  clearTimeout(timeoutId);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('loadeddata', onLoadedData);
                  video.removeEventListener('loadedmetadata', onMetadata);
                  resolve();
                }
              };
              
              video.addEventListener('canplay', onCanPlay);
              video.addEventListener('loadeddata', onLoadedData);
              video.addEventListener('loadedmetadata', onMetadata);
            });
          }
          
          // Final check before playing
          if (!video || !videoSrc || !videoRef.current) {
            console.warn('Video element invalidated during load, skipping play');
            return;
          }
          
          // Now play - iOS requires muted autoplay
          try {
            // Ensure muted before play on iOS
            if (isIOS) {
              video.muted = true;
            }
            await video.play();
          } catch (error) {
            console.warn('Video play failed (non-critical):', error);
            // Retry immediately with requestAnimationFrame for faster recovery
            requestAnimationFrame(async () => {
              try {
                if (!video || !videoRef.current) return;
                if (isIOS) {
                  video.muted = true;
                }
                await video.play();
              } catch (retryError) {
                // Final retry with small delay if immediate retry fails
                setTimeout(async () => {
                  try {
                    if (!video || !videoRef.current) return;
                    if (isIOS) {
                      video.muted = true;
                    }
                    await video.play();
                  } catch (finalError) {
                    console.warn('Video play final retry failed (non-critical):', finalError);
                  }
                }, isIOS ? 200 : 100);
              }
            });
          }
        } catch (error) {
          console.warn('Video play attempt failed (non-critical):', error);
        }
      };
      
      attemptPlay();
      
      // Award point after 5 seconds
      watchTimerRef.current = setTimeout(() => {
        if (!hasAwardedPointRef.current && video && videoRef.current) {
          hasAwardedPointRef.current = true;
          onWatched();
        }
      }, 5000);
    } else {
      // Safe pause operation
      try {
        if (video && video.pause) {
          video.pause();
        }
      } catch (error) {
        console.warn('Video pause failed (non-critical):', error);
      }
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
    try {
      setIsMuted(!isMuted);
      if (videoRef.current && videoRef.current.muted !== undefined) {
        videoRef.current.muted = !isMuted;
      }
    } catch (error) {
      console.warn('Toggle mute failed (non-critical):', error);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setVideoSrc("");
    setVideoSources([]);
    // Trigger reload immediately using requestAnimationFrame
    requestAnimationFrame(() => {
      const optimalUrl = getOptimalVideoUrl(videoUrl);
      const sources = getVideoSources(videoUrl);
      
      setVideoSrc(optimalUrl);
      setVideoSources(sources);
      if (videoRef.current) {
        videoRef.current.load();
      }
    });
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
        src={videoSources.length === 0 ? (videoSrc || undefined) : undefined}
        loop
        muted={isMuted}
        playsInline
        preload={isActive ? (isMobileDevice() ? "none" : "metadata") : "none"}
        className={`w-full h-full object-contain md:object-cover transition-opacity duration-200 ${isLoading && showLoadingSpinner ? 'opacity-0' : 'opacity-100'}`}
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      >
        {/* Adaptive video sources for mobile devices - browser will select best option */}
        {videoSources.length > 0 && isMobileDevice() && videoSources.map((source, index) => (
          <source
            key={`${source.src}-${index}`}
            src={source.src}
            type={source.type}
          />
        ))}
        {/* Fallback for desktop or when no sources available */}
        {videoSources.length === 0 && videoSrc && (
          <source src={videoSrc} type="video/mp4" />
        )}
      </video>
      
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
