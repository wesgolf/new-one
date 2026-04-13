import { Platform } from './types';

export type FieldType = 'text' | 'textarea' | 'select' | 'toggle' | 'tags' | 'number';

export interface SettingFieldOption {
  value: string;
  label: string;
}

export interface SettingField {
  key: string;
  label: string;
  type: FieldType;
  defaultValue: any;
  options?: SettingFieldOption[];
  placeholder?: string;
  description?: string;
  group?: string;
}

export interface PlatformSettingsConfig {
  platform: Platform;
  label: string;
  icon: string;
  fields: SettingField[];
}

export const platformSettingsRegistry: Record<Platform, PlatformSettingsConfig> = {
  Instagram: {
    platform: 'Instagram',
    label: 'Instagram Settings',
    icon: 'instagram',
    fields: [
      {
        key: 'content_type',
        label: 'Content Type',
        type: 'select',
        defaultValue: 'reels',
        options: [
          { value: 'reels', label: 'Reel' },
          { value: 'story', label: 'Story' },
          { value: 'post', label: 'Feed Post' },
          { value: 'carousel', label: 'Carousel' },
        ],
        group: 'Content',
      },
      {
        key: 'share_to_feed',
        label: 'Share Reel to Feed',
        type: 'toggle',
        defaultValue: true,
        description: 'Also show this reel in your main feed',
        group: 'Content',
      },
      {
        key: 'trial_reel',
        label: 'Trial Reel',
        type: 'toggle',
        defaultValue: false,
        description: 'Test reel with a smaller audience first',
        group: 'Content',
      },
      {
        key: 'cover_image_url',
        label: 'Cover Image URL',
        type: 'text',
        defaultValue: '',
        placeholder: 'https://...',
        group: 'Media',
      },
      {
        key: 'first_comment',
        label: 'First Comment',
        type: 'textarea',
        defaultValue: '',
        placeholder: 'Auto-post a first comment (e.g. link in bio)',
        group: 'Engagement',
      },
      {
        key: 'collaborators',
        label: 'Collaborators',
        type: 'tags',
        defaultValue: [],
        placeholder: 'Add collaborator usernames',
        group: 'Engagement',
      },
      {
        key: 'location',
        label: 'Location Tag',
        type: 'text',
        defaultValue: '',
        placeholder: 'Tag a location',
        group: 'Engagement',
      },
    ],
  },
  TikTok: {
    platform: 'TikTok',
    label: 'TikTok Settings',
    icon: 'tiktok',
    fields: [
      {
        key: 'privacy_level',
        label: 'Privacy',
        type: 'select',
        defaultValue: 'PUBLIC_TO_EVERYONE',
        options: [
          { value: 'PUBLIC_TO_EVERYONE', label: 'Public' },
          { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends Only' },
          { value: 'FOLLOWER_OF_CREATOR', label: 'Followers Only' },
          { value: 'SELF_ONLY', label: 'Private' },
        ],
        group: 'Privacy',
      },
      {
        key: 'allow_comment',
        label: 'Allow Comments',
        type: 'toggle',
        defaultValue: true,
        group: 'Engagement',
      },
      {
        key: 'allow_duet',
        label: 'Allow Duets',
        type: 'toggle',
        defaultValue: true,
        group: 'Engagement',
      },
      {
        key: 'allow_stitch',
        label: 'Allow Stitches',
        type: 'toggle',
        defaultValue: true,
        group: 'Engagement',
      },
      {
        key: 'video_made_with_ai',
        label: 'Video Made with AI',
        type: 'toggle',
        defaultValue: false,
        description: 'Disclose if AI was used in creation',
        group: 'Compliance',
      },
      {
        key: 'commercial_content',
        label: 'Commercial Content',
        type: 'select',
        defaultValue: 'none',
        options: [
          { value: 'none', label: 'None' },
          { value: 'brand_organic', label: 'Brand Organic' },
          { value: 'brand_content', label: 'Branded Content' },
        ],
        group: 'Compliance',
      },
      {
        key: 'feed_view',
        label: 'Feed View',
        type: 'select',
        defaultValue: 'default',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'full_screen', label: 'Full Screen' },
        ],
        group: 'Display',
      },
    ],
  },
  YouTube: {
    platform: 'YouTube',
    label: 'YouTube Shorts Settings',
    icon: 'youtube',
    fields: [
      {
        key: 'video_title',
        label: 'Video Title',
        type: 'text',
        defaultValue: '',
        placeholder: 'Title for YouTube (max 100 chars)',
        group: 'Details',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        defaultValue: '',
        placeholder: 'Video description',
        group: 'Details',
      },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        defaultValue: 'Music',
        options: [
          { value: 'Music', label: 'Music' },
          { value: 'Entertainment', label: 'Entertainment' },
          { value: 'Education', label: 'Education' },
          { value: 'HowtoStyle', label: 'How-to & Style' },
          { value: 'PeopleBlogs', label: 'People & Blogs' },
          { value: 'ScienceTechnology', label: 'Science & Technology' },
        ],
        group: 'Details',
      },
      {
        key: 'privacy',
        label: 'Privacy',
        type: 'select',
        defaultValue: 'public',
        options: [
          { value: 'public', label: 'Public' },
          { value: 'unlisted', label: 'Unlisted' },
          { value: 'private', label: 'Private' },
        ],
        group: 'Visibility',
      },
      {
        key: 'made_for_kids',
        label: 'Made for Kids',
        type: 'toggle',
        defaultValue: false,
        description: 'Content is made for children (COPPA)',
        group: 'Audience',
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'tags',
        defaultValue: [],
        placeholder: 'Add tags for discoverability',
        group: 'SEO',
      },
      {
        key: 'allow_comments',
        label: 'Allow Comments',
        type: 'toggle',
        defaultValue: true,
        group: 'Engagement',
      },
    ],
  },
  Twitter: {
    platform: 'Twitter',
    label: 'Twitter/X Settings',
    icon: 'twitter',
    fields: [
      {
        key: 'reply_settings',
        label: 'Reply Settings',
        type: 'select',
        defaultValue: 'everyone',
        options: [
          { value: 'everyone', label: 'Everyone' },
          { value: 'following', label: 'People You Follow' },
          { value: 'mentioned', label: 'Only Mentioned' },
        ],
        group: 'Engagement',
      },
      {
        key: 'sensitive_content',
        label: 'Contains Sensitive Content',
        type: 'toggle',
        defaultValue: false,
        group: 'Compliance',
      },
    ],
  },
};

export function getDefaultSettings(platform: Platform): Record<string, any> {
  const config = platformSettingsRegistry[platform];
  if (!config) return {};
  const defaults: Record<string, any> = {};
  for (const field of config.fields) {
    defaults[field.key] = field.defaultValue;
  }
  return defaults;
}

export function getSettingGroups(platform: Platform): string[] {
  const config = platformSettingsRegistry[platform];
  if (!config) return [];
  const groups = new Set<string>();
  for (const field of config.fields) {
    if (field.group) groups.add(field.group);
  }
  return Array.from(groups);
}
