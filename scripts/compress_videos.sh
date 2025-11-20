#!/bin/bash

# Directory containing videos
VIDEO_DIR="public/videos"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed."
    exit 1
fi

echo "Starting video compression..."

# Loop through all 1080p mp4 files
for file in "$VIDEO_DIR"/*_1080p.mp4; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        base="${filename%_1080p.mp4}"
        
        echo "Processing: $filename"
        
        # Generate 720p version
        output_720p="$VIDEO_DIR/${base}_720p.mp4"
        if [ ! -f "$output_720p" ]; then
            echo "  Generating 720p version..."
            ffmpeg -i "$file" -vf "scale=-2:720" -c:v libx264 -crf 26 -preset fast -c:a copy "$output_720p" -y -loglevel error
        else
            echo "  720p version already exists."
        fi
        
        # Generate 480p version
        output_480p="$VIDEO_DIR/${base}_480p.mp4"
        if [ ! -f "$output_480p" ]; then
            echo "  Generating 480p version..."
            ffmpeg -i "$file" -vf "scale=-2:480" -c:v libx264 -crf 28 -preset fast -c:a copy "$output_480p" -y -loglevel error
        else
            echo "  480p version already exists."
        fi
        
        echo "  Done."
    fi
done

echo "All videos compressed successfully!"
