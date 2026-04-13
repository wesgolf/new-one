import { supabase } from '../lib/supabase';
import { PlatformPost } from '../content/types';
import { zernioService } from './zernioService';
import { contentService } from './contentService';

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  error?: string;
}

async function logPublishAction(
  contentItemId: string,
  platform: string,
  action: string,
  responsePayload: any,
  success: boolean,
  errorMessage?: string
) {
  try {
    if (!contentItemId || contentItemId.startsWith('local_') || contentItemId.startsWith('pp_')) {
      console.warn('Skipping publish log for non-UUID ID:', contentItemId);
      return;
    }
    const { error } = await supabase.from('publish_logs').insert([{
      content_item_id: contentItemId,
      action,
      platform,
      status: success ? 'success' : 'failed',
      zernio_response: responsePayload || {},
      error_message: errorMessage,
    }]);
    if (error) {
      console.error('Publish log insert failed:', error);
    }
  } catch (err) {
    console.error('Failed to log publish action:', err);
  }
}

function validatePlatformPost(post: PlatformPost): string | null {
  if (post.platform === 'YouTube') {
    if (!post.title?.trim()) return 'YouTube requires a title';
    const settings = post.platform_settings_json || {};
    if (!settings.audience) {
      post.platform_settings_json = { ...settings, audience: 'not_kids' };
    }
  }
  if (post.platform === 'TikTok') {
    if (!post.caption?.trim()) return 'TikTok requires a caption';
  }
  if (post.platform === 'Instagram') {
    if (!post.caption?.trim()) return 'Instagram requires a caption';
  }
  return null;
}

export const publishService = {
  validatePost: validatePlatformPost,

  async publishNow(post: PlatformPost, mediaUrl?: string): Promise<PublishResult> {
    const validationError = validatePlatformPost(post);
    if (validationError) {
      return { success: false, error: validationError };
    }

    await contentService.updatePlatformPost(post.id, { status: 'publishing' });

    try {
      let result: PublishResult;
      switch (post.platform) {
        case 'Instagram':
          result = await zernioService.publishInstagramPost(post, mediaUrl);
          break;
        case 'TikTok':
          result = await zernioService.publishTikTokPost(post, mediaUrl);
          break;
        case 'YouTube':
          result = await zernioService.publishYouTubeShort(post, mediaUrl);
          break;
        default:
          result = { success: false, error: `Unsupported platform: ${post.platform}` };
      }

      if (result.success) {
        await contentService.updatePlatformPost(post.id, {
          status: 'published',
          published_at: new Date().toISOString(),
          external_post_id: result.externalPostId,
          external_post_url: result.externalPostUrl,
        });
      } else {
        await contentService.updatePlatformPost(post.id, {
          status: 'failed',
          error_message: result.error,
        });
      }

      await logPublishAction(
        post.content_item_id,
        post.platform,
        'publish',
        result,
        result.success,
        result.error
      );

      return result;
    } catch (err: any) {
      await contentService.updatePlatformPost(post.id, {
        status: 'failed',
        error_message: err.message,
      });
      await logPublishAction(
        post.content_item_id,
        post.platform,
        'publish',
        null,
        false,
        err.message
      );
      return { success: false, error: err.message };
    }
  },

  async schedulePost(post: PlatformPost, scheduledAt: string, mediaUrl?: string): Promise<PublishResult> {
    const validationError = validatePlatformPost(post);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return { success: false, error: 'Schedule time must be in the future' };
    }

    try {
      let result: PublishResult;
      switch (post.platform) {
        case 'Instagram':
          result = await zernioService.scheduleInstagramPost(post, scheduledAt, mediaUrl);
          break;
        case 'TikTok':
          result = await zernioService.scheduleTikTokPost(post, scheduledAt, mediaUrl);
          break;
        case 'YouTube':
          result = await zernioService.scheduleYouTubeShort(post, scheduledAt, mediaUrl);
          break;
        default:
          result = { success: false, error: `Unsupported platform: ${post.platform}` };
      }

      if (result.success) {
        await contentService.updatePlatformPost(post.id, {
          status: 'scheduled',
          scheduled_at: scheduledAt,
          zernio_post_id: result.externalPostId,
        });
      } else {
        await contentService.updatePlatformPost(post.id, {
          status: 'failed',
          error_message: result.error,
        });
      }

      await logPublishAction(
        post.content_item_id,
        post.platform,
        'schedule',
        result,
        result.success,
        result.error
      );

      return result;
    } catch (err: any) {
      await logPublishAction(
        post.content_item_id,
        post.platform,
        'schedule',
        null,
        false,
        err.message
      );
      return { success: false, error: err.message };
    }
  },

  async cancelScheduledPost(post: PlatformPost): Promise<PublishResult> {
    try {
      if (post.zernio_post_id && !post.zernio_post_id.startsWith('mock_')) {
        await zernioService.cancelPost(post.zernio_post_id);
      }

      await contentService.updatePlatformPost(post.id, {
        status: 'cancelled',
        scheduled_at: undefined,
        zernio_post_id: undefined,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
