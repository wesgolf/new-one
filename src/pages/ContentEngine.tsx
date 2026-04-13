import React from 'react';
import { 
  Loader2, 
  Film,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

import { ContentItem, ContentStatus, ContentItemWithAssets, PlatformPost, BestPostingTime } from '../content/types';
import { Release } from '../types';

import { WeeklyContentCalendar } from '../content/components/WeeklyContentCalendar';
import { BestTimesPanel } from '../content/components/BestTimesPanel';
import { ContentLibrary } from '../content/components/ContentLibrary';
import { PostComposerModal } from '../content/components/PostComposerModal';
import { PostEditor } from '../content/components/PostEditor';
import { ContentPipelineBoard } from '../content/components/ContentPipelineBoard';
import { ContentCreatorPanel } from '../content/components/ContentCreatorPanel';
import { PostModeModal } from '../content/components/PostModeModal';

import { zernioAdapter } from '../content/services/zernioAdapter';
import { contentPersistence } from '../content/services/contentPersistence';
import { contentService } from '../services/contentService';

import { mockReleases, mockContentItems } from '../content/mockData';

const SYNC_INTERVAL_MS = 60 * 60 * 1000;

export function ContentEngine() {
  const [items, setItems] = React.useState<ContentItem[]>(mockContentItems);
  const [releases, setReleases] = React.useState<Release[]>(mockReleases);
  
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = React.useState(false);
  const [isPostModeOpen, setIsPostModeOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<ContentItem | null>(null);
  const [editorItem, setEditorItem] = React.useState<ContentItemWithAssets | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);
  const [contentListRefresh, setContentListRefresh] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<'library' | 'pipeline'>('library');
  const [scheduledPlatformItems, setScheduledPlatformItems] = React.useState<ContentItem[]>([]);
  const [bestTimes, setBestTimes] = React.useState<BestPostingTime[]>([]);
  const [isBestTimesLoading, setIsBestTimesLoading] = React.useState(true);

  const loadScheduledPlatformPosts = React.useCallback(async () => {
    try {
      const platformPosts = await contentService.getScheduledPlatformPosts();
      const asItems: ContentItem[] = platformPosts.map((pp: PlatformPost) => ({
        id: `pp_${pp.id}`,
        user_id: 'user_1',
        title: pp.title || pp.caption || 'Scheduled Post',
        hook: pp.caption || '',
        caption: pp.caption || '',
        hashtags: pp.hashtags || [],
        platform: pp.platform,
        post_type: 'drop_clip',
        angle: 'hype',
        status: 'scheduled' as ContentStatus,
        publish_status: 'scheduled',
        scheduled_at: pp.scheduled_at,
        created_at: pp.created_at,
        updated_at: pp.updated_at,
      }));
      setScheduledPlatformItems(asItems);
    } catch {
      setScheduledPlatformItems([]);
    }
  }, []);

  const syncZernio = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const posts = await zernioAdapter.fetchPosts();
      if (posts) setItems(posts);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Zernio sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
    loadScheduledPlatformPosts();
  }, [loadScheduledPlatformPosts]);

  React.useEffect(() => {
    syncZernio();

    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const initialTimeout = setTimeout(() => {
      syncZernio();
      intervalId = setInterval(syncZernio, SYNC_INTERVAL_MS);
    }, msUntilNextHour);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [syncZernio]);

  React.useEffect(() => {
    setIsBestTimesLoading(true);
    Promise.all([
      zernioAdapter.getBestPostingTimes('Instagram'),
      zernioAdapter.getBestPostingTimes('TikTok'),
      zernioAdapter.getBestPostingTimes('YouTube'),
    ])
      .then(([ig, tt, yt]) => setBestTimes([...ig, ...tt, ...yt]))
      .catch(() => setBestTimes([]))
      .finally(() => setIsBestTimesLoading(false));
  }, []);

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
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleExecutePost = async (item: ContentItem) => {
    const response = await zernioAdapter.postContent(item);
    if (response.status === 'success') {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'posted' as ContentStatus,
        posted_at: new Date().toISOString(),
        external_post_id: response.platform_post_id
      } : i));
    }
  };

  const handleAddPostFromCalendar = (date: Date, time?: string) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const localDateStr = `${y}-${m}-${d}`;
    const scheduled_at = time
      ? new Date(`${localDateStr}T${time}`).toISOString()
      : date.toISOString();
    
    const newItem: ContentItem = {
      id: `cont_${Date.now()}`,
      user_id: 'user_1',
      title: '',
      hook: '',
      caption: '',
      hashtags: [],
      platform: 'Instagram',
      post_type: 'drop_clip',
      angle: 'hype',
      status: 'idea',
      publish_status: 'draft',
      scheduled_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelectedItem(newItem);
    setIsComposerOpen(true);
  };

  try {
    return (
      <div className="space-y-8 pb-20">
        <header className="flex items-end justify-between">
          <div className="space-y-1">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Content</h2>
            <div className="flex items-center gap-3">
              <p className="text-slate-400 font-medium text-sm">Manage, schedule, and publish your content.</p>
              {isSyncing && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Syncing
                </span>
              )}
              {lastSyncTime && !isSyncing && (
                <span className="text-[10px] text-slate-300 font-medium">
                  Synced {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => {
              setEditorItem(null);
              setIsEditorOpen(true);
            }}
            className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            New Post
          </button>
        </header>

        <WeeklyContentCalendar 
          items={[...items, ...scheduledPlatformItems]}
          onSelectItem={(item) => {
            setSelectedItem(item);
            setIsComposerOpen(true);
          }}
          onAddPost={handleAddPostFromCalendar}
          bestTimes={bestTimes}
        />

        <BestTimesPanel bestTimes={bestTimes} isLoading={isBestTimesLoading} />

        <div className="flex items-center gap-6 border-b border-slate-200 pb-1">
          {[
            { id: 'library', label: 'Content Library', icon: Film },
            { id: 'pipeline', label: 'Pipeline', icon: Film },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-black uppercase tracking-widest transition-all relative",
                activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="contentTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'library' && (
              <ContentLibrary
                onEditItem={(item) => {
                  setEditorItem(item);
                  setIsEditorOpen(true);
                }}
                onUploadNew={() => {
                  setEditorItem(null);
                  setIsEditorOpen(true);
                }}
                refreshTrigger={contentListRefresh}
              />
            )}

            {activeTab === 'pipeline' && (
              <ContentPipelineBoard 
                items={items}
                releases={releases}
                onEdit={(item) => {
                  setSelectedItem(item);
                  setIsCreatorOpen(true);
                }}
                onDelete={handleDeleteContent}
                onPostNow={(item) => {
                  setSelectedItem(item);
                  setIsPostModeOpen(true);
                }}
                onStatusChange={(id, status) => {
                  setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
                }}
              />
            )}

          </motion.div>
        </AnimatePresence>

        <PostEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditorItem(null);
          }}
          contentItem={editorItem}
          releases={releases}
          onDraftSaved={() => setActiveTab('library')}
          onSaved={(item) => {
            setContentListRefresh(prev => prev + 1);
            loadScheduledPlatformPosts();
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
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'scheduled' as ContentStatus, scheduled_at: date } : i));
          }}
          onEdit={(item) => {
            setIsPostModeOpen(false);
            setSelectedItem(item);
            setIsCreatorOpen(true);
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
        <h2 className="text-2xl font-black tracking-tight mb-4">Something went wrong</h2>
        <pre className="text-xs font-mono overflow-auto max-h-[200px] bg-white/50 p-4 rounded-xl">{error.stack || error.message}</pre>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-rose-600 text-white rounded-xl font-black text-sm">
          Reload
        </button>
      </div>
    );
  }
}
