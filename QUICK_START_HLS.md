# Quick Start: Convert Videos to HLS

Follow these steps to convert your videos to HLS format for faster mobile loading.

## Step 1: Install FFmpeg

### Option A: Using Homebrew (Recommended for macOS)
```bash
# Install Homebrew first (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install FFmpeg
brew install ffmpeg
```

### Option B: Download FFmpeg directly
1. Visit: https://ffmpeg.org/download.html
2. Download the macOS build
3. Extract and add to your PATH, or use the full path

### Option C: Using MacPorts
```bash
sudo port install ffmpeg
```

## Step 2: Verify FFmpeg Installation

Run this command to check:
```bash
ffmpeg -version
```

You should see version information if it's installed correctly.

## Step 3: Convert Videos

### Option A: Use the Automated Script (Easiest)

Once FFmpeg is installed, run:
```bash
npm run convert:hls
```

This will automatically convert all MP4 files in `public/videos/` to HLS format.

### Option B: Manual Conversion (One Video at a Time)

For a single video, use this command:
```bash
cd public/videos

# Create HLS directory
mkdir -p hls

# Convert one video (replace filename)
ffmpeg -i "YTDown.com_YouTube_Great-ideas-start-on-Mac-Apple_Media_XOBE3FCyaqU_001_1080p.mp4" \
  -c:v libx264 -c:a aac \
  -hls_time 10 \
  -hls_playlist_type vod \
  -hls_segment_filename "hls/Great-ideas-start-on-Mac-Apple_Media_XOBE3FCyaqU_001_1080p/segment_%03d.ts" \
  "hls/Great-ideas-start-on-Mac-Apple_Media_XOBE3FCyaqU_001_1080p/playlist.m3u8"
```

### Option C: Batch Convert All Videos

Create a simple script to convert all videos:

```bash
cd public/videos
mkdir -p hls

for video in *.mp4; do
  filename=$(basename "$video" .mp4)
  output_dir="hls/${filename}"
  mkdir -p "$output_dir"
  
  ffmpeg -i "$video" \
    -c:v libx264 -c:a aac \
    -hls_time 10 \
    -hls_playlist_type vod \
    -hls_segment_filename "$output_dir/segment_%03d.ts" \
    "$output_dir/playlist.m3u8"
  
  echo "✅ Converted: $filename"
done
```

## Step 4: Update Video Utils (If Needed)

If your HLS files are in a subdirectory (like `hls/video_name/playlist.m3u8`), update the `getHlsUrl()` function in `src/lib/video-utils.ts`:

```typescript
export function getHlsUrl(mp4Url: string): string {
  // If HLS files are in hls/ subdirectory
  const baseName = mp4Url.replace('.mp4', '').replace('/videos/', '');
  return `/videos/hls/${baseName}/playlist.m3u8`;
  
  // OR if HLS files are in same directory (just .m3u8 extension)
  // return mp4Url.replace('.mp4', '.m3u8');
}
```

## Step 5: Test

1. Start your dev server: `npm run dev`
2. Open on your iPhone
3. Videos should load much faster!

## File Structure After Conversion

Your `public/videos/` folder should look like:
```
public/videos/
├── video1.mp4                    # Original
├── video2.mp4                    # Original
└── hls/
    ├── video1/
    │   ├── playlist.m3u8         # HLS playlist
    │   ├── segment_000.ts        # Video segments
    │   ├── segment_001.ts
    │   └── ...
    └── video2/
        ├── playlist.m3u8
        └── ...
```

## Troubleshooting

**"ffmpeg: command not found"**
- Make sure FFmpeg is installed and in your PATH
- Try using the full path: `/usr/local/bin/ffmpeg` or wherever it's installed

**"Permission denied"**
- Make sure the `public/videos/hls` directory is writable
- Run: `chmod -R 755 public/videos`

**Videos still slow?**
- Check browser console for errors
- Verify `.m3u8` files are accessible
- Make sure CORS headers allow video access
- Test with one video first before converting all

## Alternative: Use a Cloud Service

If you prefer not to convert locally, consider:
- **Cloudflare Stream** - Automatic HLS conversion
- **Mux** - Video API with HLS
- **AWS MediaConvert** - Convert to HLS
- **Vimeo** - Upload and get HLS URLs

These services handle conversion automatically and provide CDN delivery.

