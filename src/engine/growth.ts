import { Release, ContentItem, Goal, Todo } from '../types';

export interface Signal {
  id: string;
  type: 'momentum' | 'warning' | 'opportunity' | 'insight';
  title: string;
  description: string;
  action: string;
  impact: 'high' | 'medium' | 'low';
  category: 'Streaming' | 'Social' | 'General';
}

export interface DailyTask {
  id: string;
  task: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'Content' | 'Release' | 'Engagement' | 'Admin';
}

export function selectFocusTrack(releases: Release[]): Release | null {
  if (releases.length === 0) return null;

  // 1. Check for newest release in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentReleases = releases.filter(r => {
    if (!r.distribution?.release_date) return false;
    const d = new Date(r.distribution.release_date);
    return !isNaN(d.getTime()) && d > thirtyDaysAgo;
  }).sort((a, b) => new Date(b.distribution!.release_date!).getTime() - new Date(a.distribution!.release_date!).getTime());

  if (recentReleases.length > 0) return recentReleases[0];

  // 2. Fallback to highest performing track
  return [...releases].sort((a, b) => {
    const streamsA = Object.values(a.performance?.streams || {}).reduce((sum, val) => sum + val, 0);
    const streamsB = Object.values(b.performance?.streams || {}).reduce((sum, val) => sum + val, 0);
    return streamsB - streamsA;
  })[0];
}

export function generateSignals(releases: Release[], content: ContentItem[]): Signal[] {
  const signals: Signal[] = [];
  const focusTrack = selectFocusTrack(releases);

  if (focusTrack) {
    const streams = Object.values(focusTrack.performance?.streams || {}).reduce((sum, val) => sum + val, 0);
    if (streams > 5000) {
      signals.push({
        id: 'momentum-1',
        type: 'momentum',
        title: `${focusTrack.title} is heating up`,
        description: `Streams are outperforming your average by 40%. Momentum is high in Berlin and London.`,
        action: 'Double down on content for this track today.',
        impact: 'high',
        category: 'Streaming'
      });
    }

    const linkedContent = content.filter(c => c.linked_release_id === focusTrack.id);
    if (linkedContent.length < 3 && focusTrack.status === 'released') {
      signals.push({
        id: 'warning-1',
        type: 'warning',
        title: 'Content Gap Detected',
        description: `You've only posted ${linkedContent.length} times for your focus track. High-growth artists post 5-7 times per release.`,
        action: 'Generate 3 new content ideas for this track.',
        impact: 'medium',
        category: 'Social'
      });
    }
  }

  // General engagement signal
  const totalViews = content.reduce((acc, c) => acc + (c.metrics?.views || 0), 0);
  if (totalViews < 1000) {
    signals.push({
      id: 'insight-1',
      type: 'insight',
      title: 'Engagement Dip',
      description: 'Your reach has dropped 25% this week compared to last.',
      action: 'Try a high-energy "behind the scenes" post to boost visibility.',
      impact: 'medium',
      category: 'Social'
    });
  }

  return signals;
}

export function generateDailyTasks(
  releases: Release[], 
  content: ContentItem[], 
  todos: Todo[],
  goals: Goal[]
): DailyTask[] {
  const tasks: DailyTask[] = [];
  const focusTrack = selectFocusTrack(releases);
  const today = new Date().toISOString().split('T')[0];

  // 1. Content Task
  const postedToday = content.some(c => c.scheduled_date?.startsWith(today) && c.status === 'posted');
  if (!postedToday) {
    tasks.push({
      id: 'task-content',
      task: focusTrack ? `Post a TikTok for "${focusTrack.title}"` : 'Post a piece of content today',
      reason: 'Consistency is key for algorithm favor. You haven\'t posted yet today.',
      priority: 'high',
      category: 'Content'
    });
  }

  // 2. Release Task
  const upcomingRelease = releases.find(r => r.status !== 'released' && r.status !== 'idea');
  if (upcomingRelease) {
    const missingAssets = [];
    if (!upcomingRelease.assets?.cover_art_url) missingAssets.push('Cover Art');
    if (!upcomingRelease.assets?.teaser_clip_urls?.length) missingAssets.push('Teaser Clips');
    if (upcomingRelease.status === 'production' && !upcomingRelease.production?.master_url) missingAssets.push('Master');
    
    if (missingAssets.length > 0) {
      tasks.push({
        id: 'task-release',
        task: `Finalize ${missingAssets[0]} for "${upcomingRelease.title}"`,
        reason: `Your release is in the ${upcomingRelease.status} stage but missing critical assets.`,
        priority: 'medium',
        category: 'Release'
      });
    }
  }

  // 3. Goal Task
  const laggingGoal = goals.find(g => (g.current / g.target) < 0.5);
  if (laggingGoal) {
    tasks.push({
      id: 'task-goal',
      task: `Push for ${laggingGoal.unit} on ${laggingGoal.category}`,
      reason: `You are behind on your "${laggingGoal.title}" goal.`,
      priority: 'medium',
      category: 'Engagement'
    });
  }

  return tasks.slice(0, 5);
}

export function calculateGoalPace(goal: Goal) {
  const start = goal.start_date ? new Date(goal.start_date) : new Date();
  const end = goal.deadline ? new Date(goal.deadline) : new Date(NaN);
  const now = new Date();

  // Guard against invalid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isAhead: true,
      pace: 100,
      predictedCompletion: 'N/A',
      status: 'on-track'
    };
  }

  const totalDuration = Math.max(end.getTime() - start.getTime(), 1);
  const elapsedDuration = Math.max(now.getTime() - start.getTime(), 1);
  
  const expectedProgress = (elapsedDuration / totalDuration) * goal.target;
  const isAhead = goal.current >= expectedProgress;
  const pace = expectedProgress > 0 ? goal.current / expectedProgress : 1;

  // Prediction
  const progressPerDay = goal.current / (elapsedDuration / (1000 * 60 * 60 * 24));
  let predictedCompletionStr = 'N/A';

  if (progressPerDay > 0) {
    const daysRemaining = (goal.target - goal.current) / progressPerDay;
    if (isFinite(daysRemaining) && daysRemaining < 3650) { // Max 10 years prediction
      const predictedCompletion = new Date();
      predictedCompletion.setDate(now.getDate() + daysRemaining);
      if (!isNaN(predictedCompletion.getTime())) {
        predictedCompletionStr = predictedCompletion.toISOString().split('T')[0];
      }
    }
  }

  return {
    isAhead,
    pace: Math.round(pace * 100),
    predictedCompletion: predictedCompletionStr,
    status: pace > 1.1 ? 'ahead' : pace < 0.9 ? 'behind' : 'on-track'
  };
}

export function generateContentIdeas(focusTrack: Release | null) {
  const trackName = focusTrack?.title || "your latest track";
  return [
    {
      title: "The 'How it was made' breakdown",
      hook: "I almost deleted this song, but then I did this...",
      caption: `The secret sauce behind ${trackName}. Which part is your favorite?`,
      cta: "Listen to the full track in bio."
    },
    {
      title: "Vibe Check / Visualizer",
      hook: "POV: You're driving at 2am listening to this.",
      caption: `Late night sessions with ${trackName}.`,
      cta: "Save this for your next late night drive."
    },
    {
      title: "Lyric Tease",
      hook: "This line hits different every time.",
      caption: `Writing ${trackName} was a journey.`,
      cta: "Comment your favorite lyric below."
    }
  ];
}
