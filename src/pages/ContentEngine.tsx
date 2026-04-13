import React from 'react';
import { 
  Plus, 
  Sparkles, 
  Target, 
  Zap, 
  Loader2, 
  RefreshCw,
  LayoutGrid,
  BarChart3,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  Clock,
  Upload,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

// Types
import { ContentItem, ContentAnalytics, ContentReflection, ContentPlanSuggestion, Platform, ContentStatus, ContentItemWithAssets } from '../content/types';
import { Release } from '../types';

// Components
import { PostNextCard } from '../content/components/PostNextCard';
import { WeeklyContentCalendar } from '../content/components/WeeklyContentCalendar';
import { ContentCreatorPanel } from '../content/components/ContentCreatorPanel';
import { ContentPipelineBoard } from '../content/components/ContentPipelineBoard';
import { PostModeModal } from '../content/components/PostModeModal';
import { PostComposerModal } from '../content/components/PostComposerModal';
import { SchedulingManager } from '../content/components/SchedulingManager';
import { ContentPerformancePanel } from '../content/components/ContentPerformancePanel';
import { ReflectionCard } from '../content/components/ReflectionCard';
import { TrackContentImpactPanel } from '../content/components/TrackContentImpactPanel';
import { ContentInsightsPanel } from '../content/components/ContentInsightsPanel';
import { SchedulerPanel } from '../content/components/SchedulerPanel';
import { EngagementHub } from '../content/components/EngagementHub';
import { ZernioAccountStatus } from '../content/components/ZernioAccountStatus';
import { PostEditor } from '../content/components/PostEditor';
import { ContentListView } from '../content/components/ContentListView';

// Engines & Services
import { contentRecommendationEngine } from '../content/engine/contentRecommendationEngine';
import { contentSchedulerEngine } from '../content/engine/contentSchedulerEngine';
import { contentReflectionEngine } from '../content/engine/contentReflectionEngine';
import { zernioAdapter } from '../content/services/zernioAdapter';
import { contentPersistence } from '../content/services/contentPersistence';

// Mock Data
import { mockReleases, mockContentItems, mockAnalytics, mockReflections } from '../content/mockData';

export function ContentEngine() {
  // State
  const [items, setItems] = React.useState<ContentItem[]>(mockContentItems);
  const [analytics, setAnalytics] = React.useState<ContentAnalytics[]>(mockAnalytics);
  const [reflections, setReflections] = React.useState<ContentReflection[]>(mockReflections);
  const [releases, setReleases] = React.useState<Release[]>(mockReleases);
  
  const [isCreatorOpen, setIsCreatorOpen] = React.useState(false);
  const [isPostModeOpen, setIsPostModeOpen] = React.useState(false);
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<ContentItem | null>(null);
  const [editorItem, setEditorItem] = React.useState<ContentItemWithAssets | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'pipeline' | 'content' | 'scheduling' | 'analytics' | 'strategy'>('pipeline');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [contentListRefresh, setContentListRefresh] = React.useState(0);

  // Fetch real data from Zernio
  React.useEffect(() => {
    const loadZernioData = async () => {
      setIsSyncing(true);
      try {
        const [zernioPosts, zernioAnalytics] = await Promise.all([
          zernioAdapter.fetchPosts(),
          zernioAdapter.fetchAnalytics()
        ]);
        
        // Always update state if fetch was successful, even if empty
        if (zernioPosts) {
          setItems(zernioPosts);
          // Clear mock reflections if we have real data (or even if empty real data)
          setReflections([]);
        }
        if (zernioAnalytics) {
          setAnalytics(zernioAnalytics);
        }
      } catch (error) {
        console.error('ContentEngine: Initial Zernio sync failed:', error);
        // Fallback to mock data is already handled by initial state
      } finally {
        setIsSyncing(false);
      }
    };

    loadZernioData();
  }, []);

  // Recommendation Engine
  const focusTrack = contentRecommendationEngine.selectFocusTrack(releases);
  const [suggestions, setSuggestions] = React.useState<ContentPlanSuggestion[]>([]);

  React.useEffect(() => {
    if (focusTrack) {
      const lastPost = items.filter(i => i.status === 'posted').sort((a, b) => new Date(b.posted_at || '').getTime() - new Date(a.posted_at || '').getTime())[0];
      const newSuggestions = contentRecommendationEngine.generatePostRecommendations(
        focusTrack,
        lastPost?.posted_at || null,
        []
      );
      setSuggestions(newSuggestions);
    }
  }, [focusTrack, items]);

  const handleSaveContent = async (item: Partial<ContentItem>) => {
    const tempId = item.id || `cont_${Date.now()}`;
    const newItem: ContentItem = {
      id: tempId,
      user_id: 'user_1',
      title: item.title || 'Untitled Content',
      hook: item.hook || '',
      caption: item.caption || '',
      hashtags: item.hashtags || [],
      platform: item.platform || 'Instagram',
      post_type: item.post_type || 'drop_clip',
      angle: item.angle || 'hype',
      status: item.status || 'idea',
      publish_status: item.publish_status || 'draft',
      platform_settings: item.platform_settings || {},
      track_id: item.track_id,
      scheduled_at: item.scheduled_at,
      media_url: item.media_url,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    };
    newItem.id = tempId;

    if (item.id) {
      setItems(prev => prev.map(i => i.id === item.id ? newItem : i));
    } else {
      setItems(prev => [newItem, ...prev]);
    }
    setIsCreatorOpen(false);
    setSelectedItem(null);

    const persistedId = await contentPersistence.upsertItem(newItem);
    if (persistedId && persistedId !== tempId) {
      setItems(prev => prev.map(i => i.id === tempId ? { ...i, id: persistedId } : i));
    }
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await zernioAdapter.deletePost(id);
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete post from Zernio:', error);
      alert('Failed to delete post. Published posts cannot be deleted; use the Unpublish endpoint instead.');
    }
  };

  const handlePostNow = async (item: ContentItem) => {
    setSelectedItem(item);
    setIsPostModeOpen(true);
  };

  const handleExecutePost = async (item: ContentItem) => {
    const response = await zernioAdapter.postContent(item);
    if (response.status === 'success') {
      const updatedItem: ContentItem = {
        ...item,
        status: 'posted',
        posted_at: new Date().toISOString(),
        external_post_id: response.platform_post_id
      };
      setItems(items.map(i => i.id === item.id ? updatedItem : i));
      
      // Sync analytics after a delay (mocking ingestion)
      setTimeout(async () => {
        const newAna = await zernioAdapter.syncPostAnalytics(response.platform_post_id!, item.platform);
        newAna.content_item_id = item.id;
        setAnalytics([newAna, ...analytics]);
        
        // Generate reflection
        const reflection = contentReflectionEngine.generatePostReflection(updatedItem, newAna, {
          avgViews: 20000,
          avgEngagement: 8.5,
          bestPostType: 'drop_clip'
        });
        setReflections([reflection, ...reflections]);
      }, 3000);
    }
  };

  const handleAddSuggestion = (suggestion: ContentPlanSuggestion) => {
    const newItem: Partial<ContentItem> = {
      title: suggestion.title,
      hook: suggestion.description.split('.')[0],
      platform: suggestion.suggested_platform,
      post_type: suggestion.suggested_post_type,
      status: 'idea',
      track_id: suggestion.linked_track_id,
      scheduled_at: suggestion.suggested_date
    };
    handleSaveContent(newItem);
  };

  // Derived Stats
  const weeklyTarget = 7;
  const postedThisWeek = items.filter(i => i.status === 'posted').length;
  const progress = (postedThisWeek / weeklyTarget) * 100;

  try {
    return (
      <div className="space-y-12 pb-20">
        {/* Header & Stats */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Content Engine</h2>
            <p className="text-slate-500 font-medium">Your strategic command center for social growth.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-4 md:gap-6">
            <button 
              onClick={async () => {
                setIsSyncing(true);
                try {
                  const [posts, ana] = await Promise.all([
                    zernioAdapter.fetchPosts(),
                    zernioAdapter.fetchAnalytics()
                  ]);
                  setItems(posts);
                  setAnalytics(ana);
                } catch (error: any) {
                  console.error('ContentEngine: Manual Zernio sync failed:', error);
                  // We could add a toast here, but for now we'll just log it
                  // The zernioAdapter now throws descriptive errors
                } finally {
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Zernio
            </button>

            <div className="glass-card p-4 flex items-center gap-4 min-w-[240px] w-full sm:w-auto">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Goal</span>
                  <span className="text-xs font-black text-emerald-600">{postedThisWeek}/{weeklyTarget}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth Velocity</p>
                <p className="text-xl font-black text-slate-900">+12.4% <span className="text-xs text-emerald-500">↑</span></p>
              </div>
            </div>
          </div>
        </header>

        {/* 1. POST NEXT / DAILY DECISION ENGINE */}
        <PostNextCard 
          suggestion={suggestions[0] || null}
          focusTrack={focusTrack}
          onPostNow={(s) => {
            const item: ContentItem = {
              id: `cont_${Date.now()}`,
              user_id: 'user_1',
              title: s.title,
              hook: s.description.split('.')[0],
              caption: '',
              hashtags: [],
              platform: s.suggested_platform,
              post_type: s.suggested_post_type,
              angle: 'hype',
              status: 'ready',
              track_id: s.linked_track_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            setSelectedItem(item);
            setIsPostModeOpen(true);
          }}
          onGenerateNew={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1000);
          }}
          onSaveDraft={handleAddSuggestion}
          loading={loading}
        />

        {/* 2. WEEKLY CONTENT CALENDAR */}
        <WeeklyContentCalendar 
          items={items}
          onSelectItem={(item) => {
            setSelectedItem(item);
            setIsPostModeOpen(true);
          }}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <div className="flex items-center gap-8">
            {[
              { id: 'pipeline', label: 'Content Pipeline', icon: LayoutGrid },
              { id: 'content', label: 'Content', icon: Film },
              { id: 'scheduling', label: 'Scheduling', icon: Clock },
              { id: 'analytics', label: 'Performance', icon: BarChart3 },
              { id: 'strategy', label: 'Strategy & Planning', icon: Calendar }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 pb-4 text-sm font-black uppercase tracking-widest transition-all relative",
                  activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-2">
            <button 
              onClick={() => {
                setEditorItem(null);
                setIsEditorOpen(true);
              }}
              className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Content
            </button>
            <button 
              onClick={() => {
                setSelectedItem(null);
                setIsCreatorOpen(true);
              }}
              className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Idea
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'pipeline' && (
              <div className="space-y-12">
                {/* 3. CONTENT PIPELINE (KANBAN) */}
                <ContentPipelineBoard 
                  items={items}
                  releases={releases}
                  onEdit={(item) => {
                    setSelectedItem(item);
                    setIsCreatorOpen(true);
                  }}
                  onDelete={handleDeleteContent}
                  onPostNow={handlePostNow}
                  onStatusChange={(id, status) => {
                    setItems(items.map(i => i.id === id ? { ...i, status } : i));
                  }}
                />

                {/* 10. LIGHT ENGAGEMENT HUB */}
                <EngagementHub onOpenPlatform={(p) => window.open(`https://${p.toLowerCase()}.com`, '_blank')} />
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Film className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Uploaded Content</h3>
                    <p className="text-slate-500 font-medium text-sm">All your uploaded videos and their platform posts.</p>
                  </div>
                </div>
                <ContentListView
                  onEditItem={(item) => {
                    setEditorItem(item);
                    setIsEditorOpen(true);
                  }}
                  refreshTrigger={contentListRefresh}
                />
              </div>
            )}

            {activeTab === 'scheduling' && (
              <div className="space-y-12">
                <SchedulingManager
                  items={items}
                  releases={releases}
                  onEdit={(item) => {
                    setSelectedItem(item);
                    setIsComposerOpen(true);
                  }}
                  onPublishNow={async (item) => {
                    const response = await zernioAdapter.postContent(item);
                    if (response.status === 'success') {
                      setItems(prev => prev.map(i => i.id === item.id ? {
                        ...i,
                        status: 'posted' as ContentStatus,
                        publish_status: 'published' as const,
                        posted_at: new Date().toISOString(),
                        external_post_id: response.platform_post_id
                      } : i));
                      await contentPersistence.markPublished(item.id, response.platform_post_id);
                    } else {
                      setItems(prev => prev.map(i => i.id === item.id ? { ...i, publish_status: 'failed' as const, publish_error: response.error } : i));
                      await contentPersistence.markFailed(item.id, response.error);
                    }
                  }}
                  onCancel={async (item) => {
                    try {
                      await zernioAdapter.cancelScheduledPost(item);
                      setItems(prev => prev.map(i => i.id === item.id ? {
                        ...i,
                        status: 'ready' as ContentStatus,
                        publish_status: 'cancelled' as const
                      } : i));
                      await contentPersistence.markCancelled(item.id);
                    } catch (err: any) {
                      setItems(prev => prev.map(i => i.id === item.id ? { ...i, publish_error: err.message } : i));
                      throw err;
                    }
                  }}
                  onReschedule={(item) => {
                    setSelectedItem(item);
                    setIsComposerOpen(true);
                  }}
                />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-12">
                {/* 5. PERFORMANCE + ANALYTICS */}
                <ContentPerformancePanel 
                  items={items}
                  analytics={analytics}
                  releases={releases}
                />

                {/* 6. REFLECTIONS */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recent Reflections</h3>
                      <p className="text-slate-500 font-medium text-sm">AI-driven feedback on your latest experiments.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {reflections.map(ref => {
                      const item = items.find(i => i.id === ref.content_item_id);
                      if (!item) return null;
                      return (
                        <ReflectionCard 
                          key={ref.id} 
                          reflection={ref} 
                          item={item} 
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 7. TRACK CONNECTION PANEL */}
                <TrackContentImpactPanel 
                  releases={releases}
                  items={items}
                  analytics={analytics}
                />
              </div>
            )}

            {activeTab === 'strategy' && (
              <div className="space-y-12">
                {/* ZERNIO ACCOUNT STATUS */}
                <ZernioAccountStatus />

                {/* 9. AI SCHEDULER */}
                <SchedulerPanel 
                  suggestions={contentSchedulerEngine.buildWeeklyContentPlan(focusTrack, 7, [])}
                  releases={releases}
                  onAddSuggestion={handleAddSuggestion}
                />

                {/* 8. CONTENT INSIGHTS */}
                <ContentInsightsPanel 
                  items={items}
                  analytics={analytics}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Modals */}
        <ContentCreatorPanel 
          isOpen={isCreatorOpen}
          onClose={() => {
            setIsCreatorOpen(false);
            setSelectedItem(null);
          }}
          onSave={handleSaveContent}
          releases={releases}
          initialItem={selectedItem}
        />

        <PostModeModal 
          isOpen={isPostModeOpen}
          onClose={() => {
            setIsPostModeOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          release={releases.find(r => r.id === selectedItem?.track_id)}
          onPost={handleExecutePost}
          onSchedule={async (item, date) => {
            await zernioAdapter.scheduleContent(item, date);
            setItems(items.map(i => i.id === item.id ? { ...i, status: 'scheduled', scheduled_at: date } : i));
          }}
          onEdit={(item) => {
            setIsPostModeOpen(false);
            setSelectedItem(item);
            setIsCreatorOpen(true);
          }}
        />

        <PostEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditorItem(null);
          }}
          contentItem={editorItem}
          onSaved={(item) => {
            setContentListRefresh(prev => prev + 1);
            const asContentItem: ContentItem = {
              id: item.id,
              user_id: item.user_id,
              title: item.title,
              hook: item.hook || '',
              caption: item.caption || '',
              hashtags: item.hashtags || [],
              platform: item.platform,
              post_type: item.post_type,
              angle: item.angle,
              status: item.status,
              publish_status: item.publish_status,
              media_url: item.media_url,
              scheduled_at: item.scheduled_at,
              created_at: item.created_at,
              updated_at: item.updated_at,
            };
            setItems(prev => {
              const exists = prev.some(i => i.id === item.id);
              return exists ? prev.map(i => i.id === item.id ? asContentItem : i) : [asContentItem, ...prev];
            });
          }}
        />

        <PostComposerModal
          isOpen={isComposerOpen}
          onClose={() => {
            setIsComposerOpen(false);
            setSelectedItem(null);
          }}
          onSave={(item) => {
            handleSaveContent(item);
            setIsComposerOpen(false);
            setSelectedItem(null);
          }}
          onPublishNow={async (item) => {
            const response = await zernioAdapter.postContent(item);
            if (response.status === 'success') {
              const updated = {
                ...item,
                status: 'posted' as ContentStatus,
                publish_status: 'published' as const,
                posted_at: new Date().toISOString(),
                external_post_id: response.platform_post_id
              };
              setItems(prev => {
                const exists = prev.some(i => i.id === item.id);
                return exists ? prev.map(i => i.id === item.id ? updated : i) : [updated, ...prev];
              });
              await contentPersistence.markPublished(item.id, response.platform_post_id);
            } else {
              setItems(prev => prev.map(i => i.id === item.id ? { ...i, publish_status: 'failed' as const, publish_error: response.error } : i));
              await contentPersistence.markFailed(item.id, response.error);
            }
          }}
          onSchedule={async (item, scheduledAt) => {
            let itemId = item.id;
            if (itemId.startsWith('cont_')) {
              const persistedId = await contentPersistence.upsertItem(item);
              if (persistedId) {
                itemId = persistedId;
                item = { ...item, id: persistedId };
              }
            }
            const response = await zernioAdapter.scheduleContent(item, scheduledAt);
            if (response.status === 'success') {
              const updated = {
                ...item,
                id: itemId,
                status: 'scheduled' as ContentStatus,
                publish_status: 'scheduled' as const,
                scheduled_at: scheduledAt,
                zernio_job_id: response.id
              };
              setItems(prev => {
                const exists = prev.some(i => i.id === itemId || i.id === item.id);
                return exists ? prev.map(i => (i.id === itemId || i.id === item.id) ? updated : i) : [updated, ...prev];
              });
              await contentPersistence.updateSchedule(itemId, scheduledAt, response.id);
            } else {
              setItems(prev => prev.map(i => i.id === item.id ? { ...i, publish_status: 'failed' as const, publish_error: response.error } : i));
              await contentPersistence.markFailed(itemId, response.error);
            }
          }}
          onCancel={async (item) => {
            try {
              await zernioAdapter.cancelScheduledPost(item);
              setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'ready' as ContentStatus, publish_status: 'cancelled' as const } : i));
              await contentPersistence.markCancelled(item.id);
            } catch (err: any) {
              setItems(prev => prev.map(i => i.id === item.id ? { ...i, publish_error: err.message } : i));
              throw err;
            }
          }}
          releases={releases}
          initialItem={selectedItem}
        />
      </div>
    );
  } catch (error: any) {
    console.error('ContentEngine: Critical rendering error:', error);
    return (
      <div className="p-10 bg-rose-50 text-rose-700 rounded-[2.5rem] border-2 border-rose-100 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Rendering Error</h2>
            <p className="text-rose-500 font-medium text-sm">The Content Engine encountered a critical issue.</p>
          </div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-rose-100">
          <p className="text-xs font-black uppercase tracking-widest text-rose-400 mb-3">Error Details</p>
          <pre className="text-[10px] font-mono leading-relaxed overflow-auto max-h-[400px] whitespace-pre-wrap">
            {error.stack || error.message}
          </pre>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 bg-rose-600 text-white rounded-xl font-black text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
        >
          Reload Dashboard
        </button>
      </div>
    );
  }
}
