# Quick FFmpeg Installation Guide

## Option 1: Install Homebrew (Recommended - 2 minutes)

1. **Open Terminal** (Applications > Utilities > Terminal)

2. **Install Homebrew** (copy and paste this command):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   - Enter your Mac password when prompted
   - Wait for installation to complete (~2-3 minutes)

3. **Install FFmpeg**:
   ```bash
   brew install ffmpeg
   ```

4. **Verify installation**:
   ```bash
   ffmpeg -version
   ```

## Option 2: Download FFmpeg Directly (No Homebrew)

1. **Visit**: https://evermeet.cx/ffmpeg/
2. **Download**: `ffmpeg` (for Apple Silicon) or `ffmpeg-intel` (for Intel Mac)
3. **Extract** the downloaded file
4. **Move to a location in your PATH**:
   ```bash
   sudo mv ffmpeg /usr/local/bin/
   sudo chmod +x /usr/local/bin/ffmpeg
   ```

## Option 3: Use MacPorts (If you have it)

```bash
sudo port install ffmpeg
```

## After Installation

Once FFmpeg is installed, run:

```bash
npm run convert:hls
```

This will convert all your videos to HLS format automatically!

## Quick Test

To test if FFmpeg is working:

```bash
ffmpeg -version
```

You should see version information if it's installed correctly.

