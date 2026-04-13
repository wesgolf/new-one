import { ContentItem, ContentAnalytics, Platform, PostType } from '../types';

/**
 * Content Insights Engine
 * This summarizes performance across all content.
 */
export const contentInsightsEngine = {
  /**
   * Summarizes format performance.
   */
  summarizeFormatPerformance(posts: ContentItem[], analytics: ContentAnalytics[]): {
    format: PostType;
    avgViews: number;
    avgEngagement: number;
    count: number;
  }[] {
    const formats: Record<PostType, { totalViews: number; totalEngagement: number; count: number }> = {} as any;
    
    posts.forEach(post => {
      const postAnalytics = analytics.find(a => a.content_item_id === post.id);
      if (postAnalytics) {
        if (!formats[post.post_type]) {
          formats[post.post_type] = { totalViews: 0, totalEngagement: 0, count: 0 };
        }
        formats[post.post_type].totalViews += postAnalytics.views;
        formats[post.post_type].totalEngagement += postAnalytics.engagement_rate;
        formats[post.post_type].count += 1;
      }
    });

    return Object.entries(formats).map(([format, data]) => ({
      format: format as PostType,
      avgViews: data.totalViews / data.count,
      avgEngagement: data.totalEngagement / data.count,
      count: data.count
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);
  },

  /**
   * Gets the top-performing hooks.
   */
  getTopPerformingHooks(posts: ContentItem[], analytics: ContentAnalytics[]): {
    hook: string;
    views: number;
    engagement: number;
  }[] {
    return posts
      .map(post => {
        const postAnalytics = analytics.find(a => a.content_item_id === post.id);
        return {
          hook: post.hook,
          views: postAnalytics?.views || 0,
          engagement: postAnalytics?.engagement_rate || 0
        };
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);
  },

  /**
   * Gets the best posting windows.
   */
  getBestPostingWindows(analytics: ContentAnalytics[]): {
    window: string;
    engagement: number;
  }[] {
    // Mocking posting window analysis
    return [
      { window: 'Wed 8:00 PM', engagement: 15.4 },
      { window: 'Fri 7:30 PM', engagement: 12.8 },
      { window: 'Mon 9:00 PM', engagement: 10.2 }
    ];
  }
};
