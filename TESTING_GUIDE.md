# Testing Guide: Video Loading After Oakley on iPhone

## How to Test the Fix

### Prerequisites
1. iPhone with Safari browser
2. Access to Safari Web Inspector (for debugging)
3. The app running (dev server or production)

### Testing Steps

#### 1. Enable Safari Web Inspector on iPhone
- On iPhone: Settings → Safari → Advanced → Web Inspector (enable)
- Connect iPhone to Mac via USB
- On Mac: Safari → Develop → [Your iPhone] → [Your app URL]

#### 2. Test Video Loading Sequence

1. **Open the app on iPhone**
   - Clear browser cache first (Settings → Safari → Clear History and Website Data)
   - Navigate to the app URL

2. **Check Console Logs**
   - Open Safari Web Inspector on Mac
   - Go to Console tab
   - Look for `[Index] MOBILE:` and `[VideoCard] MOBILE:` messages

3. **Test Video Progression**
   - Scroll through videos 0-5 (should work normally)
   - **Critical Test**: Scroll to Oakley (index 5)
   - Continue scrolling to Saucony (index 6) - **This is where it was failing**
   - Continue to Samsung (index 7), WHOOP (index 8), Nike (index 9), Adidas (index 10)

4. **What to Look For**

   **✅ Success Indicators:**
   - Console shows: `[Index] MOBILE: Preloading videos starting from index 6: [6, 7, 8, 9]`
   - Console shows: `[VideoCard] MOBILE: Force loading video for Saucony (active but no src)`
   - Console shows: `[VideoCard] MOBILE: Directly setting video.src for Saucony`
   - Video actually loads and plays

   **❌ Failure Indicators:**
   - Console shows: `[Index] MOBILE: Video 6 (Saucony) is active but not in loadedVideos set`
   - Video shows loading spinner but never loads
   - Video element has no `src` attribute
   - Console errors about video loading

#### 3. Expected Console Output

When scrolling to index 6 (Saucony), you should see:

```
[Index] MOBILE: Preloading videos starting from index 6: [6, 7, 8, 9]
[VideoCard] MOBILE: Force loading video for Saucony (active but no src)
[VideoCard] MOBILE: Directly setting video.src for Saucony
[VideoCard] MOBILE: Setting src and loading for Saucony
```

#### 4. Manual Verification

In Safari Web Inspector:
1. Go to Elements tab
2. Find the video element for Saucony (index 6)
3. Check if `src` attribute is set
4. Check if video element has `readyState > 0`
5. Check Network tab for video file requests

#### 5. Test Edge Cases

- **Fast scrolling**: Quickly swipe through all videos
- **Slow scrolling**: Slowly scroll and pause at each video
- **Backwards scrolling**: Scroll back from index 10 to index 5
- **Refresh test**: Refresh page while on index 6+

## Debugging Commands

If videos still don't load, run these in the console:

```javascript
// Check current video index
console.log('Current index:', document.querySelector('[data-video-index]')?.dataset?.videoIndex);

// Check loaded videos set
// (This requires accessing React state - use React DevTools)

// Check video elements
document.querySelectorAll('video').forEach((video, i) => {
  console.log(`Video ${i}:`, {
    src: video.src,
    readyState: video.readyState,
    networkState: video.networkState,
    error: video.error
  });
});

// Force load a specific video
const video6 = document.querySelectorAll('video')[6];
if (video6) {
  video6.src = '/videos/YTDown.com_YouTube_Saucony-Run-As-One_Media_wF7aMx6HxPM_001_1080p.mp4';
  video6.load();
}
```

## What the Fix Does

1. **Aggressive Preloading**: On mobile, preloads current + next 3 videos (instead of 2)
2. **Force Loading**: Active video always gets `shouldPreload=true` on mobile
3. **Direct DOM Manipulation**: Sets `video.src` directly to bypass React state delays
4. **Multiple Fallbacks**: Several mechanisms ensure videos load when active

## If It Still Doesn't Work

1. Check console for errors
2. Verify video files exist in `/public/videos/`
3. Check network tab for failed requests
4. Verify `isMobileDevice()` returns `true` on iPhone
5. Check if iOS is limiting video elements (try unloading previous videos)

## Success Criteria

✅ All videos (0-10) load and play on iPhone
✅ No console errors related to video loading
✅ Smooth scrolling between all videos
✅ Videos after Oakley (index 6+) load properly

