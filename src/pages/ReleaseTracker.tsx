import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Circle, 
  MoreVertical,
  Music,
  Loader2,
  RefreshCw,
  Edit2,
  Trash2,
  Youtube,
  Globe,
  Calendar,
  BarChart3,
  Layout,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  Filter,
  Star,
  Flame,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { Release, ReleaseStatus, ReleaseType } from '../types';
import { cn } from '../lib/utils';
import { useArtistData } from '../hooks/useArtistData';
import { useSoundCloud } from '../hooks/useSoundCloud';
import { useSpotify } from '../hooks/useSpotify';
import { ReleaseModal } from '../components/ReleaseModal';
import { ReleasePreviewModal } from '../components/ReleasePreviewModal';
import { LinkedContentModal } from '../components/LinkedContentModal';
import { ARTIST_INFO } from '../constants';
import { supabase } from '../lib/supabase';

  const statusColors: Record<ReleaseStatus, { bg: string, text: string, border: string, icon: any }> = {
  idea: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', icon: Circle },
  production: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: Loader2 },
  mastered: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: Star },
  ready: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  scheduled: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', icon: Calendar },
  released: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

const detectType = (title: string): ReleaseType => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('remix')) return 'Remix';
  if (lowerTitle.includes('mashup') || lowerTitle.includes('bootleg')) return 'Mashup';
  if (lowerTitle.includes('mix') && !lowerTitle.includes('remix')) return 'Mix';
  if (lowerTitle.includes('on track')) return 'On Track Episode';
  return 'Original';
};

export function ReleaseTracker() {
  const [filter, setFilter] = useState<ReleaseStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'streams'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLinkedContentModalOpen, setIsLinkedContentModalOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSpotifySyncing, setIsSpotifySyncing] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  const { data: releases, loading, error, addItem, updateItem, deleteItem } = useArtistData<Release>('releases');
  const { login: scLogin, token: scToken, fetchTracks: scFetchTracks } = useSoundCloud();
  const { login: spLogin, isAuthenticated: isSpAuthed, fetchTracks: spFetchTracks } = useSpotify();

  const processedReleases = (releases || []).map(r => {
    const raw = r as any;
    const assets = raw.assets || {};
    const performance = raw.performance || {};
    
    const detectedType = detectType(r.title);
    
    // Ensure we always have the full structure
    const base: Release = {
      ...r,
      type: raw.type || assets.type || detectedType,
      production: assets.production || raw.production || { bpm: 0, key: '' },
      assets: {
        cover_art_url: raw.cover_art_url || assets.cover_art_url || `https://picsum.photos/seed/${raw.title}/400/400`,
        teaser_clip_urls: assets.teaser_clip_urls || [],
        short_form_exports: assets.short_form_exports || [],
        waveform_video_url: assets.waveform_video_url || ''
      },
      distribution: assets.distribution || raw.distribution || {
        release_date: raw.release_date || assets.release_date || '',
        soundcloud_url: raw.soundcloud_url || assets.soundcloud_url || ''
      },
      marketing: assets.marketing || raw.marketing || { additional_content_url: '' },
      performance: {
        streams: performance.streams || { spotify: 0, apple: 0, soundcloud: 0, youtube: 0 },
        engagement: performance.engagement || { likes: 0, saves: 0, reposts: 0 },
        growth_rate: performance.growth_rate || 0,
        engagement_rate: performance.engagement_rate || 0
      }
    };

    return base;
  });

  const filteredReleases = processedReleases
    .filter(r => ['scheduled', 'released'].includes(r.status))
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => {
      if (typeFilter === 'all') return true;
      const detected = detectType(r.title);
      const actual = r.type || detected;
      return actual === typeFilter;
    })
    .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'streams') {
        const aStreams = (a.performance?.streams?.soundcloud || 0) + (a.performance?.streams?.spotify || 0);
        const bStreams = (b.performance?.streams?.soundcloud || 0) + (b.performance?.streams?.spotify || 0);
        return bStreams - aStreams;
      }
      // Default: date
      const aDate = a.distribution?.release_date || '0000-00-00';
      const bDate = b.distribution?.release_date || '0000-00-00';
      return bDate.localeCompare(aDate);
    });

  const handleAddRelease = () => {
    setSelectedRelease(null);
    setIsModalOpen(true);
  };

  const handlePreviewRelease = (release: Release) => {
    setSelectedRelease(release);
    setIsPreviewModalOpen(true);
  };

  const handleViewContentStrategy = (e: React.MouseEvent, release: Release) => {
    e.stopPropagation();
    setSelectedRelease(release);
    setIsLinkedContentModalOpen(true);
  };

  const handleEditRelease = (release: Release) => {
    setSelectedRelease(release);
    setIsPreviewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveRelease = async (formData: Partial<Release>) => {
    // Map the new Track model to the updated Supabase schema
    const supabaseData = {
      title: formData.title,
      status: formData.status,
      type: formData.type,
      is_public: formData.is_public || false,
      release_date: formData.distribution?.release_date || null,
      cover_art_url: formData.assets?.cover_art_url || null,
      stems_url: formData.production?.stems_url || null,
      soundcloud_url: formData.distribution?.soundcloud_url || null,
      production: formData.production || {},
      assets: formData.assets || {},
      distribution: formData.distribution || {},
      marketing: formData.marketing || {},
      performance: formData.performance || {
        streams: { spotify: 0, apple: 0, soundcloud: 0, youtube: 0 },
        engagement: { likes: 0, saves: 0, reposts: 0 },
        growth_rate: 0,
        engagement_rate: 0
      },
      rationale: formData.rationale || null
    };

    try {
      if (selectedRelease) {
        await updateItem(selectedRelease.id, supabaseData);
      } else {
        await addItem({
          ...supabaseData,
          created_at: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save track:', err);
      alert('Failed to save track: ' + err.message);
      throw err; // Re-throw so the modal doesn't close
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
          const exists = releases.some(r => r.title.toLowerCase() === track.title.toLowerCase());
          if (!exists) {
            await addItem({
              title: track.title,
              status: 'released',
              release_date: track.created_at ? track.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              soundcloud_url: track.permalink_url,
              assets: { 
                cover_art_url: track.artwork_url || `https://picsum.photos/seed/${track.title}/400/400`,
                teaser_clip_urls: [],
                short_form_exports: [],
                waveform_video_url: '',
                distribution: {
                  soundcloud_url: track.permalink_url,
                  release_date: track.created_at ? track.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
                }
              },
              performance: { 
                streams: { spotify: 0, apple: 0, soundcloud: track.playback_count || 0, youtube: 0 },
                engagement: { likes: track.favoritings_count || 0, saves: 0, reposts: track.reposts_count || 0 },
                growth_rate: 0,
                engagement_rate: 0
              }
            });
            addedCount++;
          }
        }
        alert(`Synced SoundCloud: Added ${addedCount} new tracks.`);
      } else {
        alert('No tracks found on your SoundCloud account.');
      }
    } catch (err) {
      console.error('Failed to sync SoundCloud:', err);
      alert('Failed to sync SoundCloud. Please try reconnecting.');
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
            const existing = releases.find(r => r.title.toLowerCase() === track.name.toLowerCase());
            
            const spotifyData = {
              track_id: track.id,
              audio_features: track.audio_features
            };

            if (existing) {
              // Update existing release with Spotify data
              await updateItem(existing.id, {
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
                // Update BPM/Key if available and not set
                production: {
                  ...existing.production,
                  bpm: existing.production?.bpm || Math.round(track.audio_features?.tempo || 0),
                  key: existing.production?.key || track.audio_features?.key?.toString()
                }
              });
              totalUpdated++;
            } else {
              // Create new release
              await addItem({
                title: track.name,
                status: 'released',
                release_date: track.album?.release_date,
                assets: { 
                  cover_art_url: track.album?.images?.[0]?.url || `https://picsum.photos/seed/${track.name}/400/400`,
                  teaser_clip_urls: [],
                  short_form_exports: [],
                  waveform_video_url: '',
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
                  engagement: { likes: 0, saves: 0, reposts: 0 },
                  growth_rate: 0,
                  engagement_rate: 0
                },
                spotify_data: spotifyData
              });
              totalAdded++;
            }
          }
        }
      }
      alert(`Synced Spotify: Added ${totalAdded} new releases and updated ${totalUpdated} existing ones across ${ARTIST_INFO.spotify_ids.length} profiles.`);
    } catch (err: any) {
      console.error('Failed to sync Spotify:', err);
      alert('Failed to sync Spotify: ' + err.message);
    } finally {
      setIsSpotifySyncing(false);
    }
  };

  const handleWipeData = async () => {
    setIsWiping(true);
    try {
      // Delete all releases for this user (or all if no user_id)
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from('releases').delete();
      
      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        // If no user, we might need a filter to delete all
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query;
      if (error) throw error;
      
      setNotification({ message: 'All data wiped successfully.', type: 'success' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error('Failed to wipe data:', err);
      setNotification({ message: 'Failed to wipe data: ' + err.message, type: 'error' });
    } finally {
      setIsWiping(false);
      setIsWipeConfirmOpen(false);
    }
  };

  const handleDisconnectSoundCloud = () => {
    localStorage.removeItem('sc_access_token');
    window.location.reload();
  };

  const handleDisconnectSpotify = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    window.location.reload();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-red-500 font-bold mb-4">Error loading releases</p>
        <p className="text-slate-500 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Global Notifications */}
      {notification && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-4 fade-in duration-300 flex items-center gap-3",
          notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
        )}>
          {notification.type === 'success' ? <Zap className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{notification.message}</p>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {isWipeConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Wipe All Data?</h3>
            <p className="text-slate-500 mb-8">This will permanently delete all tracks and releases from your library. This action cannot be undone.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsWipeConfirmOpen(false)}
                className="flex-1 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleWipeData}
                disabled={isWiping}
                className="flex-1 py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
              >
                {isWiping ? 'Wiping...' : 'Wipe Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Release Command Center</h2>
          <p className="text-slate-500 mt-2">Your central command for every release.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <button 
              onClick={() => setIsSyncMenuOpen(!isSyncMenuOpen)}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", (isSyncing || isSpotifySyncing) && "animate-spin")} />
              Sync / Integrations
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {isSyncMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Integrations</div>
                <div className="flex flex-col gap-1">
                  <button 
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-medium flex items-center justify-between transition-colors"
                    onClick={() => {
                      handleSyncSoundCloud();
                      setIsSyncMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Music className="w-4 h-4 text-orange-500" />
                      {scToken ? 'Sync SoundCloud' : 'Connect SoundCloud'}
                    </div>
                    {scToken && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnectSoundCloud();
                        }}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                        title="Disconnect"
                      >
                        <LogOut className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                  <button 
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-medium flex items-center justify-between transition-colors"
                    onClick={() => {
                      handleSyncSpotify();
                      setIsSyncMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      {isSpAuthed ? 'Sync Spotify' : 'Connect Spotify'}
                    </div>
                    {isSpAuthed && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnectSpotify();
                        }}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                        title="Disconnect"
                      >
                        <LogOut className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Danger Zone</div>
                <button 
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-rose-50 text-sm font-medium text-rose-600 flex items-center gap-3 transition-colors"
                  onClick={() => {
                    setIsWipeConfirmOpen(true);
                    setIsSyncMenuOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Wipe All Data
                </button>
              </div>
            )}
          </div>
          <button className="flex-1 sm:flex-none btn-primary shadow-lg shadow-blue-200" onClick={handleAddRelease}>
            <Plus className="w-4 h-4" />
            New Track
          </button>
        </div>
      </header>

      {/* Filter & Search Bar */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by title, BPM, or genre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto max-w-full no-scrollbar">
              {['all', 'scheduled', 'released'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    filter === s 
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group">
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-2xl pl-4 pr-10 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer hover:border-blue-200 transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="Original">Original</option>
                  <option value="Remix">Remix</option>
                  <option value="Mashup">Mashup</option>
                  <option value="Mix">Mix</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
              </div>

              <div className="relative group">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white border border-slate-200 rounded-2xl pl-4 pr-10 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer hover:border-blue-200 transition-all"
                >
                  <option value="date">Newest First</option>
                  <option value="streams">Most Played</option>
                  <option value="title">Alphabetical</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredReleases.map((release) => {
            const statusCfg = statusColors[release.status];
            const StatusIcon = statusCfg.icon;

            return (
              <div 
                key={release.id} 
                onClick={() => handlePreviewRelease(release)}
                className="group relative bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:border-blue-200 hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col h-full"
              >
                {/* Card Header/Cover */}
                <div className="relative aspect-square overflow-hidden">
                  {release.assets?.cover_art_url ? (
                    <img 
                      src={release.assets.cover_art_url} 
                      alt={release.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                      <Music className="w-16 h-16 text-slate-200" />
                    </div>
                  )}
                  
                  {/* Hover Actions - Top Right */}
                  <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-300 flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRelease(release);
                      }}
                      className="p-2 bg-white/90 hover:bg-white rounded-xl text-slate-900 hover:text-blue-600 transition-all shadow-lg backdrop-blur-sm scale-90 group-hover:scale-100"
                      title="Edit Track"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteConfirmId(release.id);
                      }}
                      className="p-2 bg-white/90 hover:bg-white rounded-xl text-slate-900 hover:text-rose-600 transition-all shadow-lg backdrop-blur-sm scale-90 group-hover:scale-100"
                      title="Delete Track"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {deleteConfirmId === release.id && (
                    <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
                      <Trash2 className="w-8 h-8 text-rose-500 mb-3" />
                      <p className="text-white font-bold mb-4">Delete this track?</p>
                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsDeleting(true);
                            try {
                              await deleteItem(release.id);
                              setNotification({ message: 'Track deleted successfully', type: 'success' });
                            } catch (err: any) {
                              setNotification({ message: 'Failed to delete: ' + err.message, type: 'error' });
                            } finally {
                              setIsDeleting(false);
                              setDeleteConfirmId(null);
                            }
                          }}
                          disabled={isDeleting}
                          className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <div className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border shadow-sm backdrop-blur-md",
                      statusCfg.bg, statusCfg.text, statusCfg.border
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      {release.status}
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-tight">
                        {release.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                        {release.type} • {release.distribution?.release_date ? new Date(release.distribution.release_date).getFullYear() : 'TBD'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 relative overflow-hidden">
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold mb-1">Plays</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">
                          {((release.performance?.streams?.soundcloud || 0) + (release.performance?.streams?.spotify || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold mb-1">Engagement</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">
                          {((release.performance?.engagement?.likes || 0) + (release.performance?.engagement?.reposts || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewRelease(release);
                        }}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-slate-200"
                      >
                        Open Track HQ
                      </button>
                      <button 
                        onClick={(e) => handleViewContentStrategy(e, release)}
                        className="px-4 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                        title="Promote"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Active</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {release.production?.bpm || '--'} BPM
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredReleases.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <Music className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No tracks found matching your filters.</p>
        </div>
      )}

      <ReleaseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRelease}
        onDelete={deleteItem}
        release={selectedRelease}
      />

      <ReleasePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onEdit={() => handleEditRelease(selectedRelease!)}
        release={selectedRelease}
      />

      <LinkedContentModal 
        isOpen={isLinkedContentModalOpen}
        onClose={() => setIsLinkedContentModalOpen(false)}
        release={selectedRelease}
      />
    </div>
  );
}
