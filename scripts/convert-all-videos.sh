#!/bin/bash

# Script to convert all MP4 videos to HLS format
# Make sure FFmpeg is installed first!

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEOS_DIR="$SCRIPT_DIR/../public/videos"
HLS_DIR="$VIDEOS_DIR/hls"

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed!"
    echo ""
    echo "Please install FFmpeg first:"
    echo "  1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "  2. Install FFmpeg: brew install ffmpeg"
    echo ""
    echo "Or see INSTALL_FFMPEG.md for other options"
    exit 1
fi

echo "✅ FFmpeg found: $(ffmpeg -version | head -1)"
echo ""

# Check if videos directory exists
if [ ! -d "$VIDEOS_DIR" ]; then
    echo "❌ Videos directory not found: $VIDEOS_DIR"
    exit 1
fi

# Create HLS directory
mkdir -p "$HLS_DIR"

# Find all MP4 files
mapfile -t videos < <(find "$VIDEOS_DIR" -maxdepth 1 -name "*.mp4" -type f)

if [ ${#videos[@]} -eq 0 ]; then
    echo "⚠️  No MP4 files found in $VIDEOS_DIR"
    exit 0
fi

echo "📹 Found ${#videos[@]} video(s) to convert"
echo ""

# Convert each video
success=0
failed=0

for video in "${videos[@]}"; do
    filename=$(basename "$video" .mp4)
    output_dir="$HLS_DIR/$filename"
    
    echo "🔄 Converting: $filename..."
    
    mkdir -p "$output_dir"
    
    if ffmpeg -i "$video" \
        -c:v libx264 \
        -c:a aac \
        -hls_time 10 \
        -hls_playlist_type vod \
        -hls_segment_filename "$output_dir/segment_%03d.ts" \
        "$output_dir/playlist.m3u8" \
        -y -loglevel error -stats; then
        echo "   ✅ Success: $filename"
        ((success++))
    else
        echo "   ❌ Failed: $filename"
        ((failed++))
    fi
    echo ""
done

echo "=========================================="
echo "✨ Conversion Complete!"
echo "   ✅ Success: $success"
if [ $failed -gt 0 ]; then
    echo "   ❌ Failed: $failed"
fi
echo ""
echo "📁 HLS files are in: $HLS_DIR"
echo ""

