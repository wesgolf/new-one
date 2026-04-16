import React, { useState, useEffect } from 'react';
import { GlobalSearch } from '../components/GlobalSearch';
import { QuickCapture } from '../components/QuickCapture';

import { 
  Zap,
  TrendingUp,
  Play,
  Globe,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Heart,
  Sparkles,
  Music,
  BarChart3,
  Users,
  X,
  Loader2,
  Copy,
  AlertTriangle,
  Search
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DailyGamePlan } from '../components/DailyGamePlan';
import { 
  selectFocusTrack, 
  generateSignals, 
  generateDailyTasks,
  generateContentIdeas 
} from '../engine/growth';
import { analyzeArtistState, AIAnalysisResult } from '../services/aiEngine';
import { supabase } from '../lib/supabase';
import { useSoundCloud } from '../hooks/useSoundCloud';
import { useSpotify } from '../hooks/useSpotify';
import { TrackFocusCard } from '../components/TrackFocusCard';
import { ContentEnginePanel } from '../components/ContentEnginePanel';
import { FanFunnel } from '../components/FanFunnel';
import GoalsTrackerComponent from '../components/GoalsTrackerComponent';
import { AlertsPanel } from '../components/AlertsPanel';
import { Toast, ToastType } from '../components/Toast';
import { GoalModal } from '../components/GoalModal';
import { zernioAdapter } from '../content/services/zernioAdapter';
import { ApiErrorBanner } from '../components/ApiErrorBanner';

export function CommandCenter() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isGeneratingHook, setIsGeneratingHook] = useState(false);
  const [showHookModal, setShowHookModal] = useState(false);
  const [generatedHook, setGeneratedHook] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalsKey, setGoalsKey] = useState(0);
  const { login, token } = useSoundCloud();
  const { isAuthenticated: isSpotifyAuth, login: loginSpotify, testSpotifyAlbum } = useSpotify();
  
  const [stats, setStats] = useState({
    streams: '0',
    listeners: '0',
    playlistAdds: '0',
    reach: '0'
  });
  const [upcoming, setUpcoming] = useState<{ label: string; date: string; title: string; type: string }[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [focusTrack, setFocusTrack] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [contentIdeas, setContentIdeas] = useState<{
    ideasReady: number;
    postsThisWeek: number;
    scheduledContent: number;
    nextPostDate: string;
  } | null>(null);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);

  const notify = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const [urgentActions, setUrgentActions] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [
        supabaseReleases,
        supabaseContent,
        supabaseShows,
        supabaseMeetings,
        supabaseTodos,
        supabaseGoals,
        supabaseOpportunities,
        zernioPosts,
        zernioAnalytics
      ] = await Promise.allSettled([
        supabase.from('releases').select('*').order('release_date', { ascending: true }),
        supabase.from('content_items').select('*').order('scheduled_date', { ascending: true }),
        supabase.from('shows').select('*').order('date', { ascending: true }),
        supabase.from('meetings').select('*').order('date', { ascending: true }),
        supabase.from('todos').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('opportunities').select('*'),
        zernioAdapter.fetchPosts().catch(() => []),
        zernioAdapter.fetchAnalytics().catch(() => [])
      ]);

      // Extract data safely from settled promises
      const releasesData = supabaseReleases.status === 'fulfilled' ? (supabaseReleases.value as any).data : [];
      const supabaseContentData = supabaseContent.status === 'fulfilled' ? (supabaseContent.value as any).data : [];
      const showsData = supabaseShows.status === 'fulfilled' ? (supabaseShows.value as any).data : [];
      const meetingsData = supabaseMeetings.status === 'fulfilled' ? (supabaseMeetings.value as any).data : [];
      const todosData = supabaseTodos.status === 'fulfilled' ? (supabaseTodos.value as any).data : [];
      const goalsData = supabaseGoals.status === 'fulfilled' ? (supabaseGoals.value as any).data : [];
      const opportunitiesData = supabaseOpportunities.status === 'fulfilled' ? (supabaseOpportunities.value as any).data : [];
      const zernioPostsData = zernioPosts.status === 'fulfilled' ? zernioPosts.value as any[] : [];
      const zernioAnalyticsData = zernioAnalytics.status === 'fulfilled' ? zernioAnalytics.value as any[] : [];

      const releases = (releasesData || []).map((r: any) => {
        if (r.assets && (r.assets.production || r.assets.distribution)) {
          return {
            ...r,
            production: r.assets.production || {},
            distribution: r.assets.distribution || {},
            marketing: r.assets.marketing || {},
            assets: { 
              cover_art_url: r.assets.cover_art_url,
              vertical_video_url: r.assets.vertical_video_url,
              teaser_clip_urls: r.assets.teaser_clip_urls,
              short_form_exports: r.assets.short_form_exports,
              waveform_video_url: r.assets.waveform_video_url
            }
          };
        }
        return r;
      });

      // Merge Supabase content with Zernio posts
      // We prioritize Zernio posts as they are "live" from the console
      const content = [
        ...(supabaseContentData || []),
        ...(zernioPostsData || []).filter(zp => !(supabaseContentData || []).some((sc: any) => sc.external_post_id === zp.id))
      ];

      const shows = showsData || [];
      const meetings = meetingsData || [];
      const todos = todosData || [];
      const goals = goalsData || [];

      setReleases(releases);
      setContent(content);

      // Growth Engine Logic (Heuristic Fallback)
      const currentFocus = selectFocusTrack(releases);
      setFocusTrack(currentFocus);

      const currentSignals = generateSignals(releases, content);
      setSignals(currentSignals);

      const currentTasks = generateDailyTasks(releases, content, todos, goals);
      setTasks(currentTasks);

      const now = new Date();
      const nextPost = (content || [])
        .filter(c => c.scheduled_date && new Date(c.scheduled_date) >= now)
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];

      setContentIdeas({
        ideasReady: (content || []).filter(c => c.status === 'idea').length,
        postsThisWeek: (content || []).filter(c => {
          if (!c.scheduled_date) return false;
          const d = new Date(c.scheduled_date);
          const weekEnd = new Date();
          weekEnd.setDate(now.getDate() + 7);
          return d >= now && d <= weekEnd;
        }).length,
        scheduledContent: (content || []).filter(c => c.status === 'scheduled').length,
        nextPostDate: nextPost ? new Date(nextPost.scheduled_date).toLocaleString() : 'No posts scheduled'
      });

      // Calculate stats
      const totalStreams = (releases || []).reduce((acc, r) => {
        const streams = Object.values(r.performance?.streams || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
        return acc + streams;
      }, 0);

      // Sum views from Zernio analytics
      const zernioViews = (zernioAnalyticsData || []).reduce((acc, a) => acc + (a.views || 0), 0);
      const supabaseViews = (content || []).reduce((acc, c) => acc + (c.metrics?.views || 0), 0);
      const totalViews = Math.max(zernioViews, supabaseViews);

      const totalProfileClicks = (content || []).reduce((acc, c) => acc + (c.metrics?.profile_clicks || 0), 0);
      const totalSaves = (releases || []).reduce((acc, r) => acc + (r.performance?.engagement?.saves || 0), 0);
      
      setStats({
        streams: totalStreams > 1000 ? `${(totalStreams / 1000).toFixed(1)}k` : totalStreams.toString(),
        listeners: (totalStreams * 0.4 > 1000) ? `${(totalStreams * 0.4 / 1000).toFixed(1)}k` : Math.floor(totalStreams * 0.4).toString(),
        playlistAdds: Math.floor(totalStreams * 0.05).toString(),
        reach: totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews.toString()
      });

      // Combine upcoming
      const todayStr = new Date().toISOString().split('T')[0];
      const combined: any[] = [
        ...(releases || []).filter(r => r.distribution?.release_date >= todayStr).map(r => ({ label: 'Next Release', date: r.distribution.release_date, title: r.title, type: 'release' })),
        ...(content || []).filter(c => c.scheduled_date?.split('T')[0] >= todayStr).map(c => ({ label: 'Next Post', date: c.scheduled_date?.split('T')[0], title: c.title, type: 'post' })),
        ...(shows || []).filter(s => s.date >= todayStr).map(s => ({ label: 'Next Show', date: s.date, title: s.venue, type: 'show' })),
        ...(meetings || []).filter(m => m.date >= todayStr).map(m => ({ label: 'Meeting', date: m.date, title: m.title, type: 'meeting' }))
      ].filter(item => item.date && !isNaN(new Date(item.date).getTime()))
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
       .slice(0, 3);

      setUpcoming(combined);

      // Calculate Urgent Actions
      const urgent: any[] = [];
      
      // Overdue Todos
      const overdueTodos = (todosData || []).filter((t: any) => !t.completed && t.due_date && new Date(t.due_date) < now);
      overdueTodos.forEach((t: any) => urgent.push({ type: 'todo', title: t.task, reason: 'Overdue', color: 'text-rose-600', bg: 'bg-rose-50' }));

      // Stale Contacts (no interaction in 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const staleContacts = (opportunitiesData || []).filter((o: any) => o.status !== 'closed' && (!o.last_contact || new Date(o.last_contact) < thirtyDaysAgo));
      staleContacts.slice(0, 2).forEach((o: any) => urgent.push({ type: 'contact', title: o.name, reason: 'Stale Relationship', color: 'text-amber-600', bg: 'bg-amber-50' }));

      // Off-track goals
      const offTrackGoals = (goalsData || []).filter((g: any) => g.status_indicator === 'off-track');
      offTrackGoals.forEach((g: any) => urgent.push({ type: 'goal', title: g.title, reason: 'Off Track', color: 'text-rose-600', bg: 'bg-rose-50' }));

      setUrgentActions(urgent);
    } catch (err) {
      setFetchError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGoalAdded = () => {
    setGoalsKey(prev => prev + 1);
    notify("Goal added successfully!", "success");
  };

  const runAIAnalysis = async () => {
    if (releases.length === 0) return;
    
    try {
      setIsAIAnalyzing(true);
      notify("AI Manager is analyzing your ecosystem...", "info");
      
      const { data: todos } = await supabase.from('todos').select('*');
      const { data: goals } = await supabase.from('goals').select('*');
      
      const result = await analyzeArtistState(releases, content, goals || [], todos || []);
      setAiAnalysis(result);
      
      // Update UI with AI results
      const aiFocus = releases.find(r => r.id === result.focusTrackId) || focusTrack;
      if (aiFocus) {
        setFocusTrack({ ...aiFocus, rationale: result.focusRationale });
      }
      
      setSignals(result.signals);
      setTasks(result.dailyTasks);
      
      notify("AI Strategy updated! Check your Daily Game Plan.", "success");
    } catch (err) {
      console.error('AI Analysis Error:', err);
      notify("AI Analysis failed. Using heuristic engine.", "error");
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const generateHook = () => {
    setIsGeneratingHook(true);
    setShowHookModal(true);
    setGeneratedHook(null);
    
    // Mock AI generation delay
    setTimeout(() => {
      const hooks = [
        "POV: You found the track that's going to be the anthem of Summer 2026 🌅 #NewMusic #Electronic",
        "Stop scrolling. This drop is the only thing you need to hear today. 🔊🔥 #DJLife #Producer",
        "If you like Fred again.. or Bicep, you're going to want to hear this one. 🎹✨ #MusicDiscovery",
        "The feeling of a 4 AM warehouse rave in 15 seconds. 🏭🖤 #Techno #RaveCulture"
      ];
      setGeneratedHook(hooks[Math.floor(Math.random() * hooks.length)]);
      setIsGeneratingHook(false);
    }, 2000);
  };

  return (
    <div className="space-y-10 pb-20 relative">
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <ApiErrorBanner error={fetchError} onRetry={fetchData} onDismiss={() => setFetchError(null)} />

      {!token && (
        <div 
          className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Music className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900">Connect your SoundCloud</p>
              <p className="text-xs text-orange-700">Sync your tracks and performance data directly from the SoundCloud API.</p>
            </div>
          </div>
          <button 
            onClick={login}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm"
          >
            Connect Now
          </button>
        </div>
      )}

      {/* Viral Hook Modal */}
      <AnimatePresence>
        {showHookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Viral Hook Generator</h3>
                </div>
                <button 
                  onClick={() => setShowHookModal(false)}
                  className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="min-h-[160px] flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6 text-center">
                {isGeneratingHook ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500 italic">Analyzing current trends and your track's DNA...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-lg font-medium text-slate-800 leading-relaxed">"{generatedHook}"</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedHook || "");
                        notify("Hook copied to clipboard!", "success");
                      }}
                      className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors mx-auto"
                    >
                      <Copy className="w-4 h-4" />
                      Copy to Clipboard
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowHookModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={generateHook}
                  disabled={isGeneratingHook}
                  className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Regenerate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Command Center</h2>
            <GlobalSearch />
          </div>
          <p className="text-slate-500 text-sm md:text-base">Your daily growth engine. Every section is an action.</p>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3">
          {!token && (
            <button 
              onClick={login}
              className="btn-secondary group border-orange-200 hover:border-orange-300 text-orange-600"
            >
              <Music className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
              Connect SoundCloud
            </button>
          )}
          {!isSpotifyAuth ? (
            <button 
              onClick={loginSpotify}
              className="btn-secondary group border-green-200 hover:border-green-300 text-green-600"
            >
              <Music className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
              Connect Spotify
            </button>
          ) : (
            <button 
              onClick={testSpotifyAlbum}
              className="btn-secondary group border-green-200 hover:border-green-300 text-green-600"
            >
              <Music className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
              Test Spotify API
            </button>
          )}
          <button 
            onClick={runAIAnalysis}
            disabled={isAIAnalyzing || loading}
            className={cn(
              "btn-primary group bg-indigo-600 hover:bg-indigo-500",
              isAIAnalyzing && "opacity-70 cursor-not-allowed"
            )}
          >
            {isAIAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            )}
            {isAIAnalyzing ? "Analyzing..." : "Run AI Strategy"}
          </button>
          <button 
            onClick={generateHook}
            className="btn-secondary group"
          >
            <Sparkles className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
            Generate Viral Hook
          </button>
          <button 
            onClick={() => notify("Pushing current track to all platforms...", "success")}
            className="btn-primary group"
          >
            <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Push Current Track
          </button>
          <button 
            onClick={() => notify("Analyzing last post performance...", "info")}
            className="btn-secondary group"
          >
            <BarChart3 className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
            Analyze Last Post
          </button>
        </div>
      </header>

      {/* Quick Stats - Growth Focused */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Streams', value: stats.streams, change: '0%', icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Monthly Listeners', value: stats.listeners, change: '0%', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Playlist Adds', value: stats.playlistAdds, change: '0%', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Global Reach', value: stats.reach, change: 'Views', icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4 md:p-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 md:gap-4 group hover:border-blue-200 transition-all">
            <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0", stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <p className="text-xl md:text-2xl font-bold text-slate-900">{stat.value}</p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit mx-auto sm:mx-0">{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Action Column */}
        <div className="lg:col-span-2 space-y-8">
          <DailyGamePlan 
            tasks={tasks} 
            isAI={!!aiAnalysis}
            onAction={(msg) => notify(msg, 'info')} 
          />
          <TrackFocusCard 
            track={focusTrack}
            onAction={(msg) => notify(msg, 'success')} 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ContentEnginePanel 
              data={contentIdeas}
              onAction={(msg) => notify(msg, 'info')} 
            />
            <GoalsTrackerComponent 
              key={goalsKey}
              onAction={(msg) => {
                if (msg === "Opening goal creation wizard...") {
                  setShowGoalModal(true);
                } else {
                  notify(msg, 'success');
                }
              }} 
            />
          </div>
        </div>

        {/* Insights & Alerts Column */}
        <div className="space-y-8">
          <QuickCapture onSuccess={() => fetchData()} />
          
          {urgentActions.length > 0 && (
            <section className="glass-card p-6 border-rose-100 bg-rose-50/30">
              <h3 className="text-sm font-bold mb-4 text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Urgent Actions
              </h3>
              <div className="space-y-3">
                {urgentActions.map((action, i) => (
                  <div key={i} className={cn("p-3 rounded-xl border flex items-center justify-between gap-3", action.bg, "border-white/50")}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{action.reason}</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{action.title}</p>
                    </div>
                    <button className={cn("p-1.5 rounded-lg bg-white shadow-sm hover:shadow-md transition-all", action.color)}>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <AlertsPanel 
            alerts={signals}
            onAction={(msg) => notify(msg, 'info')} 
          />
          <FanFunnel data={
            releases.length > 0 ? {
              views: (content || []).reduce((acc, c) => acc + (c.metrics?.views || 0), 0),
              profileClicks: (content || []).reduce((acc, c) => acc + (c.metrics?.profile_clicks || 0), 0),
              streams: (releases || []).reduce((acc, r) => {
                const streams = Object.values(r.performance?.streams || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
                return acc + streams;
              }, 0),
              saves: (releases || []).reduce((acc, r) => acc + (r.performance?.engagement?.saves || 0), 0),
            } : null
          } />
          
          <section className="glass-card p-6 bg-blue-600 text-white border-none shadow-lg shadow-blue-200 group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 fill-current" />
              <h3 className="font-bold">Next Milestone</h3>
            </div>
            <p className="text-sm text-blue-100 leading-relaxed mb-6">
              You're only <span className="text-white font-bold">15.5K listeners</span> away from your monthly goal. A new TikTok teaser could bridge the gap.
            </p>
            <NavLink 
              to="/content"
              className="w-full py-2 bg-white text-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
            >
              Plan Content
              <ArrowUpRight className="w-3 h-3" />
            </NavLink>
          </section>

          <section className="glass-card p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Upcoming
            </h3>
            <div className="space-y-4">
              {upcoming.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => notify(`Viewing details for: ${item.title}`, 'info')}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-all cursor-pointer"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.date}</p>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No upcoming events.</p>
              )}
              <NavLink to="/calendar" className="block text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors pt-2">
                View Calendar
              </NavLink>
            </div>
          </section>
        </div>
      </div>

      <GoalModal 
        isOpen={showGoalModal} 
        onClose={() => setShowGoalModal(false)} 
        onSuccess={handleGoalAdded} 
      />
    </div>
  );
}
