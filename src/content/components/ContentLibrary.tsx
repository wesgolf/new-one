import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Film, Upload, Plus, Instagram, Music2, Youtube, Loader2, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ContentItemWithAssets } from '../types';
import { contentService } from '../../services/contentService';

interface ContentLibraryProps {
  onEditItem: (item: ContentItemWithAssets) => void;
  onUploadNew: () => void;
  refreshTrigger?: number;
}

const platformIcons: Record<string, React.ElementType> = {
  Instagram: Instagram,
  TikTok: Music2,
  YouTube: Youtube,
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  scheduled: 'bg-blue-100 text-blue-700',
  publishing: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-600',
  cancelled: 'bg-slate-100 text-slate-400',
};

function LibraryCard({ item, onEdit }: { item: ContentItemWithAssets; onEdit: (item: ContentItemWithAssets) => void }) {
  const [notes, setNotes] = useState(item.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setNotesSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setIsSavingNotes(true);
      try {
        await contentService.updateContentItem(item.id, { notes: val });
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      } catch {}
      setIsSavingNotes(false);
    }, 800);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col"
    >
      <div
        className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] shadow-lg hover:shadow-xl transition-all cursor-pointer group hover:scale-[1.02]"
        onClick={() => onEdit(item)}
      >
        {item.media_url || item.assets?.[0]?.file_url ? (
          <video
            src={item.media_url || item.assets?.[0]?.file_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <Film className="w-8 h-8 text-slate-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs font-black truncate">{item.title || 'Untitled'}</p>
          {item.campaign && <p className="text-white/60 text-[9px] font-bold mt-0.5">{item.campaign}</p>}
        </div>

        <div className="absolute top-2 left-2 right-2 flex items-center gap-1 flex-wrap">
          {item.platform_posts && item.platform_posts.length > 0 ? (
            item.platform_posts.map(post => {
              const Icon = platformIcons[post.platform] || Film;
              return (
                <div
                  key={post.id}
                  className={cn(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black backdrop-blur-sm",
                    statusColors[post.status] || statusColors.draft
                  )}
                >
                  <Icon className="w-2.5 h-2.5" />
                </div>
              );
            })
          ) : (
            <div className="px-1.5 py-0.5 rounded-md bg-white/80 backdrop-blur-sm text-[8px] font-black text-slate-500">
              Draft
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <p className="text-xs font-bold text-slate-700 truncate">{item.title || 'Untitled'}</p>
        <p className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p>

        <div className="mt-2 relative" onClick={e => e.stopPropagation()}>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add notes..."
            rows={2}
            className="w-full text-[10px] text-slate-600 placeholder:text-slate-300 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-200 rounded-xl px-2 py-1.5 resize-none outline-none transition-all leading-relaxed"
          />
          {(isSavingNotes || notesSaved) && (
            <div className="absolute bottom-1.5 right-1.5">
              {isSavingNotes
                ? <Loader2 className="w-2.5 h-2.5 text-slate-300 animate-spin" />
                : <Check className="w-2.5 h-2.5 text-emerald-500" />
              }
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ContentLibrary({ onEditItem, onUploadNew, refreshTrigger }: ContentLibraryProps) {
  const [items, setItems] = useState<ContentItemWithAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unposted' | 'scheduled' | 'published'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, [refreshTrigger]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await contentService.getContentItemsWithPosts();
      setItems(data);
    } catch (err) {
      console.error('Failed to load content library:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'unposted') {
      return !item.publish_status || item.publish_status === 'draft';
    }
    if (filter === 'scheduled') {
      return item.publish_status === 'scheduled' ||
        item.platform_posts?.some(p => p.status === 'scheduled');
    }
    if (filter === 'published') {
      return item.publish_status === 'published' ||
        item.platform_posts?.some(p => p.status === 'published');
    }
    return true;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4')
    );

    if (files.length === 0) return;

    for (const file of files) {
      try {
        let mediaUrl: string | undefined;
        try {
          const asset = await contentService.uploadVideo(file);
          if (asset) mediaUrl = asset.file_url;
        } catch {
          mediaUrl = URL.createObjectURL(file);
        }

        const itemId = await contentService.createContentItem({
          title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
          media_url: mediaUrl,
        });

        if (itemId && !itemId.startsWith('local_')) {
          await contentService.createAsset(itemId, {
            file_url: mediaUrl || '',
            file_name: file.name,
            mime_type: file.type,
            asset_type: 'video',
            file_size_bytes: file.size,
          });
        }
      } catch (err) {
        console.error('Failed to add dropped file:', err);
      }
    }

    await loadItems();
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      f => f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4')
    );

    if (files.length === 0) return;

    for (const file of files) {
      try {
        let mediaUrl: string | undefined;
        try {
          const asset = await contentService.uploadVideo(file);
          if (asset) mediaUrl = asset.file_url;
        } catch {
          mediaUrl = URL.createObjectURL(file);
        }

        const itemId = await contentService.createContentItem({
          title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
          media_url: mediaUrl,
        });

        if (itemId && !itemId.startsWith('local_')) {
          await contentService.createAsset(itemId, {
            file_url: mediaUrl || '',
            file_name: file.name,
            mime_type: file.type,
            asset_type: 'video',
            file_size_bytes: file.size,
          });
        }
      } catch (err) {
        console.error('Failed to add file:', err);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadItems();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Film className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Content Library</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {items.length} item{items.length !== 1 ? 's' : ''} · Drag videos here to add
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {(['all', 'unposted', 'scheduled', 'published'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  filter === f
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,.mp4"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Media
          </button>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-2xl transition-all min-h-[200px]",
          isDragging && "ring-2 ring-purple-400 ring-offset-4"
        )}
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-purple-50/90 backdrop-blur-sm rounded-2xl border-2 border-dashed border-purple-300 flex flex-col items-center justify-center"
            >
              <Upload className="w-10 h-10 text-purple-400 mb-3" />
              <p className="text-sm font-black text-purple-600">Drop .mp4 files here</p>
              <p className="text-xs text-purple-400 mt-1">They'll be added to your library</p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-purple-300 hover:bg-purple-50/20 transition-all"
          >
            <Upload className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-black text-slate-400">
              {filter !== 'all' ? `No ${filter} content` : 'No content yet'}
            </p>
            <p className="text-xs text-slate-300 mt-1">Drag .mp4 files here or click to upload</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <LibraryCard
                key={item.id}
                item={item}
                onEdit={onEditItem}
              />
            ))}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 aspect-[9/16] hover:border-purple-300 hover:bg-purple-50/20 transition-all group"
            >
              <Plus className="w-8 h-8 text-slate-300 group-hover:text-purple-400 transition-colors" />
              <span className="text-[10px] font-black text-slate-300 group-hover:text-purple-400 mt-2 uppercase tracking-wider transition-colors">
                Add Media
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
