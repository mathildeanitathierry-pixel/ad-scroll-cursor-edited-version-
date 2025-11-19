# Quick FFmpeg Installation

To normalize your videos, we need FFmpeg installed. Here's the fastest way:

## Option 1: Install Homebrew + FFmpeg (Recommended - 2 minutes)

Open Terminal and run these commands one by one:

```bash
# Install Homebrew (will ask for your password)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# After Homebrew installs, run this:
brew install ffmpeg
```

Then come back and run:
```bash
npm run normalize:videos
```

## Option 2: Download FFmpeg Directly (No Homebrew)

1. Visit: https://evermeet.cx/ffmpeg/
2. Download the `ffmpeg` file (for Apple Silicon Macs)
3. Move it to `/usr/local/bin/`:
   ```bash
   sudo mv ~/Downloads/ffmpeg /usr/local/bin/
   sudo chmod +x /usr/local/bin/ffmpeg
   ```

Then run:
```bash
npm run normalize:videos
```

## After Installation

Once FFmpeg is installed, the normalization script will:
- ✅ Back up all your original videos
- ✅ Re-encode them with consistent compression
- ✅ Make them all similar in size (~8-12 MB each)
- ✅ Optimize for faster loading

This will fix the loading speed inconsistency issue!

