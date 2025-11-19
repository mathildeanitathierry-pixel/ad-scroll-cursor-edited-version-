# HLS Streaming Setup Guide

This app now supports **HLS (HTTP Live Streaming)** for adaptive bitrate streaming, which significantly improves video loading performance on mobile devices, especially iPhones.

## What is HLS?

HLS is a streaming protocol that:
- **Adapts quality automatically** based on network conditions
- **Reduces buffering** by streaming in small chunks
- **Works natively on iOS** Safari (no library needed)
- **Works on Android/Desktop** via HLS.js library

## How It Works

1. **iOS Devices**: Uses native HLS support - just provide `.m3u8` playlist files
2. **Android/Desktop**: Uses HLS.js library to play HLS streams
3. **Fallback**: If HLS files don't exist, falls back to regular MP4 files

## Converting Videos to HLS Format

You need to convert your MP4 videos to HLS format (`.m3u8` playlist + `.ts` segments).

### Option 1: Using FFmpeg (Recommended)

Install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

Convert a single video:
```bash
ffmpeg -i input.mp4 \
  -c:v h264 -c:a aac \
  -hls_time 10 \
  -hls_playlist_type vod \
  -hls_segment_filename "output_%03d.ts" \
  -master_pl_name "output.m3u8" \
  output.m3u8
```

Convert with multiple quality levels (adaptive bitrate):
```bash
# Generate multiple resolutions
ffmpeg -i input.mp4 \
  -c:v libx264 -c:a aac \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
  -master_pl_name master.m3u8 \
  -f hls \
  -hls_time 10 \
  -hls_playlist_type vod \
  -hls_segment_filename "v%v/segment_%03d.ts" \
  v%v/playlist.m3u8

# Or create separate playlists for each quality
ffmpeg -i input.mp4 -s 1920x1080 -c:v libx264 -b:v 5000k -c:a aac -b:a 192k -hls_time 10 -hls_playlist_type vod output_1080p.m3u8
ffmpeg -i input.mp4 -s 1280x720 -c:v libx264 -b:v 2500k -c:a aac -b:a 192k -hls_time 10 -hls_playlist_type vod output_720p.m3u8
ffmpeg -i input.mp4 -s 854x480 -c:v libx264 -b:v 1000k -c:a aac -b:a 128k -hls_time 10 -hls_playlist_type vod output_480p.m3u8
```

### Option 2: Batch Conversion Script

Create a script to convert all videos:

```bash
#!/bin/bash
# convert-to-hls.sh

for video in public/videos/*.mp4; do
  filename=$(basename "$video" .mp4)
  output_dir="public/videos/hls/${filename}"
  mkdir -p "$output_dir"
  
  ffmpeg -i "$video" \
    -c:v libx264 -c:a aac \
    -hls_time 10 \
    -hls_playlist_type vod \
    -hls_segment_filename "$output_dir/segment_%03d.ts" \
    "$output_dir/playlist.m3u8"
  
  echo "Converted: $filename"
done
```

### Option 3: Using Cloud Services

For production, consider using managed streaming services:

- **Cloudflare Stream**: Automatic HLS conversion
- **Mux**: Video API with HLS support
- **AWS MediaConvert**: Convert to HLS format
- **Vimeo API**: Upload and get HLS URLs

## File Structure

After conversion, your video structure should look like:

```
public/videos/
├── video_1080p.mp4          # Original MP4 (fallback)
├── video_720p.mp4          # Lower res MP4 (optional)
├── video_480p.mp4          # Lower res MP4 (optional)
└── hls/
    └── video_1080p/
        ├── playlist.m3u8    # HLS playlist
        ├── segment_000.ts  # Video segments
        ├── segment_001.ts
        └── ...
```

## URL Format

The app automatically converts MP4 URLs to HLS URLs:
- MP4: `/videos/video_1080p.mp4`
- HLS: `/videos/video_1080p.m3u8` or `/videos/hls/video_1080p/playlist.m3u8`

Update `getHlsUrl()` in `src/lib/video-utils.ts` if your HLS files are in a different location.

## Testing

1. Convert one video to HLS format
2. Place the `.m3u8` file in `public/videos/` (same location as MP4)
3. Test on iPhone - should load much faster
4. Test on Android - should use HLS.js
5. Test on desktop - should fall back to MP4 if HLS not available

## Benefits

✅ **Faster loading** on mobile networks
✅ **Adaptive quality** - automatically adjusts to network speed
✅ **Reduced buffering** - streams in small chunks
✅ **Better user experience** - especially on slow connections
✅ **Native iOS support** - no extra library needed

## Troubleshooting

**HLS not working?**
- Check browser console for errors
- Verify `.m3u8` file is accessible
- Ensure CORS headers are set correctly
- Check that video segments (`.ts` files) are in the same directory

**Still slow on mobile?**
- Ensure HLS files are properly generated
- Check network quality detection
- Consider using a CDN for video delivery
- Verify video segments are small enough (10-15 seconds)

## Next Steps

1. Convert your videos to HLS format
2. Update file paths if needed in `video-utils.ts`
3. Test on real mobile devices
4. Consider using a CDN for better global performance

