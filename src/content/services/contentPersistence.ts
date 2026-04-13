import { supabase } from '../../lib/supabase';
import { ContentItem, PublishStatus, ContentStatus } from '../types';

function splitScheduledAt(scheduledAt?: string): { scheduled_date: string | null; scheduled_time: string | null } {
  if (!scheduledAt) return { scheduled_date: null, scheduled_time: null };
  const d = new Date(scheduledAt);
  if (isNaN(d.getTime())) return { scheduled_date: null, scheduled_time: null };
  const scheduled_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const scheduled_time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { scheduled_date, scheduled_time };
}

function toSupabaseRow(item: Partial<ContentItem>) {
  const { scheduled_date, scheduled_time } = splitScheduledAt(item.scheduled_at);
  return {
    title: item.title || 'Untitled',
    platform: item.platform || 'Instagram',
    type: mapPostTypeToDbType(item.platform),
    status: mapContentStatusToDbStatus(item.status),
    scheduled_date,
    scheduled_time,
    hook: item.hook || '',
    caption: item.caption || '',
    cta: item.cta || '',
    publish_status: item.publish_status || 'draft',
    platform_settings: item.platform_settings || {},
    zernio_post_id: item.zernio_post_id || item.zernio_job_id || null,
    media_url: item.media_url || null,
    publish_error: item.publish_error || null,
    hashtags: item.hashtags || [],
    post_type: item.post_type || null,
    angle: item.angle || null,
    posted_at: item.posted_at || null,
    linked_release_id: item.track_id || null,
    priority: 'medium',
  };
}

function mapPostTypeToDbType(platform?: string): string {
  if (!platform) return 'Post';
  switch (platform) {
    case 'Instagram': return 'Reel';
    case 'TikTok': return 'TikTok';
    case 'YouTube': return 'Reel';
    default: return 'Post';
  }
}

function mapContentStatusToDbStatus(status?: ContentStatus): string {
  switch (status) {
    case 'idea': return 'idea';
    case 'drafting': return 'editing';
    case 'ready': return 'ready';
    case 'scheduled': return 'scheduled';
    case 'posted': return 'posted';
    default: return 'idea';
  }
}

export const contentPersistence = {
  async upsertItem(item: Partial<ContentItem>): Promise<string | null> {
    try {
      const row = toSupabaseRow(item);

      if (item.id && !item.id.startsWith('cont_')) {
        const { error } = await supabase
          .from('content_items')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) {
          console.error('contentPersistence: update failed', error);
          return null;
        }
        return item.id;
      } else {
        const { data, error } = await supabase
          .from('content_items')
          .insert([row])
          .select('id')
          .single();
        if (error) {
          console.error('contentPersistence: insert failed', error);
          return null;
        }
        return data?.id || null;
      }
    } catch (err) {
      console.error('contentPersistence: upsert failed', err);
      return null;
    }
  },

  async updateStatus(
    itemId: string,
    status: ContentStatus,
    publishStatus: PublishStatus,
    extra?: Record<string, any>
  ): Promise<boolean> {
    try {
      if (itemId.startsWith('cont_')) return false;

      const updateData: Record<string, any> = {
        status: mapContentStatusToDbStatus(status),
        publish_status: publishStatus,
        updated_at: new Date().toISOString(),
        ...extra,
      };

      const { error } = await supabase
        .from('content_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) {
        console.error('contentPersistence: updateStatus failed', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('contentPersistence: updateStatus failed', err);
      return false;
    }
  },

  async updateSchedule(
    itemId: string,
    scheduledAt: string,
    zernioJobId?: string
  ): Promise<boolean> {
    try {
      if (itemId.startsWith('cont_')) return false;

      const { scheduled_date, scheduled_time } = splitScheduledAt(scheduledAt);
      const { error } = await supabase
        .from('content_items')
        .update({
          status: 'scheduled',
          publish_status: 'scheduled',
          scheduled_date,
          scheduled_time,
          zernio_post_id: zernioJobId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) {
        console.error('contentPersistence: updateSchedule failed', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('contentPersistence: updateSchedule failed', err);
      return false;
    }
  },

  async markPublished(
    itemId: string,
    externalPostId?: string
  ): Promise<boolean> {
    return this.updateStatus(itemId, 'posted', 'published', {
      posted_at: new Date().toISOString(),
      external_post_id: externalPostId || null,
    });
  },

  async markFailed(itemId: string, errorMsg?: string): Promise<boolean> {
    return this.updateStatus(itemId, 'ready', 'failed', {
      publish_error: errorMsg || null,
    });
  },

  async markCancelled(itemId: string): Promise<boolean> {
    return this.updateStatus(itemId, 'ready', 'cancelled', {
      zernio_post_id: null,
    });
  },
};
