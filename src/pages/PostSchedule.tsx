import React, { useState } from 'react';
import { Video, Clock, Send, PlusCircle, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', icon: Video },
  { id: 'twitter', label: 'Twitter / X', icon: Twitter },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
];

const QUEUED: { platform: string; content: string; scheduledFor: string }[] = [];

export function PostSchedule() {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState('');

  const togglePlatform = (id: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Post & Schedule</h1>
        <p className="mt-1 text-sm text-text-muted">
          Draft Reels, cross-post to multiple platforms, and schedule your content via Zernio.
        </p>
      </div>

      {/* Composer */}
      <div
        className="rounded-2xl border border-border/60 p-6 space-y-5"
        style={{ background: 'var(--shell-panel)' }}
      >
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-brand" />
          <span className="text-sm font-semibold text-text-primary">New Post</span>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your caption or script here..."
          rows={4}
          className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand/40"
        />

        {/* Platform picker */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Platforms</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(({ id, label, icon: Icon }) => {
              const active = selectedPlatforms.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => togglePlatform(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-brand text-white border-brand'
                      : 'border-border/60 text-text-muted hover:text-text-primary hover:border-border'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule time */}
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            disabled={!content || selectedPlatforms.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Clock className="w-4 h-4" />
            {scheduleTime ? 'Schedule' : 'Publish Now'}
          </button>
          <button
            disabled={!content}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border/60 text-text-secondary hover:text-text-primary hover:border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* Queue */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Scheduled Queue</h2>
          <button className="flex items-center gap-1 text-xs text-brand font-medium hover:opacity-80 transition-opacity">
            <PlusCircle className="w-3.5 h-3.5" />
            Add slot
          </button>
        </div>

        {QUEUED.length === 0 ? (
          <div
            className="rounded-2xl border border-border/60 p-8 flex flex-col items-center justify-center gap-3 text-center"
            style={{ background: 'var(--shell-panel)' }}
          >
            <Send className="w-8 h-8 text-text-muted opacity-40" />
            <p className="text-sm text-text-muted">No posts scheduled yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {QUEUED.map((post, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 px-5 py-4 flex items-center gap-4"
                style={{ background: 'var(--shell-panel)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{post.content}</p>
                  <p className="text-xs text-text-muted mt-0.5">{post.platform} · {post.scheduledFor}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
