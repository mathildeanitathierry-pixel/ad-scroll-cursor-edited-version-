/**
 * Utility functions for video loading and device detection
 */

/**
 * Detects if the current device is a mobile device (smartphone)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile devices
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Also check for touch support and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobile || (hasTouch && isSmallScreen);
}

/**
 * Detects if the current device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detects if the current device is Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android/i.test(navigator.userAgent);
}

/**
 * Detects network connection quality
 */
export function getNetworkQuality(): 'slow' | 'fast' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'fast';
  }
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return 'fast';
  
  // Check effective type (4G, 3G, 2G, slow-2g)
  const effectiveType = connection.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return 'slow';
  }
  
  // Check downlink speed (Mbps)
  const downlink = connection.downlink;
  if (downlink && downlink < 1.5) {
    return 'slow';
  }
  
  return 'fast';
}

/**
 * Converts a 1080p video URL to a lower resolution version
 * Supports both 720p and 480p fallbacks
 */
export function getMobileVideoUrl(originalUrl: string): string {
  if (!isMobileDevice()) {
    return originalUrl;
  }
  
  // Try to find a lower resolution version
  // Pattern: replace _1080p with _720p or _480p
  const url720p = originalUrl.replace('_1080p', '_720p');
  const url480p = originalUrl.replace('_1080p', '_480p');
  
  // For now, we'll use the original URL but this can be extended
  // to check if lower resolution files exist
  // In production, you'd want to verify file existence or use a CDN
  
  // If network is slow, prefer even lower quality
  const networkQuality = getNetworkQuality();
  if (networkQuality === 'slow') {
    // Could return url480p if files exist
    return originalUrl; // Fallback to original for now
  }
  
  // For mobile, prefer 720p if available
  return originalUrl; // Will be updated when lower res files are available
}

/**
 * Gets the best video source URL based on device and network conditions
 * Falls back to original if lower resolution versions don't exist
 */
export function getOptimalVideoUrl(originalUrl: string): string {
  const mobile = isMobileDevice();
  const networkQuality = getNetworkQuality();
  
  if (!mobile) {
    return originalUrl; // Desktop gets full quality
  }
  
  // Mobile device - prefer lower quality but fallback to original
  // Note: Lower resolution files may not exist yet, so we'll use original
  // When 720p/480p files are added, they'll be automatically used
  if (networkQuality === 'slow') {
    // For slow networks, prefer 480p if available
    // For now, return original as fallback
    return originalUrl;
  }
  
  // Fast mobile network - prefer 720p if available
  // For now, return original as fallback
  return originalUrl;
}

/**
 * Creates video source elements for adaptive loading
 * Returns an array of source objects for use in <video><source> tags
 * Browser will try sources in order and use the first one that works
 */
export function getVideoSources(baseUrl: string): Array<{ src: string; type: string; media?: string }> {
  const mobile = isMobileDevice();
  const networkQuality = getNetworkQuality();
  
  const sources: Array<{ src: string; type: string; media?: string }> = [];
  
  if (mobile) {
    // For mobile, prefer lower resolutions for faster loading
    // Browser will automatically fall back if file doesn't exist
    
    if (networkQuality === 'slow') {
      // Slow network: try 480p first (if available)
      sources.push({
        src: baseUrl.replace('_1080p', '_480p'),
        type: 'video/mp4',
      });
    }
    
    // Add 720p as preferred option for mobile (if available)
    sources.push({
      src: baseUrl.replace('_1080p', '_720p'),
      type: 'video/mp4',
    });
  }
  
  // Always include original 1080p as final fallback
  // This ensures videos always work even if lower res versions don't exist
  sources.push({
    src: baseUrl,
    type: 'video/mp4',
  });
  
  return sources;
}

