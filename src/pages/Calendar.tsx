import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  Video,
  Smartphone,
  Music,
  MoreVertical,
  Loader2,
  CheckSquare,
  Target,
  Share2,
  Filter,
  X,
  Zap,
  Repeat
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { CalendarEventModal } from '../components/CalendarEventModal';
import { CalendarEventDetailModal } from '../components/CalendarEventDetailModal';
import { Release } from '../types';
import { useSoundCloud } from '../hooks/useSoundCloud';
import { useSpotify } from '../hooks/useSpotify';
import { ARTIST_INFO } from '../constants';

interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'post' | 'release' | 'show' | 'meeting' | 'todo' | 'goal';
  platform?: string;
  priority?: 'low' | 'medium' | 'high';
  zernioId?: string;
  releaseId?: string;
  status?: string;
  notes?: string;
  venue?: string;
  task?: string;
  category?: string;
  target?: number;
  current?: number;
  unit?: string;
  isFullDay?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

export function Calendar() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalType, setModalType] = useState<'release' | 'post' | 'show' | 'meeting' | 'todo' | 'goal' | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSpotifySyncing, setIsSpotifySyncing] = useState(false);
  const { login: scLogin, token: scToken, fetchTracks: scFetchTracks } = useSoundCloud();
  const { login: spLogin, isAuthenticated: isSpAuthed, fetchTracks: spFetchTracks } = useSpotify();

  const expandRecurringEvents = (rawEvents: Event[]): Event[] => {
    const expanded: Event[] = [];
    const now = new Date();
    const endRange = new Date();
    endRange.setFullYear(now.getFullYear() + 1); // Expand up to 1 year ahead

    rawEvents.forEach(event => {
      if (!event.isRecurring || !event.recurrencePattern) {
        expanded.push(event);
        return;
      }

      // Parse the initial date carefully to avoid timezone shifts
      const [year, month, day] = event.date.split('-').map(Number);
      let current = new Date(year, month - 1, day);
      
      const end = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : endRange;
      const interval = event.recurrenceInterval || 1;

      let count = 0;
      while (current <= end && count < 365) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        
        expanded.push({
          ...event,
          id: count === 0 ? event.id : `${event.id}-${count}`,
          date: dateStr,
        });

        if (event.recurrencePattern === 'daily') {
          current.setDate(current.getDate() + interval);
        } else if (event.recurrencePattern === 'weekly') {
          current.setDate(current.getDate() + (7 * interval));
        } else if (event.recurrencePattern === 'monthly') {
          current.setMonth(current.getMonth() + interval);
        } else {
          break;
        }
        count++;
      }
    });

    return expanded;
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from all tables
      const [
        releasesRes,
        contentRes,
        showsRes,
        meetingsRes,
        todosRes,
        goalsRes
      ] = await Promise.all([
        supabase.from('releases').select('*'),
        supabase.from('content_items').select('*'),
        supabase.from('shows').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('todos').select('*'),
        supabase.from('goals').select('*')
      ]);

      if (releasesRes.error) throw releasesRes.error;
      if (contentRes.error) throw contentRes.error;
      if (showsRes.error) throw showsRes.error;
      if (meetingsRes.error) throw meetingsRes.error;
      if (todosRes.error) throw todosRes.error;
      if (goalsRes.error) throw goalsRes.error;

      const releases = releasesRes.data;
      const content = contentRes.data;
      const shows = showsRes.data;
      const meetings = meetingsRes.data;
      const todos = todosRes.data;
      const goals = goalsRes.data;

      const rawEvents: Event[] = [
        ...(releases || []).map(r => ({
          id: r.id,
          title: r.title,
          date: r.release_date,
          time: r.release_time,
          type: 'release' as const,
          platform: r.soundcloud_url ? 'SoundCloud' : undefined,
          priority: r.priority,
          releaseId: r.id,
          status: r.status,
          notes: r.notes,
          isFullDay: r.is_full_day
        })),
        ...(content || []).map(c => ({
          id: c.id,
          title: c.title,
          date: c.scheduled_date?.split('T')[0],
          time: c.scheduled_time,
          type: 'post' as const,
          platform: c.platform,
          priority: c.priority,
          zernioId: c.zernio_id,
          releaseId: c.linked_release_id,
          status: c.status,
          notes: c.caption,
          isFullDay: c.is_full_day,
          isRecurring: c.is_recurring,
          recurrencePattern: c.recurrence_pattern,
          recurrenceInterval: c.recurrence_interval,
          recurrenceEndDate: c.recurrence_end_date
        })),
        ...(shows || []).map(s => ({
          id: s.id,
          title: s.venue,
          date: s.date,
          time: s.time,
          type: 'show' as const,
          priority: s.priority,
          status: s.status,
          venue: s.venue,
          isFullDay: s.is_full_day
        })),
        ...(meetings || []).map(m => ({
          id: m.id,
          title: m.title,
          date: m.date,
          time: m.time,
          type: 'meeting' as const,
          priority: m.priority,
          notes: m.notes,
          isFullDay: m.is_full_day,
          isRecurring: m.is_recurring,
          recurrencePattern: m.recurrence_pattern,
          recurrenceInterval: m.recurrence_interval,
          recurrenceEndDate: m.recurrence_end_date
        })),
        ...(todos || []).map(t => ({
          id: t.id,
          title: t.task,
          date: t.due_date,
          time: t.due_time,
          type: 'todo' as const,
          priority: t.priority,
          status: t.completed ? 'completed' : 'pending',
          task: t.task,
          isFullDay: t.is_full_day,
          isRecurring: t.is_recurring,
          recurrencePattern: t.recurrence_pattern,
          recurrenceInterval: t.recurrence_interval,
          recurrenceEndDate: t.recurrence_end_date
        })),
        ...(goals || []).map(g => ({
          id: g.id,
          title: g.title,
          date: g.deadline,
          time: g.deadline_time,
          type: 'goal' as const,
          priority: g.priority,
          category: g.category,
          target: g.target,
          current: g.current,
          unit: g.unit,
          isRecurring: g.is_recurring,
          recurrencePattern: g.recurrence_pattern,
          recurrenceInterval: g.recurrence_interval,
          recurrenceEndDate: g.recurrence_end_date
        }))
      ].filter(e => e.date);

      const allEvents = expandRecurringEvents(rawEvents);
      setEvents(allEvents);
      setReleases(releases || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const nextMonth = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (view === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
      setCurrentDate(nextDay);
    }
  };

  const prevMonth = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (view === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevDay = new Date(currentDate);
      prevDay.setDate(currentDate.getDate() - 1);
      setCurrentDate(prevDay);
    }
  };

  const handleDragStart = (e: React.DragEvent, event: Event) => {
    setDraggedEvent(event);
    e.dataTransfer.setData('eventId', event.id);
    e.dataTransfer.setData('eventType', event.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const eventId = draggedEvent.id;
    const eventType = draggedEvent.type;

    try {
      let table = '';
      let dateField = 'date';

      switch (eventType) {
        case 'release': table = 'releases'; dateField = 'release_date'; break;
        case 'post': table = 'content_items'; dateField = 'scheduled_date'; break;
        case 'show': table = 'shows'; break;
        case 'meeting': table = 'meetings'; break;
        case 'todo': table = 'todos'; dateField = 'due_date'; break;
        case 'goal': table = 'goals'; dateField = 'deadline'; break;
      }

      const updateData = { [dateField]: targetDate };
      const { error } = await supabase.from(table).update(updateData).eq('id', eventId);
      
      if (error) throw error;
      
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to move event:', err);
      alert('Failed to move event: ' + err.message);
    } finally {
      setDraggedEvent(null);
    }
  };

  const handleSyncSoundCloud = async () => {
    if (!scToken) {
      scLogin();
      return;
    }

    setIsSyncing(true);
    try {
      const tracks = await scFetchTracks();
      if (tracks && tracks.length > 0) {
        let addedCount = 0;
        for (const track of tracks) {
          // Check if release already exists by title
          const { data: existing } = await supabase
            .from('releases')
            .select('id')
            .eq('title', track.title)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from('releases').insert([{
              title: track.title,
              status: 'released',
              release_date: track.created_at ? track.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              soundcloud_url: track.permalink_url,
              assets: { 
                cover_art_url: track.artwork_url || `https://picsum.photos/seed/${track.title}/400/400`,
                distribution: {
                  soundcloud_url: track.permalink_url,
                  release_date: track.created_at ? track.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
                }
              },
              performance: { 
                streams: { spotify: 0, apple: 0, soundcloud: track.playback_count || 0, youtube: 0 },
                engagement: { likes: track.favoritings_count || 0, saves: 0, reposts: track.reposts_count || 0 }
              }
            }]);
            if (!error) addedCount++;
          }
        }
        await fetchEvents();
        alert(`Synced SoundCloud: Added ${addedCount} new releases to your calendar.`);
      }
    } catch (err) {
      console.error('Failed to sync SoundCloud:', err);
      alert('Failed to sync SoundCloud. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSpotify = async () => {
    if (isSpAuthed === null) {
      alert('Spotify authentication is still loading. Please wait a moment.');
      return;
    }

    if (!isSpAuthed) {
      spLogin();
      return;
    }

    if (!ARTIST_INFO.spotify_ids || ARTIST_INFO.spotify_ids.length === 0) {
      alert('Spotify Artist IDs not configured in constants.ts');
      return;
    }

    setIsSpotifySyncing(true);
    try {
      let totalAdded = 0;
      let totalUpdated = 0;

      for (const spotifyId of ARTIST_INFO.spotify_ids) {
        const tracks = await spFetchTracks(spotifyId.trim());
        if (tracks && tracks.length > 0) {
          for (const track of tracks) {
            // Check if release already exists by title
            const { data: existing } = await supabase
              .from('releases')
              .select('id, distribution, performance, production')
              .eq('title', track.name)
              .maybeSingle();

            const spotifyData = {
              track_id: track.id,
              audio_features: track.audio_features
            };

            if (!existing) {
              const { error } = await supabase.from('releases').insert([{
                title: track.name,
                status: 'released',
                release_date: track.album?.release_date,
                assets: { 
                  cover_art_url: track.album?.images?.[0]?.url || `https://picsum.photos/seed/${track.name}/400/400`,
                  distribution: {
                    release_date: track.album?.release_date,
                    spotify_url: track.external_urls?.spotify
                  }
                },
                production: {
                  bpm: Math.round(track.audio_features?.tempo || 0),
                  key: track.audio_features?.key?.toString()
                },
                performance: { 
                  streams: { spotify: track.popularity || 0, apple: 0, soundcloud: 0, youtube: 0 },
                  engagement: { likes: 0, saves: 0, reposts: 0 }
                },
                spotify_data: spotifyData
              }]);
              if (!error) totalAdded++;
            } else {
              // Update existing release with Spotify data
              await supabase.from('releases').update({
                distribution: {
                  ...existing.distribution,
                  spotify_url: track.external_urls?.spotify
                },
                performance: {
                  ...existing.performance,
                  streams: {
                    ...existing.performance?.streams,
                    spotify: track.popularity || 0
                  }
                },
                spotify_data: spotifyData,
                production: {
                  ...existing.production,
                  bpm: existing.production?.bpm || Math.round(track.audio_features?.tempo || 0),
                  key: existing.production?.key || track.audio_features?.key?.toString()
                }
              }).eq('id', existing.id);
              totalUpdated++;
            }
          }
        }
      }
      await fetchEvents();
      alert(`Synced Spotify: Added ${totalAdded} new releases and updated ${totalUpdated} existing ones across ${ARTIST_INFO.spotify_ids.length} profiles.`);
    } catch (err: any) {
      console.error('Failed to sync Spotify:', err);
      alert('Failed to sync Spotify: ' + err.message);
    } finally {
      setIsSpotifySyncing(false);
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const filteredEvents = selectedTrackId === 'all'
    ? events
    : events.filter(e => e.releaseId === selectedTrackId);

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const handleAddEvent = (day?: number, type?: 'release' | 'post' | 'show' | 'meeting' | 'todo' | 'goal') => {
    if (day) {
      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDate(dateStr);
    }
    setModalType(type);
    setIsModalOpen(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-red-500 font-bold mb-4">Error loading calendar</p>
        <p className="text-slate-500 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="text-center lg:text-left">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">{monthName} {year}</h2>
          <p className="text-slate-500 mt-2">Manage your releases, content, and career schedule.</p>
        </div>
        <div className="flex flex-wrap justify-center lg:justify-end items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select 
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                className="bg-transparent text-[10px] md:text-xs font-bold text-slate-600 focus:outline-none cursor-pointer max-w-[100px] md:max-w-none"
              >
                <option value="all">All Tracks</option>
                {releases.map(release => (
                  <option key={release.id} value={release.id}>{release.title}</option>
                ))}
              </select>
            </div>
            {selectedTrackId !== 'all' && (
              <button 
                onClick={() => setSelectedTrackId('all')}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button 
            onClick={() => {
              setCurrentDate(new Date());
              const d = new Date();
              setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
            }}
            className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Today
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all uppercase tracking-widest",
                  view === v ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button 
            onClick={handleSyncSoundCloud}
            disabled={isSyncing || isSpotifySyncing}
            className="px-3 md:px-4 py-2 bg-orange-50 border border-orange-100 rounded-xl text-[10px] md:text-xs font-bold text-orange-600 hover:bg-orange-100 transition-all flex items-center gap-2"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
            {scToken ? 'SC Sync' : 'SC Connect'}
          </button>
          <button 
            onClick={handleSyncSpotify}
            disabled={isSpotifySyncing || isSyncing}
            className="px-3 md:px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] md:text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-2"
          >
            {isSpotifySyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
            {isSpAuthed ? 'Spotify Sync' : 'Spotify Connect'}
          </button>
          <button className="btn-primary py-2 px-3 md:px-4 text-[10px] md:text-xs" onClick={() => handleAddEvent()}>
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 glass-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">
                {view === 'month' ? `${monthName} ${year}` : 
                 view === 'week' ? `Week of ${getWeekDays()[0].toLocaleDateString()}` :
                 currentDate.toLocaleDateString()}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all border border-slate-200"
                >
                  Today
                </button>
                <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {padding.map((_, i) => (
                    <div key={`pad-${i}`} className="h-32 border-b border-r border-slate-50 bg-slate-50/30" />
                  ))}
                  {days.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                    
                    return (
                      <div 
                        key={day} 
                        onClick={() => setSelectedDate(dateStr)}
                        onDoubleClick={() => handleAddEvent(day)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dateStr)}
                        className={cn(
                          "h-32 border-b border-r border-slate-50 p-2 transition-colors group relative cursor-pointer",
                          selectedDate === dateStr ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                        )}
                      >
                        <span className={cn(
                          "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                          isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 group-hover:text-slate-900"
                        )}>
                          {day}
                        </span>
                        <div className="mt-2 space-y-1">
                          {dayEvents.map(event => (
                            <div 
                              key={event.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, event)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setIsDetailModalOpen(true);
                              }}
                              className={cn(
                                "text-[10px] p-1 rounded-md font-bold truncate border flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] hover:shadow-sm",
                                (event.type === 'release' || event.isFullDay) && !event.platform?.includes('SoundCloud') && "bg-blue-600 text-white border-blue-700 shadow-md py-1.5 px-2 -mx-1",
                                (event.type === 'release' || event.isFullDay) && event.platform?.includes('SoundCloud') && "bg-orange-600 text-white border-orange-700 shadow-md py-1.5 px-2 -mx-1",
                                !event.isFullDay && event.type === 'post' && "bg-purple-50 text-purple-600 border-purple-100",
                                !event.isFullDay && event.type === 'show' && "bg-rose-50 text-rose-600 border-rose-100",
                                !event.isFullDay && event.type === 'meeting' && "bg-slate-100 text-slate-600 border-slate-200",
                                !event.isFullDay && event.type === 'todo' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                                !event.isFullDay && event.type === 'goal' && "bg-amber-50 text-amber-600 border-amber-100"
                              )}
                            >
                              {event.type === 'release' || event.isFullDay ? (
                                <div className="flex items-center gap-2 w-full">
                                  {event.type === 'release' ? <Music className="w-3 h-3 shrink-0" /> : <Zap className="w-3 h-3 shrink-0" />}
                                  <span className="truncate uppercase tracking-wider">{event.type === 'release' ? 'RELEASE' : event.type}: {event.title}</span>
                                  {event.isRecurring && <Repeat className="w-2.5 h-2.5 ml-auto shrink-0 opacity-70" />}
                                </div>
                              ) : (
                                <>
                                  {event.priority === 'high' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />}
                                  {event.priority === 'medium' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />}
                                  <span className="truncate">{event.title}</span>
                                  {event.isRecurring && <Repeat className="w-2.5 h-2.5 ml-auto shrink-0 text-slate-400" />}
                                  {event.zernioId && <Share2 className="w-2 h-2 text-purple-500 ml-auto shrink-0" />}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-4 h-4 text-blue-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'week' && (
              <div className="grid grid-cols-7 min-h-[400px]">
                {getWeekDays().map((date, i) => {
                  const dayEvents = getEventsForDate(date);
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedDate(dateStr)}
                      onDoubleClick={() => handleAddEvent(undefined, undefined)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateStr)}
                      className={cn(
                        "border-r border-slate-100 p-4 transition-colors group cursor-pointer",
                        selectedDate === dateStr ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                      )}
                    >
                      <div className="text-center mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          {date.toLocaleDateString('default', { weekday: 'short' })}
                        </p>
                        <span className={cn(
                          "text-lg font-bold w-10 h-10 flex items-center justify-center rounded-full mx-auto transition-colors",
                          isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-900 group-hover:text-blue-600"
                        )}>
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setIsDetailModalOpen(true);
                            }}
                            className={cn(
                              "text-[10px] p-2 rounded-xl font-bold border flex flex-col gap-1 cursor-grab active:cursor-grabbing shadow-sm transition-all hover:scale-[1.02] hover:shadow-md",
                              (event.type === 'release' || event.isFullDay) && !event.platform?.includes('SoundCloud') && "bg-blue-600 text-white border-blue-700 p-3 -mx-1",
                              (event.type === 'release' || event.isFullDay) && event.platform?.includes('SoundCloud') && "bg-orange-600 text-white border-orange-700 p-3 -mx-1",
                              !event.isFullDay && event.type === 'post' && "bg-purple-50 text-purple-600 border-purple-100",
                              !event.isFullDay && event.type === 'show' && "bg-rose-50 text-rose-600 border-rose-100",
                              !event.isFullDay && event.type === 'meeting' && "bg-slate-100 text-slate-600 border-slate-200",
                              !event.isFullDay && event.type === 'todo' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                              !event.isFullDay && event.type === 'goal' && "bg-amber-50 text-amber-600 border-amber-100"
                            )}
                          >
                            {event.type === 'release' || event.isFullDay ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  {event.type === 'release' ? <Music className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                  <span className="text-xs uppercase tracking-widest">{event.type === 'release' ? 'RELEASE DAY' : `${event.type.toUpperCase()} DAY`}</span>
                                  {event.isRecurring && <Repeat className="w-3.5 h-3.5 ml-auto opacity-70" />}
                                </div>
                                <p className="text-sm leading-tight">{event.title}</p>
                                {event.time && !event.isFullDay && <p className="text-[10px] opacity-80">{event.time}</p>}
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1">
                                  {event.priority === 'high' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                                  <span className="truncate">{event.title}</span>
                                  {event.isRecurring && <Repeat className="w-2.5 h-2.5 ml-auto text-slate-400" />}
                                  {event.zernioId && <Share2 className="w-2 h-2 text-purple-500 ml-auto shrink-0" />}
                                </div>
                                {event.platform && <span className="text-[8px] opacity-60 uppercase">{event.platform}</span>}
                                {event.time && <span className="text-[8px] opacity-60">{event.time}</span>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {view === 'day' && (
              <div className="p-8 min-h-[400px]">
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-5xl font-black text-slate-900">{currentDate.getDate()}</span>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{currentDate.toLocaleDateString('default', { weekday: 'long' })}</p>
                    <p className="text-slate-500">{monthName} {year}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {getEventsForDate(currentDate)
                    .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))
                    .map(event => (
                    <div 
                      key={event.id} 
                      className={cn(
                        "p-4 rounded-2xl border flex items-center justify-between group",
                        event.type === 'release' && "bg-blue-50 border-blue-100",
                        event.type === 'post' && "bg-purple-50 border-purple-100",
                        event.type === 'show' && "bg-rose-50 border-rose-100",
                        event.type === 'meeting' && "bg-slate-50 border-slate-200",
                        event.type === 'todo' && "bg-emerald-50 border-emerald-100",
                        event.type === 'goal' && "bg-amber-50 border-amber-100"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-bold text-slate-400 w-12 text-right">
                          {event.time || '--:--'}
                        </div>
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                          event.type === 'release' && !event.platform?.includes('SoundCloud') && "bg-blue-600 text-white",
                          event.type === 'release' && event.platform?.includes('SoundCloud') && "bg-orange-600 text-white",
                          event.type === 'post' && "bg-purple-600 text-white",
                          event.type === 'show' && "bg-rose-600 text-white",
                          event.type === 'meeting' && "bg-slate-600 text-white",
                          event.type === 'todo' && "bg-emerald-600 text-white",
                          event.type === 'goal' && "bg-amber-600 text-white"
                        )}>
                          {event.type === 'release' && <Music className="w-6 h-6" />}
                          {event.type === 'post' && <Video className="w-6 h-6" />}
                          {event.type === 'show' && <CalendarIcon className="w-6 h-6" />}
                          {event.type === 'meeting' && <Clock className="w-6 h-6" />}
                          {event.type === 'todo' && <CheckSquare className="w-6 h-6" />}
                          {event.type === 'goal' && <Target className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{event.title}</p>
                            {event.zernioId && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded uppercase tracking-widest">
                                <Share2 className="w-2 h-2" />
                                Zernio
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                            {event.type} {event.platform ? `• ${event.platform}` : ''}
                          </p>
                        </div>
                      </div>
                      {event.priority === 'high' && (
                        <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black uppercase rounded-full">High Priority</span>
                      )}
                    </div>
                  ))}
                  {getEventsForDate(currentDate).length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No events scheduled for today</p>
                      <button 
                        onClick={() => {
                          const d = currentDate;
                          setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                          setIsModalOpen(true);
                        }}
                        className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                      >
                        Add something
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <section className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                  Daily To-Do
                </h3>
                <button 
                  onClick={() => handleAddEvent(undefined, 'todo')}
                  className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {filteredEvents
                  .filter(e => e.type === 'todo' && e.date === selectedDate)
                  .map(todo => (
                    <div 
                      key={todo.id} 
                      onClick={() => {
                        setSelectedEvent(todo);
                        setIsDetailModalOpen(true);
                      }}
                      className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 group hover:border-emerald-100 transition-all cursor-pointer"
                    >
                      <button className="mt-0.5 w-5 h-5 rounded-md border-2 border-slate-200 flex items-center justify-center hover:border-emerald-500 transition-colors">
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 opacity-0 group-hover:opacity-20" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{todo.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                            todo.priority === 'high' ? "bg-red-100 text-red-600" :
                            todo.priority === 'medium' ? "bg-amber-100 text-amber-600" :
                            "bg-slate-100 text-slate-500"
                          )}>
                            {todo.priority || 'medium'}
                          </span>
                          {todo.time && <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{todo.time}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredEvents.filter(e => e.type === 'todo' && e.date === selectedDate).length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No tasks for this day</p>
                  </div>
                )}
              </div>
            </section>

            <section className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
                <Clock className="w-5 h-5 text-blue-500" />
                Upcoming
              </h3>
              <div className="space-y-4">
                {filteredEvents
                  .filter(e => new Date(e.date) >= new Date())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 6)
                  .map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 hover:bg-white transition-all group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                      event.type === 'release' && "bg-blue-100 text-blue-600",
                      event.type === 'post' && "bg-purple-100 text-purple-600",
                      event.type === 'show' && "bg-rose-100 text-rose-600",
                      event.type === 'meeting' && "bg-slate-200 text-slate-600",
                      event.type === 'todo' && "bg-emerald-100 text-emerald-600",
                      event.type === 'goal' && "bg-amber-100 text-amber-600"
                    )}>
                      {event.type === 'release' && <Music className="w-5 h-5" />}
                      {event.type === 'post' && <Video className="w-5 h-5" />}
                      {event.type === 'show' && <CalendarIcon className="w-5 h-5" />}
                      {event.type === 'meeting' && <Clock className="w-5 h-5" />}
                      {event.type === 'todo' && <CheckSquare className="w-5 h-5" />}
                      {event.type === 'goal' && <Target className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 truncate">{event.title}</p>
                        {event.priority === 'high' && (
                          <span className="px-1 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase rounded leading-none">High</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{event.date}</p>
                    </div>
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No upcoming events.</p>
                )}
              </div>
            </section>

            <section className="glass-card p-6 bg-blue-50 border-blue-100">
              <h3 className="text-lg font-bold mb-2 text-slate-900">Posting Schedule</h3>
              <p className="text-xs text-slate-500 mb-4">Optimized based on your audience engagement.</p>
              <div className="space-y-3">
                {[
                  { day: 'Mon', time: '7:00 PM', platform: 'Instagram' },
                  { day: 'Wed', time: '6:00 PM', platform: 'TikTok' },
                  { day: 'Fri', time: '8:00 PM', platform: 'YouTube' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                    <span className="text-xs font-bold text-slate-700">{item.day}</span>
                    <span className="text-xs font-medium text-slate-500">{item.time}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{item.platform}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
      <CalendarEventModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalType(undefined);
        }}
        onSave={fetchEvents}
        initialDate={selectedDate}
        initialType={modalType}
      />

      {selectedEvent && (
        <CalendarEventDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onDelete={fetchEvents}
          onUpdate={fetchEvents}
        />
      )}
    </div>
  );
}
