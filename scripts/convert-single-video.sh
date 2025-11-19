#!/bin/bash

# Simple script to convert a single video to HLS
# Usage: ./convert-single-video.sh input.mp4

if [ -z "$1" ]; then
  echo "Usage: ./convert-single-video.sh input.mp4"
  exit 1
fi

INPUT="$1"
FILENAME=$(basename "$INPUT" .mp4)
OUTPUT_DIR="public/videos/hls/${FILENAME}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Converting: $FILENAME"
echo "Output: $OUTPUT_DIR/playlist.m3u8"

ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -c:a aac \
  -hls_time 10 \
  -hls_playlist_type vod \
  -hls_segment_filename "$OUTPUT_DIR/segment_%03d.ts" \
  "$OUTPUT_DIR/playlist.m3u8"

if [ $? -eq 0 ]; then
  echo "✅ Successfully converted: $FILENAME"
else
  echo "❌ Failed to convert: $FILENAME"
  exit 1
fi

