#!/usr/bin/env node

/**
 * Script to convert MP4 videos to HLS format
 * 
 * Requirements:
 * - FFmpeg must be installed (brew install ffmpeg or apt-get install ffmpeg)
 * 
 * Usage:
 *   node scripts/convert-to-hls.js [input-directory] [output-directory]
 * 
 * Example:
 *   node scripts/convert-to-hls.js public/videos public/videos/hls
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get input and output directories from command line args
const inputDir = process.argv[2] || join(__dirname, '../public/videos');
const outputDir = process.argv[3] || join(__dirname, '../public/videos/hls');

// Check if FFmpeg is installed
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Convert a single video to HLS
function convertToHls(inputFile, outputFile) {
  const filename = basename(inputFile, extname(inputFile));
  const outputPath = join(outputDir, filename);
  
  // Create output directory
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
  }
  
  const playlistPath = join(outputPath, 'playlist.m3u8');
  const segmentPath = join(outputPath, 'segment_%03d.ts');
  
  console.log(`Converting: ${filename}...`);
  
  try {
    execSync(
      `ffmpeg -i "${inputFile}" ` +
      `-c:v libx264 -c:a aac ` +
      `-hls_time 10 ` +
      `-hls_playlist_type vod ` +
      `-hls_segment_filename "${segmentPath}" ` +
      `"${playlistPath}"`,
      { stdio: 'inherit' }
    );
    
    console.log(`✅ Converted: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to convert: ${filename}`, error.message);
    return false;
  }
}

// Main function
function main() {
  console.log('🎬 HLS Video Converter\n');
  
  // Check FFmpeg
  if (!checkFFmpeg()) {
    console.error('❌ FFmpeg is not installed!');
    console.error('Install it with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
    process.exit(1);
  }
  
  // Check input directory
  if (!existsSync(inputDir)) {
    console.error(`❌ Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }
  
  // Find all MP4 files
  const files = readdirSync(inputDir)
    .filter(file => file.endsWith('.mp4'))
    .map(file => join(inputDir, file));
  
  if (files.length === 0) {
    console.log('⚠️  No MP4 files found in:', inputDir);
    process.exit(0);
  }
  
  console.log(`Found ${files.length} video(s) to convert\n`);
  
  // Convert each video
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    if (convertToHls(file, outputDir)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n✨ Conversion complete!`);
  console.log(`✅ Success: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
  }
  
  console.log(`\n📝 Note: Update getHlsUrl() in src/lib/video-utils.ts if your HLS files are in a different location.`);
}

main();

