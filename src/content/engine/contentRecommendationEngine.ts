import { Release } from '../../types';
import { ContentItem, ContentPlanSuggestion, Platform, PostType } from '../types';

/**
 * Content Recommendation Engine
 * This is the "brain" of the Content Engine.
 * It scores posting opportunities and generates suggestions.
 */
export const contentRecommendationEngine = {
  /**
   * Selects the focus track based on release proximity and momentum.
   */
  selectFocusTrack(releases: Release[]): Release | null {
    if (releases.length === 0) return null;
    
    // Sort by release date proximity (upcoming or recently released)
    const now = new Date();
    const sorted = [...releases].sort((a, b) => {
      const dateA = new Date(a.release_date || '');
      const dateB = new Date(b.release_date || '');
      const diffA = Math.abs(dateA.getTime() - now.getTime());
      const diffB = Math.abs(dateB.getTime() - now.getTime());
      return diffA - diffB;
    });
    
    return sorted[0];
  },

  /**
   * Generates 1–3 recommended posts based on the current context.
   */
  generatePostRecommendations(
    focusTrack: Release | null,
    lastPostDate: string | null,
    recentPerformance: any[]
  ): ContentPlanSuggestion[] {
    if (!focusTrack) return [];

    const suggestions: ContentPlanSuggestion[] = [];
    const now = new Date();
    const daysSinceLastPost = lastPostDate 
      ? Math.floor((now.getTime() - new Date(lastPostDate).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    // 1. Momentum-based suggestion
    suggestions.push({
      id: `sug_${Math.random().toString(36).substr(2, 9)}`,
      type: 'daily',
      linked_track_id: focusTrack.id,
      title: 'Momentum Push',
      description: `"${focusTrack.title}" is gaining momentum. Share a "behind the scenes" clip of how you made the lead synth.`,
      suggested_platform: 'TikTok',
      suggested_post_type: 'tutorial',
      suggested_date: now.toISOString(),
      priority_score: 8.8,
      rationale: 'Focus track is gaining momentum and tutorial content is currently trending.'
    });

    // 3. Release-based suggestion
    const releaseDate = new Date(focusTrack.release_date || '');
    const daysToRelease = Math.floor((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysToRelease > 0 && daysToRelease <= 7) {
      suggestions.push({
        id: `sug_${Math.random().toString(36).substr(2, 9)}`,
        type: 'release_campaign',
        linked_track_id: focusTrack.id,
        title: 'Release Countdown',
        description: `Only ${daysToRelease} days until "${focusTrack.title}" drops. Post a teaser clip with a strong "Pre-save now" CTA.`,
        suggested_platform: 'Instagram',
        suggested_post_type: 'teaser',
        suggested_date: now.toISOString(),
        priority_score: 9.8,
        rationale: 'Release date is approaching. Maximum hype required.'
      });
    }

    return suggestions.sort((a, b) => b.priority_score - a.priority_score);
  },

  /**
   * Scores a posting opportunity from 0-10.
   */
  scorePostingOpportunity(context: {
    daysSinceLastPost: number;
    trackMomentum: number;
    releaseProximity: number;
  }): number {
    let score = 5; // Base score
    
    if (context.daysSinceLastPost >= 2) score += 2;
    if (context.trackMomentum > 0.7) score += 1.5;
    if (context.releaseProximity <= 7) score += 1.5;
    
    return Math.min(10, score);
  }
};
