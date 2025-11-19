#!/usr/bin/env node

/**
 * Script to check video file sizes and properties
 * Helps identify if videos have different compression levels
 */

import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const videosDir = join(__dirname, '../public/videos');

console.log('📹 Video File Analysis\n');
console.log('='.repeat(80) + '\n');

// Get all MP4 files
const files = readdirSync(videosDir)
  .filter(file => file.endsWith('.mp4'))
  .sort();

if (files.length === 0) {
  console.log('❌ No MP4 files found');
  process.exit(1);
}

console.log(`Found ${files.length} video file(s)\n`);

// Check if ffprobe is available
let hasFFprobe = false;
try {
  execSync('ffprobe -version', { stdio: 'ignore' });
  hasFFprobe = true;
} catch (error) {
  console.log('⚠️  ffprobe not available - will only show file sizes\n');
}

const videoData = [];

// Analyze each video
for (const file of files) {
  const filePath = join(videosDir, file);
  const stats = statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  const data = {
    filename: file,
    sizeBytes: stats.size,
    sizeMB: parseFloat(sizeMB),
  };
  
  // Get video properties if ffprobe is available
  if (hasFFprobe) {
    try {
      const ffprobeOutput = execSync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
        { encoding: 'utf8' }
      );
      
      const info = JSON.parse(ffprobeOutput);
      
      // Find video stream
      const videoStream = info.streams?.find(s => s.codec_type === 'video');
      const format = info.format;
      
      if (videoStream) {
        data.duration = parseFloat(videoStream.duration || format.duration || 0);
        data.bitrate = parseInt(format.bit_rate || 0);
        data.bitrateMbps = (data.bitrate / 1000000).toFixed(2);
        data.codec = videoStream.codec_name;
        data.width = videoStream.width;
        data.height = videoStream.height;
        data.fps = eval(videoStream.r_frame_rate || '0/1');
        data.sizePerSecond = data.duration > 0 ? (data.sizeMB / data.duration).toFixed(2) : 0;
      }
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${file}:`, error.message);
    }
  }
  
  videoData.push(data);
}

// Sort by size
videoData.sort((a, b) => a.sizeMB - b.sizeMB);

// Display results
console.log('File Sizes:\n');
console.log('Filename'.padEnd(60) + 'Size (MB)'.padEnd(12) + 'Size (bytes)');
console.log('-'.repeat(80));

for (const data of videoData) {
  const sizeStr = data.sizeMB.toFixed(2) + ' MB';
  const bytesStr = data.sizeBytes.toLocaleString();
  console.log(data.filename.padEnd(60) + sizeStr.padEnd(12) + bytesStr);
}

// Show statistics
console.log('\n' + '='.repeat(80));
console.log('\n📊 Statistics:\n');

const sizes = videoData.map(v => v.sizeMB);
const minSize = Math.min(...sizes);
const maxSize = Math.max(...sizes);
const avgSize = (sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2);
const sizeDiff = ((maxSize - minSize) / minSize * 100).toFixed(1);

console.log(`Smallest: ${minSize.toFixed(2)} MB`);
console.log(`Largest:  ${maxSize.toFixed(2)} MB`);
console.log(`Average:  ${avgSize} MB`);
console.log(`Difference: ${sizeDiff}% (${((maxSize - minSize)).toFixed(2)} MB)`);

// Show bitrate info if available
if (hasFFprobe && videoData[0].bitrate) {
  console.log('\n' + '='.repeat(80));
  console.log('\n🎬 Video Properties:\n');
  console.log('Filename'.padEnd(60) + 'Bitrate'.padEnd(12) + 'Codec'.padEnd(10) + 'Resolution'.padEnd(15) + 'MB/sec');
  console.log('-'.repeat(80));
  
  for (const data of videoData) {
    if (data.bitrate) {
      const bitrateStr = data.bitrateMbps + ' Mbps';
      const codecStr = (data.codec || 'N/A').padEnd(10);
      const resStr = data.width && data.height ? `${data.width}x${data.height}`.padEnd(15) : 'N/A'.padEnd(15);
      const mbpsStr = data.sizePerSecond ? data.sizePerSecond + ' MB/s' : 'N/A';
      console.log(data.filename.padEnd(60) + bitrateStr.padEnd(12) + codecStr + resStr + mbpsStr);
    }
  }
  
  const bitrates = videoData.filter(v => v.bitrate).map(v => parseFloat(v.bitrateMbps));
  if (bitrates.length > 0) {
    const minBitrate = Math.min(...bitrates);
    const maxBitrate = Math.max(...bitrates);
    const avgBitrate = (bitrates.reduce((a, b) => a + b, 0) / bitrates.length).toFixed(2);
    
    console.log('\n📊 Bitrate Statistics:');
    console.log(`Min: ${minBitrate} Mbps`);
    console.log(`Max: ${maxBitrate} Mbps`);
    console.log(`Avg: ${avgBitrate} Mbps`);
  }
}

// Recommendations
console.log('\n' + '='.repeat(80));
console.log('\n💡 Recommendations:\n');

if (sizeDiff > 50) {
  console.log('⚠️  Large size difference detected!');
  console.log(`   Some videos are ${sizeDiff}% larger than others.`);
  console.log('   This will cause inconsistent loading times.');
  console.log('\n   Solution: Re-encode all videos with consistent settings:');
  console.log('   Run: npm run normalize:videos');
} else if (sizeDiff > 20) {
  console.log('⚠️  Moderate size difference detected.');
  console.log('   Consider re-encoding videos for consistency.');
  console.log('   Run: npm run normalize:videos');
} else {
  console.log('✅ Video sizes are relatively consistent.');
}

if (hasFFprobe && videoData[0].bitrate) {
  const bitrates = videoData.filter(v => v.bitrate).map(v => parseFloat(v.bitrateMbps));
  if (bitrates.length > 0) {
    const bitrateDiff = ((Math.max(...bitrates) - Math.min(...bitrates)) / Math.min(...bitrates) * 100).toFixed(1);
    
    if (bitrateDiff > 50) {
      console.log('\n⚠️  Large bitrate difference detected!');
      console.log(`   Bitrates vary by ${bitrateDiff}%.`);
      console.log('   This causes inconsistent loading speeds.');
      console.log('\n   Solution: Re-encode with consistent bitrate:');
      console.log('   Run: npm run normalize:videos');
    }
  }
}

console.log('\n');

