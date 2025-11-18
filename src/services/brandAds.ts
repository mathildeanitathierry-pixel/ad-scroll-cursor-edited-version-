// Brand Ad Scraper Service
// Fetches video ads from Meta Ad Library for multiple brands

import type { VideoAd } from '@/data/mockVideos';

const SEARCHAPI_KEY = import.meta.env.VITE_SEARCHAPI_KEY;
const BASE_URL = 'https://www.searchapi.io/api/v1/search';

// Brand Page IDs
export const BRANDS = {
  apple: {
    name: 'Apple',
    pageId: '434174436675167',
  },
  joeAndTheJuice: {
    name: 'Joe and the Juice',
    pageId: '156556397713534',
  }
} as const;

type BrandKey = keyof typeof BRANDS;

interface SearchAPIResponse {
  ads?: Array<{
    ad_archive_id: string;
    snapshot?: {
      videos?: Array<{
        video_sd_url: string;
        video_hd_url?: string;
        video_preview_image_url?: string;
      }>;
      body?: {
        text?: string;
      };
      title?: string;
    };
  }>;
  paging?: {
    next?: string;
    next_page_token?: string;
  };
  error?: {
    message: string;
  };
}

// Helper function to detect if text is primarily English
const isEnglish = (text: string): boolean => {
  if (!text) return true;
  
  // Check for non-Latin characters (Chinese, Japanese, Korean, Arabic, etc.)
  const nonLatinPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
  if (nonLatinPattern.test(text)) return false;
  
  // Check for Spanish and Portuguese accented characters
  const accentedPattern = /[áàâãéêíóôõúüçñ¡¿]/i;
  if (accentedPattern.test(text)) return false;
  
  return true;
};

export interface BrandAdsResponse {
  ads: VideoAd[];
  nextPageToken?: string;
  hasMore: boolean;
}

/**
 * Fetch video ads for a specific brand
 */
export async function fetchBrandVideoAds(
  brandKey: BrandKey,
  nextPageToken?: string
): Promise<BrandAdsResponse> {
  try {
    // Validate API key
    if (!SEARCHAPI_KEY) {
      throw new Error('VITE_SEARCHAPI_KEY is not set. Please add it to your .env file.');
    }
    
    if (SEARCHAPI_KEY.trim() === '') {
      throw new Error('VITE_SEARCHAPI_KEY is empty. Please check your .env file.');
    }
    
    const brand = BRANDS[brandKey];
    console.log(`🎬 Fetching ${brand.name} video ads from Meta Ad Library...`);
    console.log(`🔑 API Key present: ${SEARCHAPI_KEY.substring(0, 8)}...${SEARCHAPI_KEY.substring(SEARCHAPI_KEY.length - 4)}`);
    
    const params = new URLSearchParams({
      engine: 'meta_ad_library',
      page_id: brand.pageId,
      media_type: 'video',
      country: 'ALL',
      // Remove languages filter to get more ads
      // languages: 'en',
      api_key: SEARCHAPI_KEY
    });

    // Add pagination token if provided
    if (nextPageToken) {
      params.append('next_page_token', nextPageToken);
    }

    const response = await fetch(`${BASE_URL}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SearchAPI HTTP Error (${response.status}):`, errorText);
      throw new Error(`SearchAPI error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
    }

    const data: SearchAPIResponse = await response.json();

    // ADD THIS - Log the full response structure
    console.log(`🔍 Raw API response for ${brand.name}:`, {
      totalAds: data.ads?.length || 0,
      hasPaging: !!data.paging,
      nextToken: data.paging?.next_page_token ? 'yes' : 'no',
      error: data.error,
      firstAdStructure: data.ads?.[0] ? {
        hasSnapshot: !!data.ads[0].snapshot,
        hasVideos: !!data.ads[0].snapshot?.videos,
        videoCount: data.ads[0].snapshot?.videos?.length || 0,
        hasText: !!data.ads[0].snapshot?.body?.text
      } : null
    });

    // Log ALL ads to see their structure
    if (data.ads && data.ads.length > 0) {
      console.log(`📋 All ${data.ads.length} ads from API:`, data.ads.map((ad, idx) => ({
        index: idx,
        id: ad.ad_archive_id,
        hasSnapshot: !!ad.snapshot,
        hasVideos: !!ad.snapshot?.videos,
        videoCount: ad.snapshot?.videos?.length || 0,
        videoUrl: ad.snapshot?.videos?.[0]?.video_sd_url || ad.snapshot?.videos?.[0]?.video_hd_url || 'none'
      })));
    }
    
    if (data.error) {
      const errorMsg = data.error.message || JSON.stringify(data.error);
      console.error(`❌ SearchAPI API Error:`, data.error);
      throw new Error(`SearchAPI error: ${errorMsg}. Please check your API key is valid and has the correct permissions.`);
    }
    
    if (!data.ads || data.ads.length === 0) {
      console.warn(`⚠️  No video ads found for ${brand.name}`);
      return { ads: [], hasMore: false };
    }

    const ads: VideoAd[] = [];
    
    for (const ad of data.ads) {
      console.log(`�� Processing ad ${ad.ad_archive_id}:`, {
        hasSnapshot: !!ad.snapshot,
        hasVideos: !!ad.snapshot?.videos,
        videoCount: ad.snapshot?.videos?.length || 0,
        hasText: !!ad.snapshot?.body?.text,
        hasTitle: !!ad.snapshot?.title
      });
      
      // Check multiple possible video locations
      let videoUrl: string | null = null;
      
      if (ad.snapshot?.videos?.[0]) {
        const video = ad.snapshot.videos[0];
        videoUrl = video.video_hd_url || video.video_sd_url || null;
      }
      
      // If no video found, log it
      if (!videoUrl) {
        console.log(`⚠️  Ad ${ad.ad_archive_id} has no video URL - skipping`);
        continue;
      }
      
      const adText = ad.snapshot?.body?.text || ad.snapshot?.title || `${brand.name} Advertisement`;
      
      ads.push({
        id: ad.ad_archive_id,
        brand: brand.name,
        videoUrl: videoUrl,
        description: adText
      });
      
      console.log(`✅ Added ad: ${ad.ad_archive_id} from ${brand.name} with video: ${videoUrl.substring(0, 50)}...`);
    }
    
    const hasMore = !!data.paging?.next_page_token;
    const nextToken = data.paging?.next_page_token;
    
    console.log(`✅ Successfully fetched ${ads.length} ${brand.name} video ads (from ${data.ads?.length || 0} total ads in response)`);
    console.log(`�� Has more pages: ${hasMore}${nextToken ? ` (token: ${nextToken.substring(0, 20)}...)` : ''}`);
    
    return {
      ads,
      nextPageToken: nextToken,
      hasMore
    };
    
  } catch (error) {
    console.error(`❌ Error fetching ${BRANDS[brandKey].name} ads:`, error);
    throw error instanceof Error ? error : new Error(`Failed to fetch ${BRANDS[brandKey].name} video ads`);
  }
}

/**
 * Fetch video ads from ALL brands (Apple + Joe and the Juice)
 */
export async function fetchAllBrandVideoAds(maxPagesPerBrand: number = 3): Promise<VideoAd[]> {
  const allAds: VideoAd[] = [];
  const brandKeys = Object.keys(BRANDS) as BrandKey[];

  console.log(`🚀 Starting to fetch ads from ${brandKeys.length} brand(s), max ${maxPagesPerBrand} pages per brand`);
  console.log(`📋 Brands to fetch:`, brandKeys.map(k => BRANDS[k].name).join(', '));

  for (const brandKey of brandKeys) {
    try {
      let pageCount = 0;
      let nextToken: string | undefined = undefined;
      let brandTotalAds = 0;
      let brandErrors = 0;

      // Fetch multiple pages for each brand
      while (pageCount < maxPagesPerBrand) {
        console.log(`📄 Fetching page ${pageCount + 1}/${maxPagesPerBrand} for ${BRANDS[brandKey].name}...`);
        console.log(`   🔑 Using nextToken: ${nextToken ? nextToken.substring(0, 30) + '...' : 'none (first page)'}`);
        
        try {
          const result = await fetchBrandVideoAds(brandKey, nextToken);
          
          console.log(`   ✓ Page ${pageCount + 1}: Got ${result.ads.length} ads (hasMore: ${result.hasMore})`);
          console.log(`   📊 Running total for ${BRANDS[brandKey].name}: ${brandTotalAds + result.ads.length} ads`);
          console.log(`   🔑 Next token available: ${result.nextPageToken ? 'yes' : 'no'}`);
          
          if (result.ads.length > 0) {
            allAds.push(...result.ads);
            brandTotalAds += result.ads.length;
          } else {
            console.warn(`   ⚠️  Page ${pageCount + 1} returned 0 ads`);
          }

          if (!result.hasMore || !result.nextPageToken) {
            console.log(`📊 Reached end of ${BRANDS[brandKey].name} ads after ${pageCount + 1} pages`);
            break;
          }

          nextToken = result.nextPageToken;
          pageCount++;

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (pageError) {
          brandErrors++;
          console.error(`   ❌ Error on page ${pageCount + 1} for ${BRANDS[brandKey].name}:`, pageError);
          
          // If we get errors on multiple pages, break
          if (brandErrors >= 2) {
            console.error(`   ⛔ Too many errors for ${BRANDS[brandKey].name}, stopping`);
            break;
          }
          
          // Try next page anyway
          pageCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Total ${BRANDS[brandKey].name} ads fetched: ${brandTotalAds} ads from ${pageCount} pages`);
      
    } catch (error) {
      console.error(`❌ Failed to fetch ads for ${BRANDS[brandKey].name}:`, error);
      console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
      // Continue with other brands even if one fails
    }
  }

  console.log(`🎉 Total ads fetched from all brands: ${allAds.length} unique video ads`);
  console.log(`📊 Final breakdown:`, allAds.reduce((acc, ad) => {
    acc[ad.brand] = (acc[ad.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));
  
  return allAds;
}

/**
 * Fetch video ads with custom pagination control
 */
export async function fetchBrandVideoAdsWithPagination(
  brandKey: BrandKey,
  options: {
    maxPages?: number;
    onPageFetched?: (ads: VideoAd[], pageNumber: number) => void;
  } = {}
): Promise<VideoAd[]> {
  const { maxPages = 5, onPageFetched } = options;
  
  const allAds: VideoAd[] = [];
  let nextToken: string | undefined = undefined;
  let pageNumber = 1;

  while (pageNumber <= maxPages) {
    try {
      const result = await fetchBrandVideoAds(brandKey, nextToken);
      
      if (result.ads.length === 0) {
        console.log(`No more ads found for ${BRANDS[brandKey].name}`);
        break;
      }
      
      allAds.push(...result.ads);
      
      if (onPageFetched) {
        onPageFetched(result.ads, pageNumber);
      }

      if (!result.hasMore || !result.nextPageToken) {
        console.log(`Reached end of ${BRANDS[brandKey].name} ads after ${pageNumber} pages`);
        break;
      }
      
      nextToken = result.nextPageToken;
      pageNumber++;
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error on page ${pageNumber} for ${BRANDS[brandKey].name}:`, error);
      break;
    }
  }

  console.log(`📊 Total ${BRANDS[brandKey].name} ads: ${allAds.length}`);
  return allAds;
}

// Legacy exports for backwards compatibility
export async function fetchAllBrandAds(maxPerBrand: number = 50): Promise<VideoAd[]> {
  // Fetch more pages to get more unique ads
  return fetchAllBrandVideoAds(Math.max(5, Math.ceil(maxPerBrand / 20))); // At least 5 pages
}

export async function fetchMoreBrandAds(cursors: Record<string, string | undefined>): Promise<{ ads: VideoAd[]; cursors: Record<string, string | undefined> }> {
  // This is a simplified version - you may want to enhance this based on your needs
  const allAds: VideoAd[] = [];
  const newCursors: Record<string, string | undefined> = { ...cursors };

  for (const brandKey of Object.keys(BRANDS) as BrandKey[]) {
    try {
      const cursor = cursors[brandKey];
      const result = await fetchBrandVideoAds(brandKey, cursor);
      
      allAds.push(...result.ads);
      newCursors[brandKey] = result.nextPageToken;

      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`Error fetching more ads for ${BRANDS[brandKey].name}:`, error);
    }
  }

  return { ads: allAds, cursors: newCursors };
}

// Add this function temporarily for debugging
export async function debugFetchAds(brandKey: BrandKey): Promise<void> {
  const brand = BRANDS[brandKey];
  console.log(`🔍 DEBUG: Fetching ads for ${brand.name}...`);
  
  const params = new URLSearchParams({
    engine: 'meta_ad_library',
    page_id: brand.pageId,
    media_type: 'video',
    country: 'ALL',
    api_key: SEARCHAPI_KEY || ''
  });

  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();
  
  console.log(`🔍 DEBUG: Full API response:`, JSON.stringify(data, null, 2));
  console.log(`🔍 DEBUG: Total ads in response:`, data.ads?.length || 0);
  console.log(`🔍 DEBUG: First ad structure:`, data.ads?.[0]);
}
