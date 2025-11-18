import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Brand mapping based on video filename patterns
const brandMap = {
  'NIKE': 'Nike',
  'Apple': 'Apple',
  'WHOOP': 'WHOOP',
  'adidas': 'Adidas',
  'Samsung': 'Samsung',
  'Cluely': 'Cluely',
  'Lovable': 'Lovable',
  'Luma-AI': 'Luma AI',
  'Saucony': 'Saucony',
  'Oakley': 'Oakley',
};

// Description templates
const descriptionMap = {
  'Nike': 'Why Do It - Just Do It. Push your limits and achieve greatness.',
  'Apple': (filename) => {
    if (filename.includes('AirPods')) {
      return 'Introducing AirPods Pro 3 - Revolutionary sound. Adaptive audio. Pure magic.';
    }
    return 'Great ideas start on Mac - Where creativity meets innovation. Build something amazing.';
  },
  'WHOOP': 'The Best Obsess - Track your recovery, strain, and sleep. Optimize your performance.',
  'Adidas': 'You Got This - Impossible is nothing. Believe in yourself and achieve the impossible.',
  'Samsung': 'The Next Big Thing Is You - Innovation that empowers you to do more.',
  'Cluely': 'Introducing the Cluely Marketing Team - Building the future of marketing together.',
  'Lovable': 'Lovable 2.0 is here - Multiplayer vibe. Code together, build together, ship together.',
  'Luma AI': 'Introducing Modify Video - Transform your videos with AI. Create, edit, and enhance with ease.',
  'Saucony': 'Run As One - Find your stride. Every runner has a story, every run is a journey.',
  'Oakley': 'Meta Vanguard - Athletic Intelligence. Performance meets innovation in every frame.',
};

function extractBrand(filename) {
  for (const [key, brand] of Object.entries(brandMap)) {
    if (filename.includes(key)) {
      return brand;
    }
  }
  return 'Unknown Brand';
}

function getDescription(brand, filename) {
  const desc = descriptionMap[brand];
  if (typeof desc === 'function') {
    return desc(filename);
  }
  return desc || `${brand} video advertisement`;
}

function generateVideoList() {
  const videosDir = path.join(__dirname, '../public/videos');
  const files = fs.readdirSync(videosDir)
    .filter(file => file.endsWith('.mp4'))
    .sort();

  console.log(`Found ${files.length} video files in public/videos/`);

  const videoAds = files.map((file, index) => {
    const brand = extractBrand(file);
    const description = getDescription(brand, file);
    
    return {
      id: String(index + 1),
      videoUrl: `/videos/${file}`,
      brand,
      description,
    };
  });

  // Generate TypeScript file content
  const tsContent = `export interface VideoAd {
  id: string;
  videoUrl: string;
  brand: string;
  description: string;
}

// Local video ads - videos should be in public/videos/ folder
// This file is auto-generated. Run: node scripts/generate-video-list.js
export const mockVideoAds: VideoAd[] = [
${videoAds.map(video => `  {
    id: "${video.id}",
    videoUrl: "${video.videoUrl}",
    brand: "${video.brand}",
    description: "${video.description}",
  }`).join(',\n')}
];
`;

  // Write to file
  const outputPath = path.join(__dirname, '../src/data/mockVideos.ts');
  fs.writeFileSync(outputPath, tsContent, 'utf8');
  
  console.log(`✅ Generated ${videoAds.length} video entries in ${outputPath}`);
  console.log('\nVideos included:');
  videoAds.forEach(v => {
    console.log(`  ${v.id}. ${v.brand} - ${v.videoUrl.split('/').pop()}`);
  });
}

generateVideoList();

