import { Release } from '../../types';
import { ContentPlanSuggestion, Platform, PostType } from '../types';

/**
 * Content Scheduler Engine
 * This handles the weekly and campaign-based planning.
 */
export const contentSchedulerEngine = {
  /**
   * Builds a weekly content plan based on focus track and posting goals.
   */
  buildWeeklyContentPlan(
    focusTrack: Release | null,
    postingGoal: number,
    upcomingEvents: any[]
  ): ContentPlanSuggestion[] {
    if (!focusTrack) return [];

    const suggestions: ContentPlanSuggestion[] = [];
    const now = new Date();
    const platforms: Platform[] = ['Instagram', 'TikTok', 'YouTube'];
    const postTypes: PostType[] = ['drop_clip', 'teaser', 'talking', 'mashup', 'performance', 'tutorial'];

    for (let i = 0; i < postingGoal; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i + 1);
      
      suggestions.push({
        id: `week_${i}`,
        type: 'weekly',
        linked_track_id: focusTrack.id,
        title: `Weekly Post ${i + 1}`,
        description: `Scheduled post to maintain consistency and push "${focusTrack.title}".`,
        suggested_platform: platforms[i % platforms.length],
        suggested_post_type: postTypes[i % postTypes.length],
        suggested_date: date.toISOString(),
        priority_score: 8.0,
        rationale: 'Consistency goal for the week.'
      });
    }

    return suggestions;
  },

  /**
   * Builds a release campaign plan.
   */
  buildReleaseCampaignPlan(release: Release): ContentPlanSuggestion[] {
    const suggestions: ContentPlanSuggestion[] = [];
    const releaseDate = new Date(release.release_date || '');
    
    const campaignMilestones = [
      { daysBefore: 14, title: 'Announcement', type: 'teaser' as PostType, platform: 'Instagram' as Platform },
      { daysBefore: 7, title: 'First Teaser', type: 'teaser' as PostType, platform: 'TikTok' as Platform },
      { daysBefore: 3, title: 'Buildup Clip', type: 'drop_clip' as PostType, platform: 'Instagram' as Platform },
      { daysBefore: 1, title: 'Reminder', type: 'talking' as PostType, platform: 'TikTok' as Platform },
      { daysBefore: 0, title: 'Release Day Push', type: 'drop_clip' as PostType, platform: 'Instagram' as Platform },
      { daysBefore: -2, title: 'Reaction / Performance', type: 'performance' as PostType, platform: 'YouTube' as Platform }
    ];

    campaignMilestones.forEach((milestone, index) => {
      const date = new Date(releaseDate);
      date.setDate(releaseDate.getDate() - milestone.daysBefore);
      
      suggestions.push({
        id: `camp_${index}`,
        type: 'release_campaign',
        linked_track_id: release.id,
        title: milestone.title,
        description: `Strategic campaign post for "${release.title}".`,
        suggested_platform: milestone.platform,
        suggested_post_type: milestone.type,
        suggested_date: date.toISOString(),
        priority_score: 9.5,
        rationale: `Release campaign milestone: ${milestone.daysBefore} days from release.`
      });
    });

    return suggestions;
  },

  /**
   * Suggests the next posting window based on historical data.
   */
  suggestNextPostingWindow(): { date: string; window: string } {
    const now = new Date();
    const nextWindow = new Date(now);
    nextWindow.setHours(20, 0, 0, 0); // Default to 8:00 PM
    if (nextWindow < now) nextWindow.setDate(now.getDate() + 1);
    
    return {
      date: nextWindow.toISOString(),
      window: '8:00 PM'
    };
  }
};
