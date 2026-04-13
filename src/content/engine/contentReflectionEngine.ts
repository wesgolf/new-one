import { ContentItem, ContentAnalytics, ContentReflection } from '../types';

/**
 * Content Reflection Engine
 * This generates feedback and insights on post performance.
 */
export const contentReflectionEngine = {
  /**
   * Generates a short reflection for a posted content item.
   */
  generatePostReflection(
    post: ContentItem,
    analytics: ContentAnalytics,
    context: {
      avgViews: number;
      avgEngagement: number;
      bestPostType: string;
    }
  ): ContentReflection {
    const verdict = analytics.views > context.avgViews * 1.5 
      ? 'high_performer' 
      : analytics.views < context.avgViews * 0.5 
        ? 'underperformer' 
        : 'average';

    const why_it_worked: string[] = [];
    const why_it_didnt: string[] = [];
    let next_experiment = '';

    if (verdict === 'high_performer') {
      why_it_worked.push('Strong hook captured attention in the first 3 seconds.');
      why_it_worked.push('Posted at a historically strong time for your audience.');
      if (post.post_type === context.bestPostType) {
        why_it_worked.push(`Aligned with your top-performing format: ${post.post_type}.`);
      }
      next_experiment = `Try a similar hook with a different track to see if the pattern holds.`;
    } else if (verdict === 'underperformer') {
      why_it_didnt.push('Weak opening hook failed to stop the scroll.');
      why_it_didnt.push('Format may not be resonating with your current followers.');
      why_it_didnt.push('Timing was outside of peak engagement windows.');
      next_experiment = `Test a more direct "POV" hook for this same track next time.`;
    } else {
      why_it_worked.push('Consistent performance within your average range.');
      why_it_didnt.push('Lacked a viral "spark" or controversial element.');
      next_experiment = `Try adding a text overlay with a question to boost comments.`;
    }

    return {
      id: `ref_${Math.random().toString(36).substr(2, 9)}`,
      content_item_id: post.id,
      verdict,
      summary: `This post performed ${verdict.replace('_', ' ')} with ${analytics.views.toLocaleString()} views.`,
      why_it_worked,
      why_it_didnt,
      next_experiment,
      generated_at: new Date().toISOString()
    };
  },

  /**
   * Detects winning patterns across all content.
   */
  detectWinningPatterns(posts: ContentItem[], analytics: ContentAnalytics[]): string[] {
    // Mocking pattern detection
    return [
      'Drop clips with "POV" hooks outperform teasers by 45%.',
      'Wednesday 8:00 PM is your highest engagement window.',
      'Tutorial content has a 3x higher save rate than performance clips.'
    ];
  },

  /**
   * Detects failure patterns across all content.
   */
  detectFailurePatterns(posts: ContentItem[], analytics: ContentAnalytics[]): string[] {
    // Mocking failure pattern detection
    return [
      'Talking clips without captions lose 60% of viewers in 2 seconds.',
      'Sunday morning posts have the lowest reach across all platforms.',
      'Generic "Out Now" captions have 50% less clicks than curiosity-based hooks.'
    ];
  }
};
