#!/bin/bash

# Script to normalize all videos with consistent compression settings
# This will make all videos similar in size and loading speed

set -e

# Add Homebrew to PATH if it exists
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEOS_DIR="$SCRIPT_DIR/../public/videos"
BACKUP_DIR="$VIDEOS_DIR/backup_$(date +%Y%m%d_%H%M%S)"

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed!"
    echo ""
    echo "Please install FFmpeg first:"
    echo "  1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "  2. Install FFmpeg: brew install ffmpeg"
    exit 1
fi

echo "✅ FFmpeg found: $(ffmpeg -version | head -1)"
echo ""

# Check if videos directory exists
if [ ! -d "$VIDEOS_DIR" ]; then
    echo "❌ Videos directory not found: $VIDEOS_DIR"
    exit 1
fi

# Create backup directory
echo "📦 Creating backup of original videos..."
mkdir -p "$BACKUP_DIR"

# Find all MP4 files (compatible with all bash versions)
videos=()
for file in "$VIDEOS_DIR"/*.mp4; do
    [ -f "$file" ] && videos+=("$file")
done

if [ ${#videos[@]} -eq 0 ]; then
    echo "⚠️  No MP4 files found in $VIDEOS_DIR"
    exit 0
fi

echo "📹 Found ${#videos[@]} video(s) to normalize"
echo ""
echo "⚠️  This will re-encode all videos with consistent settings."
echo "    Original files will be backed up to: $BACKUP_DIR"
echo ""

# Auto-confirm if running non-interactively (from npm script)
if [ -t 0 ]; then
    # Interactive mode - ask for confirmation
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
else
    # Non-interactive mode - auto-confirm
    echo "Auto-confirming (non-interactive mode)..."
fi

# Backup original files
echo ""
echo "📦 Backing up original files..."
for video in "${videos[@]}"; do
    cp "$video" "$BACKUP_DIR/"
done
echo "✅ Backup complete"
echo ""

# Normalize each video
success=0
failed=0

for video in "${videos[@]}"; do
    filename=$(basename "$video")
    temp_file="${video%.mp4}_normalized.mp4"
    
    echo "🔄 Normalizing: $filename..."
    
    # Re-encode with consistent settings for uniform file sizes:
    # - b:v 2.5M: Constant video bitrate (ensures similar file sizes)
    # - maxrate 2.5M: Maximum bitrate
    # - bufsize 5M: Buffer size for rate control
    # - preset fast: Faster encoding
    # - movflags +faststart: Optimize for web streaming (faster initial load)
    # - b:a 128k: Consistent audio bitrate
    # - f mp4: Explicitly specify output format
    # This ensures all videos are similar size (~8-12 MB) for consistent loading
    ffmpeg -i "$video" \
        -c:v libx264 \
        -preset fast \
        -b:v 2.5M \
        -maxrate 2.5M \
        -bufsize 5M \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -f mp4 \
        -loglevel error \
        -y \
        "$temp_file" > /dev/null 2>&1
    
    ffmpeg_exit=$?
    
    # Check if output file was created and has content
    if [ $ffmpeg_exit -eq 0 ] && [ -f "$temp_file" ] && [ -s "$temp_file" ]; then
        # Replace original with normalized version
        mv "$temp_file" "$video"
        echo "   ✅ Success: $filename"
        ((success++))
    else
        echo "   ❌ Failed: $filename (exit code: $ffmpeg_exit)"
        rm -f "$temp_file"
        ((failed++))
    fi
    echo ""
done

echo "=========================================="
echo "✨ Normalization Complete!"
echo "   ✅ Success: $success"
if [ $failed -gt 0 ]; then
    echo "   ❌ Failed: $failed"
fi
echo ""
echo "📁 Original files backed up to: $BACKUP_DIR"
echo ""
echo "💡 Run 'node scripts/check-video-sizes.js' to verify the results"

