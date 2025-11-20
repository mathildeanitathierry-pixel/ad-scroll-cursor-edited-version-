import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getVideoSources } from "@/lib/video-utils";

interface VideoCardProps {
  videoUrl: string;
  brand: string;
  description: string;
  isActive: boolean;
  shouldPreload: boolean; // kept for compatibility, but we'll rely mainly on mounting
  onWatched: () => void;
}

export const VideoCard = ({
  videoUrl,
  brand,
  description,
  isActive,
  onWatched,
}: VideoCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasAwardedPoint = useRef(false);
  const watchTimer = useRef<NodeJS.Timeout>();

  // Get optimized video sources (480p/720p for mobile)
  const sources = getVideoSources(videoUrl);

  // Handle Playback Control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // Reset state when becoming active
      hasAwardedPoint.current = false;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.log("Autoplay prevented:", error);
            setIsPlaying(false);
            // If autoplay fails (low power mode/browser policy), show mute button hint
            if (!isMuted) setIsMuted(true);
          });
      }

      // Start timer for points
      watchTimer.current = setTimeout(() => {
        if (!hasAwardedPoint.current) {
          hasAwardedPoint.current = true;
          onWatched();
        }
      }, 5000);

    } else {
      // Pause immediately if not active
      video.pause();
      setIsPlaying(false);
      if (watchTimer.current) clearTimeout(watchTimer.current);
    }

    return () => {
      if (watchTimer.current) clearTimeout(watchTimer.current);
    };
  }, [isActive, onWatched, isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black snap-start snap-always">
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
          <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        onClick={handleVideoClick}
        onLoadedData={() => setIsLoading(false)}
      >
        {sources.map((source, index) => (
          <source key={index} src={source.src} type={source.type} />
        ))}
      </video>

      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-6 bg-gradient-to-t from-black/80 via-transparent to-transparent">
        <div className="mb-16 space-y-2 animate-fade-in">
          <h2 className="text-2xl font-bold text-white drop-shadow-md">{brand}</h2>
          <p className="text-white/90 text-sm md:text-base line-clamp-2 drop-shadow-sm">
            {description}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
};
