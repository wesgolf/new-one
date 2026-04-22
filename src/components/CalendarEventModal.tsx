import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Music, Video, MapPin, Clock, CheckSquare, Target, AlertCircle, Share2, Link as LinkIcon, Repeat, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { zernio } from '../lib/zernio';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialDate?: string;
  initialType?: EventType;
}

type EventType = 'release' | 'post' | 'show' | 'meeting' | 'todo' | 'goal';
type Priority = 'low' | 'medium' | 'high';

export function CalendarEventModal({ isOpen, onClose, onSave, initialDate, initialType }: CalendarEventModalProps) {
  const [type, setType] = useState<EventType>(initialType || 'meeting');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('12:00');
  const [platform, setPlatform] = useState('Instagram');
  const [contentType, setContentType] = useState('Reel');
  const [priority, setPriority] = useState<Priority>('medium');
  const [useZernio, setUseZernio] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [firstComment, setFirstComment] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [userTags, setUserTags] = useState('');
  const [tiktokPrivacy, setTiktokPrivacy] = useState<'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY'>('PUBLIC_TO_EVERYONE');
  const [tiktokAllowComment, setTiktokAllowComment] = useState(true);
  const [tiktokAllowDuet, setTiktokAllowDuet] = useState(true);
  const [tiktokAllowStitch, setTiktokAllowStitch] = useState(true);
  const [tiktokVideoMadeWithAI, setTiktokVideoMadeWithAI] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [linkedContentId, setLinkedContentId] = useState<string | null>(null);
  const [isFullDay, setIsFullDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialType) {
      setType(initialType);
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    if (type === 'release') {
      setIsFullDay(true);
    }
  }, [type]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let table = '';
      let data: any = { 
        priority,
        is_full_day: isFullDay,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null
      };
      
      // If using Zernio, call the mock API first
      if (type === 'post' && useZernio) {
        const zernioParams: any = {
          content: title,
          platforms: [{
            platform: platform.toLowerCase(),
            accountId: accountId || 'YOUR_ACCOUNT_ID'
          }],
          mediaItems: [{
            type: mediaType,
            url: mediaUrl || ''
          }],
          publishAt: `${date}T${time}:00Z`
        };

        // Platform specific data for Instagram
        if (platform.toLowerCase() === 'instagram') {
          const platformData: any = {};
          if (contentType.toLowerCase() === 'story') {
            platformData.contentType = 'story';
          } else if (contentType.toLowerCase() === 'reel' || contentType.toLowerCase() === 'reels') {
            platformData.contentType = 'reels';
            platformData.shareToFeed = true;
          }
          
          if (firstComment) {
            platformData.firstComment = firstComment;
          }
          
          if (collaborators) {
            platformData.collaborators = collaborators.split(',').map(c => c.trim()).filter(Boolean);
          }
          
          if (userTags) {
            // Format: username:x:y, username:x:y
            platformData.userTags = userTags.split(',').map(tag => {
              const parts = tag.trim().split(':');
              if (parts.length >= 3) {
                const [username, x, y] = parts;
                return { username, x: parseFloat(x), y: parseFloat(y) };
              }
              return null;
            }).filter(Boolean);
          }
          
          if (Object.keys(platformData).length > 0) {
            zernioParams.platforms[0].platformSpecificData = platformData;
          }
        }

        // Platform specific data for TikTok
        if (platform.toLowerCase() === 'tiktok') {
          zernioParams.tiktokSettings = {
            privacy_level: tiktokPrivacy,
            allow_comment: tiktokAllowComment,
            allow_duet: tiktokAllowDuet,
            allow_stitch: tiktokAllowStitch,
            video_made_with_ai: tiktokVideoMadeWithAI,
            content_preview_confirmed: true,
            express_consent_given: true
          };
          
          if (mediaType === 'image') {
            zernioParams.tiktokSettings.media_type = 'photo';
            zernioParams.tiktokSettings.description = title;
          }
        }

        const zernioResult = await zernio.schedule(zernioParams);
        
        data.zernio_id = zernioResult.zernioId;
        data.status = 'scheduled';
      }

      // Only add user_id if user is authenticated
      if (user) {
        data.user_id = user.id;
      }

      switch (type) {
        case 'release':
          table = 'releases';
          data = { ...data, title, release_date: date, release_time: isFullDay ? null : time, status: 'idea' };
          break;
        case 'post':
          table = 'content_items';
          data = { 
            ...data, 
            title, 
            scheduled_date: new Date(date).toISOString(), 
            scheduled_time: isFullDay ? null : time,
            platform, 
            type: contentType,
            status: 'idea' 
          };
          break;
        case 'show':
          table = 'shows';
          data = { ...data, venue: title, date, time: isFullDay ? null : time, status: 'upcoming' };
          break;
        case 'meeting':
          table = 'meetings';
          data = { ...data, title, date, time: isFullDay ? null : time };
          break;
        case 'todo':
          table = 'todos';
          data = { 
            ...data, 
            task: title, 
            due_date: date, 
            due_time: isFullDay ? null : time, 
            completed: false,
            linked_content_id: linkedContentId 
          };
          break;
        case 'goal':
          table = 'goals';
          data = { 
            ...data, 
            title, 
            deadline: date, 
            deadline_time: isFullDay ? null : time,
            target: 100, 
            unit: 'Units', 
            category: 'Streaming', 
            term: 'short',
            current: 0
          };
          break;
      }

      const { error: saveError } = await supabase.from(table).insert([data]);
      if (saveError) throw saveError;

      onSave();
      onClose();
      // Reset form
      setTitle('');
      setType('meeting');
      setPriority('medium');
    } catch (err: any) {
      console.error('Failed to save event:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Add Calendar Event
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-900">Failed to save</p>
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'meeting', icon: Clock, label: 'Meeting' },
                { id: 'release', icon: Music, label: 'Release' },
                { id: 'post', icon: Video, label: 'Post' },
                { id: 'show', icon: MapPin, label: 'Show' },
                { id: 'todo', icon: CheckSquare, label: 'Todo' },
                { id: 'goal', icon: Target, label: 'Goal' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as EventType)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                    type === item.id 
                      ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {type === 'show' ? 'Venue Name' : type === 'todo' ? 'Task Description' : 'Title'}
              </label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'show' ? 'e.g. The Blue Room' : 
                  type === 'todo' ? 'e.g. Finish mixing track' : 
                  type === 'goal' ? 'e.g. 10k Monthly Listeners' :
                  'e.g. Single Release'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              {!isFullDay && (
                <div className="space-y-1.5 animate-in fade-in zoom-in duration-200">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</label>
                  <input
                    required
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullDay(!isFullDay)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    isFullDay ? "bg-blue-600" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                    isFullDay ? "left-6" : "left-1"
                  )} />
                </button>
                <div className="flex items-center gap-1.5">
                  <Zap className={cn("w-3.5 h-3.5", isFullDay ? "text-blue-600" : "text-slate-400")} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Full Day</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    isRecurring ? "bg-indigo-600" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                    isRecurring ? "left-6" : "left-1"
                  )} />
                </button>
                <div className="flex items-center gap-1.5">
                  <Repeat className={cn("w-3.5 h-3.5", isRecurring ? "text-indigo-600" : "text-slate-400")} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recurring</span>
                </div>
              </div>
            </div>

            {isRecurring && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Frequency</label>
                    <select
                      value={recurrencePattern}
                      onChange={(e) => setRecurrencePattern(e.target.value as any)}
                      className="w-full bg-white border border-indigo-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Interval</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-indigo-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">
                        {recurrencePattern === 'daily' ? 'Days' : recurrencePattern === 'weekly' ? 'Weeks' : 'Months'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">End Date (Optional)</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="w-full bg-white border border-indigo-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>
            )}

            {type === 'post' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option>Instagram</option>
                      <option>TikTok</option>
                      <option>YouTube</option>
                      <option>Twitter</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</label>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option>Reel</option>
                      <option>TikTok</option>
                      <option>Story</option>
                      <option>Post</option>
                      <option>Shorts</option>
                    </select>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Share2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-900">Zernio API Scheduling</p>
                        <p className="text-[10px] text-blue-600">Auto-post to platforms via Zernio</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseZernio(!useZernio)}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        useZernio ? "bg-blue-600" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        useZernio ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>

                  {useZernio && (
                    <div className="space-y-3 pt-2 border-t border-blue-100 animate-in fade-in slide-in-from-top-1">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Media URL (Required for IG)</label>
                        <input
                          type="url"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="https://cdn.example.com/photo.jpg"
                          className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Media Type</label>
                          <select
                            value={mediaType}
                            onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                            className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          >
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Account ID</label>
                          <input
                            type="text"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="YOUR_ACCOUNT_ID"
                            className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>

                      {platform.toLowerCase() === 'instagram' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">First Comment</label>
                            <input
                              type="text"
                              value={firstComment}
                              onChange={(e) => setFirstComment(e.target.value)}
                              placeholder="Auto-posted first comment (e.g. link in bio)"
                              className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Collaborators</label>
                              <input
                                type="text"
                                value={collaborators}
                                onChange={(e) => setCollaborators(e.target.value)}
                                placeholder="user1, user2"
                                className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">User Tags</label>
                              <input
                                type="text"
                                value={userTags}
                                onChange={(e) => setUserTags(e.target.value)}
                                placeholder="user:0.5:0.5"
                                title="Format: username:x:y (coordinates 0.0 to 1.0)"
                                className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {platform.toLowerCase() === 'tiktok' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Privacy Level</label>
                              <select
                                value={tiktokPrivacy}
                                onChange={(e) => setTiktokPrivacy(e.target.value as any)}
                                className="w-full bg-white border border-blue-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                              >
                                <option value="PUBLIC_TO_EVERYONE">Public</option>
                                <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                                <option value="FOLLOWER_OF_CREATOR">Followers</option>
                                <option value="SELF_ONLY">Private</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                id="ai-disclosure"
                                checked={tiktokVideoMadeWithAI}
                                onChange={(e) => setTiktokVideoMadeWithAI(e.target.checked)}
                                className="rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="ai-disclosure" className="text-[9px] font-bold text-blue-400 uppercase tracking-widest cursor-pointer">AI Disclosure</label>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="allow-comment"
                                checked={tiktokAllowComment}
                                onChange={(e) => setTiktokAllowComment(e.target.checked)}
                                className="rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="allow-comment" className="text-[9px] font-bold text-blue-400 uppercase tracking-widest cursor-pointer">Comments</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="allow-duet"
                                checked={tiktokAllowDuet}
                                onChange={(e) => setTiktokAllowDuet(e.target.checked)}
                                className="rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="allow-duet" className="text-[9px] font-bold text-blue-400 uppercase tracking-widest cursor-pointer">Duet</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="allow-stitch"
                                checked={tiktokAllowStitch}
                                onChange={(e) => setTiktokAllowStitch(e.target.checked)}
                                className="rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="allow-stitch" className="text-[9px] font-bold text-blue-400 uppercase tracking-widest cursor-pointer">Stitch</label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {type === 'todo' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link to Content (Optional)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={linkedContentId || ''}
                    onChange={(e) => setLinkedContentId(e.target.value || null)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                  >
                    <option value="">No linked content</option>
                    <option value="mock-1">Upcoming Reel: Summer Vibes</option>
                    <option value="mock-2">TikTok: Behind the Scenes</option>
                    <option value="mock-3">YouTube Shorts: Live Teaser</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
