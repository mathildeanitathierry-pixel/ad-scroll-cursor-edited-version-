import type { VideoAd } from '@/data/mockVideos';

const META_API_URL = 'https://graph.facebook.com/v21.0/ads_archive';
const ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN;

// Verify token has required format
if (ACCESS_TOKEN && !ACCESS_TOKEN.startsWith('EAA')) {
  console.warn('⚠️  Meta access token should start with "EAA". Current token may be invalid.');
}

// Facebook Page IDs for brands
const BRAND_PAGE_IDS: Record<string, string> = {
  'Apple': '434174436675167',
  'Nike': '15087023423',
  'Joe and the Juice': 'FIND_PAGE_ID',
  'Whoop': 'FIND_PAGE_ID',
  'Samsung': '662885103766745',
  'Coca-Cola': '40796308305'
};

interface MetaAdResponse {
  data?: Array<{
    id: string;
    ad_snapshot_url: string;
    page_name: string;
    ad_creative_bodies?: string[];
    ad_delivery_start_time?: string;
  }>;
  paging?: {
    next?: string;
  };
  error?: {
    message: string;
    code: number;
  };
}

async function fetchAdsByPageId(pageId: string, brandName: string): Promise<VideoAd[]> {
  try {
    const params = new URLSearchParams({
      access_token: ACCESS_TOKEN || '',
      search_page_ids: pageId,
      ad_reached_countries: '["US","GB","CA","AU","DE","FR"]',
      ad_active_status: 'ALL',
      ad_type: 'ALL',
      media_type: 'VIDEO',
      fields: 'id,ad_snapshot_url,page_name,ad_creative_bodies,ad_delivery_start_time',
      limit: '20'
    });

    const response = await fetch(`${META_API_URL}?${params}`);
    const data: MetaAdResponse = await response.json();
    
    if (data.error) {
      console.error(`Meta API error for ${brandName}:`, data.error);
      return [];
    }
    
    const ads: VideoAd[] = [];
    
    for (const ad of data.data || []) {
      try {
        // Extract video URL from snapshot
        const videoUrl = await extractVideoFromSnapshot(ad.ad_snapshot_url);
        
        if (videoUrl) {
          ads.push({
            id: ad.id,
            brand: brandName,
            videoUrl: videoUrl,
            description: ad.ad_creative_bodies?.[0] || `${brandName} video ad`
          });
        }
      } catch (error) {
        console.error(`Error processing ad ${ad.id}:`, error);
      }
    }
    
    console.log(`✓ ${brandName}: Found ${ads.length} video ads`);
    return ads;
    
  } catch (error) {
    console.error(`Error fetching ${brandName} ads:`, error);
    return [];
  }
}

async function extractVideoFromSnapshot(snapshotUrl: string): Promise<string | null> {
  try {
    const response = await fetch(snapshotUrl);
    const html = await response.text();
    
    // Try multiple patterns to find video URL
    const patterns = [
      /https:\/\/video[^"'\s]+\.mp4/g,
      /https:\/\/[^"'\s]*fbcdn[^"'\s]+\.mp4/g,
      /"playable_url":"([^"]+)"/g,
      /"playable_url_quality_hd":"([^"]+)"/g,
      /"video_url":"([^"]+)"/g
    ];
    
    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches && matches[0]) {
        // Unescape if needed
        let url = matches[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
        // Remove quotes if present
        url = url.replace(/^["']|["']$/g, '');
        // Clean up JSON escaped characters
        url = url.replace(/"playable_url":"/, '').replace(/"$/, '');
        return url;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting video:', error);
    return null;
  }
}

export async function fetchAllBrandAds(): Promise<VideoAd[]> {
  if (!ACCESS_TOKEN) {
    throw new Error('Meta API access token not found. Please add VITE_META_ACCESS_TOKEN to your environment variables.');
  }

  console.log('Fetching ads from Meta Ad Library...');
  console.log('Token format check:', ACCESS_TOKEN.substring(0, 10) + '...');
  
  // Test API access first
  try {
    const testParams = new URLSearchParams({
      access_token: ACCESS_TOKEN,
      fields: 'id',
      limit: '1'
    });
    
    const testResponse = await fetch(`${META_API_URL}?${testParams}`);
    const testData = await testResponse.json();
    
    if (testData.error) {
      console.error('Meta API Token Error:', testData.error);
      throw new Error(
        `Meta API authentication failed: ${testData.error.message}\n\n` +
        `Required permissions:\n` +
        `1. Your token must be a User Access Token (not App Token)\n` +
        `2. You need "ads_read" permission\n` +
        `3. Token must be generated from a Facebook account\n\n` +
        `Generate a new token at: https://developers.facebook.com/tools/explorer/\n` +
        `Select "Get User Access Token" and check the "ads_read" permission.`
      );
    }
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to connect to Meta API');
  }
  
  const allAds: VideoAd[] = [];
  
  for (const [brandName, pageId] of Object.entries(BRAND_PAGE_IDS)) {
    if (pageId === 'FIND_PAGE_ID') {
      console.warn(`⚠️  Page ID not found for ${brandName}, skipping...`);
      continue;
    }
    
    console.log(`Fetching ${brandName} ads...`);
    const ads = await fetchAdsByPageId(pageId, brandName);
    allAds.push(...ads);
    
    // Rate limiting - wait 2 seconds between brands
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✓ Total video ads fetched: ${allAds.length}`);
  return allAds;
}

// Helper function to find page ID by brand name
export async function findPageId(brandName: string): Promise<string | null> {
  if (!ACCESS_TOKEN) {
    console.error('Meta API access token not found');
    return null;
  }

  try {
    const params = new URLSearchParams({
      access_token: ACCESS_TOKEN,
      search_terms: brandName,
      ad_reached_countries: '["US"]',
      ad_active_status: 'ALL',
      fields: 'page_id,page_name',
      limit: '5'
    });

    const response = await fetch(`${META_API_URL}?${params}`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      console.log(`Found page IDs for "${brandName}":`);
      data.data.forEach((item: any) => {
        console.log(`  - ${item.page_name}: ${item.page_id}`);
      });
      return data.data[0].page_id;
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding page ID for ${brandName}:`, error);
    return null;
  }
}

// Utility function to find missing page IDs
export async function findMissingPageIds() {
  console.log('=== Finding Missing Page IDs ===\n');
  
  const results = {
    'Joe and the Juice': await findPageId('Joe and the Juice'),
    'Whoop': await findPageId('Whoop')
  };
  
  console.log('\n=== Results ===');
  console.log('Update BRAND_PAGE_IDS with these values:');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}
