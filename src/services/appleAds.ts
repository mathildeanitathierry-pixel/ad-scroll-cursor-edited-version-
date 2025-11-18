import type { VideoAd } from '@/data/mockVideos';

const SEARCHAPI_KEY = import.meta.env.VITE_SEARCHAPI_KEY;
const BASE_URL = 'https://www.searchapi.io/api/v1/search';

// Apple's official Facebook Page ID
const APPLE_PAGE_ID = '434174436675167';

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
  };
  error?: {
    message: string;
  };
}

export async function fetchAppleVideoAds(): Promise<VideoAd[]> {
  try {
    // Validate API key
    if (!SEARCHAPI_KEY) {
      throw new Error('VITE_SEARCHAPI_KEY is not set. Please add it to your .env file.');
    }
    
    if (SEARCHAPI_KEY.trim() === '') {
      throw new Error('VITE_SEARCHAPI_KEY is empty. Please check your .env file.');
    }
    
    console.log('🍎 Fetching Apple video ads from Meta Ad Library via SearchAPI...');
    console.log(`🔑 API Key present: ${SEARCHAPI_KEY.substring(0, 8)}...${SEARCHAPI_KEY.substring(SEARCHAPI_KEY.length - 4)}`);
    
    const params = new URLSearchParams({
      engine: 'meta_ad_library',
      page_id: APPLE_PAGE_ID,
      media_type: 'video',
      country: 'ALL',
      languages: 'en',
      api_key: SEARCHAPI_KEY
    });

    const response = await fetch(`${BASE_URL}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SearchAPI HTTP Error (${response.status}):`, errorText);
      throw new Error(`SearchAPI error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
    }

    const data: SearchAPIResponse = await response.json();
    
    if (data.error) {
      console.error(`❌ SearchAPI API Error:`, data.error);
      throw new Error(`SearchAPI error: ${data.error.message}. Please check your API key is valid and has the correct permissions.`);
    }
    
    if (!data.ads || data.ads.length === 0) {
      console.warn('⚠️  No video ads found for Apple');
      return [];
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

    const ads: VideoAd[] = [];
    
    for (const ad of data.ads) {
      if (ad.snapshot?.videos?.[0]) {
        const video = ad.snapshot.videos[0];
        const adText = ad.snapshot.body?.text || ad.snapshot.title || 'Apple Advertisement';
        
        // Only include if video URL exists and text is in English
        if (video.video_sd_url && isEnglish(adText)) {
          ads.push({
            id: ad.ad_archive_id,
            brand: 'Apple',
            videoUrl: video.video_hd_url || video.video_sd_url,
            description: adText
          });
        }
      }
    }
    
    console.log(`✅ Successfully fetched ${ads.length} Apple video ads`);
    return ads;
    
  } catch (error) {
    console.error('❌ Error fetching Apple ads:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch Apple video ads');
  }
}

export interface AppleAdsResponse {
  ads: VideoAd[];
  nextCursor?: string;
}

export async function fetchMoreAppleAds(cursor?: string): Promise<AppleAdsResponse> {
  try {
    // Validate API key
    if (!SEARCHAPI_KEY) {
      throw new Error('VITE_SEARCHAPI_KEY is not set. Please add it to your .env file.');
    }
    
    if (SEARCHAPI_KEY.trim() === '') {
      throw new Error('VITE_SEARCHAPI_KEY is empty. Please check your .env file.');
    }
    
    const params = new URLSearchParams({
      engine: 'meta_ad_library',
      page_id: APPLE_PAGE_ID,
      media_type: 'video',
      country: 'ALL',
      languages: 'en',
      api_key: SEARCHAPI_KEY,
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await fetch(`${BASE_URL}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SearchAPI HTTP Error (${response.status}):`, errorText);
      throw new Error(`SearchAPI error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
    }
    
    const data: SearchAPIResponse = await response.json();

    if (data.error) {
      console.error(`❌ SearchAPI API Error:`, data.error);
      throw new Error(`SearchAPI error: ${data.error.message}. Please check your API key is valid and has the correct permissions.`);
    }
    
    // Helper function to detect if text is primarily English
    const isEnglish = (text: string): boolean => {
      if (!text) return true;
      const nonLatinPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
      if (nonLatinPattern.test(text)) return false;
      const accentedPattern = /[áàâãéêíóôõúüçñ¡¿]/i;
      if (accentedPattern.test(text)) return false;
      return true;
    };

    const ads: VideoAd[] = [];
    
    for (const ad of data.ads || []) {
      if (ad.snapshot?.videos?.[0]?.video_sd_url) {
        const adText = ad.snapshot.body?.text || ad.snapshot.title || 'Apple Advertisement';
        
        // Only include English ads
        if (isEnglish(adText)) {
          ads.push({
            id: ad.ad_archive_id,
            brand: 'Apple',
            videoUrl: ad.snapshot.videos[0].video_hd_url || ad.snapshot.videos[0].video_sd_url,
            description: adText
          });
        }
      }
    }
    
    console.log(`✅ Successfully fetched ${ads.length} more Apple video ads`);
    
    return {
      ads,
      nextCursor: (data as any).paging?.next
    };
  } catch (error) {
    console.error('Error fetching more Apple ads:', error);
    return { ads: [] };
  }
}
