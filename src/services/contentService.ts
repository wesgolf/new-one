import { supabase } from '../lib/supabase';
import { ContentItem, ContentAsset, PlatformPost, ContentItemWithAssets } from '../content/types';

export const contentService = {
  async uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<ContentAsset | null> {
    const filePath = `videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { data, error } = await supabase.storage
      .from('content-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('content-media')
      .getPublicUrl(data.path);

    const asset: Omit<ContentAsset, 'id' | 'content_item_id' | 'created_at'> = {
      file_url: urlData.publicUrl,
      file_path: data.path,
      file_name: file.name,
      mime_type: file.type,
      asset_type: 'video',
      file_size_bytes: file.size,
    };

    if (onProgress) onProgress(100);

    return asset as ContentAsset;
  },

  async createContentItem(data: {
    title: string;
    campaign?: string;
    notes?: string;
    media_url?: string;
  }): Promise<string | null> {
    const { data: row, error } = await supabase
      .from('content_items')
      .insert([{
        title: data.title || 'Untitled Upload',
        platform: 'Instagram',
        type: 'Reel',
        status: 'idea',
        publish_status: 'draft',
        media_url: data.media_url || null,
        campaign: data.campaign || null,
        notes: data.notes || null,
        priority: 'medium',
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Create content item failed:', error);
      return null;
    }
    return row?.id || null;
  },

  async createAsset(contentItemId: string, asset: Partial<ContentAsset>): Promise<string | null> {
    const { data, error } = await supabase
      .from('content_assets')
      .insert([{
        content_item_id: contentItemId,
        file_url: asset.file_url,
        file_path: asset.file_path,
        file_name: asset.file_name,
        mime_type: asset.mime_type,
        asset_type: asset.asset_type || 'video',
        file_size_bytes: asset.file_size_bytes,
        duration_seconds: asset.duration_seconds,
        thumbnail_url: asset.thumbnail_url,
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Create asset failed:', error);
      return null;
    }
    return data?.id || null;
  },

  async createPlatformPost(contentItemId: string, platform: PlatformPost['platform']): Promise<PlatformPost | null> {
    const { data, error } = await supabase
      .from('platform_posts')
      .insert([{
        content_item_id: contentItemId,
        platform,
        status: 'draft',
        hashtags: [],
        platform_settings_json: {},
      }])
      .select()
      .single();

    if (error) {
      console.error('Create platform post failed:', error);
      return null;
    }
    return data as PlatformPost;
  },

  async updatePlatformPost(id: string, updates: Partial<PlatformPost>): Promise<boolean> {
    const { error } = await supabase
      .from('platform_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Update platform post failed:', error);
      return false;
    }
    return true;
  },

  async updateContentItem(id: string, updates: Partial<ContentItemWithAssets>): Promise<boolean> {
    const { error } = await supabase
      .from('content_items')
      .update({
        title: updates.title,
        campaign: updates.campaign,
        notes: updates.notes,
        media_url: updates.media_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Update content item failed:', error);
      return false;
    }
    return true;
  },

  async getPlatformPosts(contentItemId: string): Promise<PlatformPost[]> {
    const { data, error } = await supabase
      .from('platform_posts')
      .select('*')
      .eq('content_item_id', contentItemId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch platform posts failed:', error);
      return [];
    }
    return (data || []) as PlatformPost[];
  },

  async getAssets(contentItemId: string): Promise<ContentAsset[]> {
    const { data, error } = await supabase
      .from('content_assets')
      .select('*')
      .eq('content_item_id', contentItemId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch assets failed:', error);
      return [];
    }
    return (data || []) as ContentAsset[];
  },

  async getContentItemsWithPosts(filters?: {
    platform?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ContentItemWithAssets[]> {
    let query = supabase
      .from('content_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('publish_status', filters.status);
    }

    const { data: items, error } = await query;
    if (error || !items) {
      console.error('Fetch content items failed:', error);
      return [];
    }

    const itemIds = items.map((i: any) => i.id);
    if (itemIds.length === 0) return [];

    const [{ data: posts }, { data: assets }] = await Promise.all([
      supabase.from('platform_posts').select('*').in('content_item_id', itemIds),
      supabase.from('content_assets').select('*').in('content_item_id', itemIds),
    ]);

    return items.map((item: any) => ({
      ...item,
      platform_posts: (posts || []).filter((p: any) => p.content_item_id === item.id),
      assets: (assets || []).filter((a: any) => a.content_item_id === item.id),
    })) as ContentItemWithAssets[];
  },

  async deletePlatformPost(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('platform_posts')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Delete platform post failed:', error);
      return false;
    }
    return true;
  },

  async getScheduledPlatformPosts(): Promise<PlatformPost[]> {
    const { data, error } = await supabase
      .from('platform_posts')
      .select('*')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Fetch scheduled posts failed:', error);
      return [];
    }
    return (data || []) as PlatformPost[];
  },
};
