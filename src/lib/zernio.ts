/**
 * Zernio API Service
 * Integrates with Zernio's content scheduling platform.
 */

export interface ZernioScheduleParams {
  content: string;
  platforms: {
    platform: string;
    accountId?: string;
    platformSpecificData?: {
      contentType?: 'story' | 'reels';
      shareToFeed?: boolean;
      collaborators?: string[];
      userTags?: { username: string; x: number; y: number; mediaIndex?: number }[];
      firstComment?: string;
      thumbOffset?: number;
      instagramThumbnail?: string;
      audioName?: string;
    };
  }[];
  mediaItems: {
    type: 'image' | 'video';
    url: string;
  }[];
  publishAt?: string;
  publishNow?: boolean;
  tiktokSettings?: {
    privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
    allow_comment: boolean;
    allow_duet?: boolean;
    allow_stitch?: boolean;
    content_preview_confirmed: boolean;
    express_consent_given: boolean;
    video_cover_timestamp_ms?: number;
    video_cover_image_url?: string;
    media_type?: 'photo';
    photo_cover_index?: number;
    description?: string;
    auto_add_music?: boolean;
    video_made_with_ai?: boolean;
    commercialContentType?: 'none' | 'brand_organic' | 'brand_content';
  };
}

const ZERNIO_API_URL = 'https://api.zernio.com/v1';

export const zernio = {
  schedule: async (params: ZernioScheduleParams) => {
    const apiKey = import.meta.env.VITE_ZERNIO_API_KEY;
    
    if (!apiKey) {
      console.warn('Zernio API key not found. Falling back to mock mode.');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        zernioId: `zn_mock_${Math.random().toString(36).substr(2, 9)}`,
        status: 'scheduled'
      };
    }

    try {
      const response = await fetch(`${ZERNIO_API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to schedule with Zernio');
      }

      const data = await response.json();
      return {
        success: true,
        zernioId: data.post?._id || data.id,
        status: 'scheduled'
      };
    } catch (error) {
      console.error('Zernio API Error:', error);
      throw error;
    }
  },
  
  getPlatforms: () => ['Instagram', 'TikTok', 'YouTube', 'Twitter'],
  
  getContentTypes: (platform: string) => {
    switch (platform) {
      case 'Instagram': return ['Reel', 'Story', 'Post'];
      case 'TikTok': return ['TikTok'];
      case 'YouTube': return ['Shorts', 'Video'];
      case 'Twitter': return ['Post'];
      default: return ['Post'];
    }
  }
};
