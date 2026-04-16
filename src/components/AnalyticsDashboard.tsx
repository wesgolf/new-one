import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Globe, Music, TrendingUp, AlertCircle, RefreshCw, LogIn, Share2, Heart, Play } from 'lucide-react';
import { spotifyFetch, redirectToSpotifyAuth, getSpotifyToken } from '../lib/spotify';
import { useSoundCloud } from '../hooks/useSoundCloud';
import { useArtistData } from '../hooks/useArtistData';
import { Release } from '../types';
import { ARTIST_INFO } from '../constants';
import { cn } from '../lib/utils';

interface Metric {
  platform: string;
  total_plays: number;
  followers: number;
  total_likes: number;
  date: string;
}

const COLORS = ['#ff5500', '#1DB954', '#000000', '#FF0000'];

export const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [spotifyData, setSpotifyData] = useState<any>(null);
  const [soundcloudMe, setSoundcloudMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpotifyAuthed, setIsSpotifyAuthed] = useState(false);

  const { token: scToken, login: scLogin, fetchMe: scFetchMe } = useSoundCloud();
  const { data: releases, loading: releasesLoading } = useArtistData<Release>('releases');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/latest');
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        // Analytics backend unavailable (static deploy) — proceed without server metrics
        setLoading(false);
        return;
      }
      const data = await response.json();
      setMetrics(data);

      // Fetch Spotify data if authed
      const token = await getSpotifyToken();
      if (token) {
        setIsSpotifyAuthed(true);
        if (ARTIST_INFO.spotify_ids && ARTIST_INFO.spotify_ids.length > 0) {
          const artistsData = await Promise.all(
            ARTIST_INFO.spotify_ids.map(id => spotifyFetch(`/artists/${id.trim()}`))
          );
          
          // Aggregate data
          const aggregated = {
            popularity: Math.round(artistsData.reduce((acc, a) => acc + (a.popularity || 0), 0) / artistsData.length),
            followers: {
              total: artistsData.reduce((acc, a) => acc + (a.followers?.total || 0), 0)
            }
          };
          setSpotifyData(aggregated);
        }
      }

      // Fetch SoundCloud data if authed
      if (scToken) {
        const me = await scFetchMe();
        setSoundcloudMe(me);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [scToken]);

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/analytics/trigger', { method: 'POST' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Analytics sync is not available in this environment');
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      await fetchMetrics();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Aggregate SoundCloud Stats from Releases
  const soundcloudStats = useMemo(() => {
    if (!releases) return { plays: 0, likes: 0, reposts: 0 };
    return releases.reduce((acc, r) => {
      const sc = r.performance?.streams?.soundcloud || 0;
      const likes = r.performance?.engagement?.likes || 0;
      const reposts = r.performance?.engagement?.reposts || 0;
      return {
        plays: acc.plays + sc,
        likes: acc.likes + likes,
        reposts: acc.reposts + reposts
      };
    }, { plays: 0, likes: 0, reposts: 0 });
  }, [releases]);

  const totalPlays = metrics.reduce((sum, m) => sum + m.total_plays, 0) + soundcloudStats.plays;
  const totalFollowers = metrics.reduce((sum, m) => sum + m.followers, 0) + (soundcloudMe?.followers_count || 0);

  const platformDistribution = [
    { name: 'SoundCloud', value: soundcloudStats.plays },
    { name: 'Spotify', value: spotifyData?.popularity || 0 }, // Placeholder for actual spotify plays
    { name: 'Other', value: totalPlays - soundcloudStats.plays }
  ].filter(p => p.value > 0);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900">Artist OS Analytics</h1>
          <p className="text-gray-500">Multi-platform performance tracking</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Plays" 
          value={totalPlays.toLocaleString()} 
          icon={<Activity className="w-5 h-5" />} 
          trend="+12%" 
        />
        <StatCard 
          title="Total Followers" 
          value={totalFollowers.toLocaleString()} 
          icon={<Globe className="w-5 h-5" />} 
          trend="+5%" 
        />
        <StatCard 
          title="SC Followers" 
          value={soundcloudMe?.followers_count?.toLocaleString() || 'N/A'} 
          icon={<Music className="w-5 h-5 text-[#ff5500]" />} 
          color="text-[#ff5500]"
        />
        <StatCard 
          title="Spotify Followers" 
          value={spotifyData?.followers?.total?.toLocaleString() || 'N/A'} 
          icon={<Music className="w-5 h-5 text-[#1DB954]" />} 
          color="text-[#1DB954]"
        />
      </div>

      {/* SoundCloud Specific Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-[#ff5500] rounded-xl shrink-0">
            <Play className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 truncate">SC Total Plays</p>
            <p className="text-lg md:text-xl font-bold">{soundcloudStats.plays.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
            <Heart className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 truncate">SC Total Likes</p>
            <p className="text-lg md:text-xl font-bold">{soundcloudStats.likes.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-xl shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 truncate">SC Total Reposts</p>
            <p className="text-lg md:text-xl font-bold">{soundcloudStats.reposts.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Plays by Platform</h3>
          <div className="h-64">
            {metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  ...metrics,
                  { platform: 'SoundCloud', total_plays: soundcloudStats.plays }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_plays" radius={[4, 4, 0, 0]}>
                    {[...metrics, { platform: 'SoundCloud' }].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.platform === 'SoundCloud' ? '#ff5500' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-sm font-medium">
                No data available yet
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
          <div className="h-64">
            {platformDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {platformDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-sm font-medium">
                No distribution data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold">Platform Status & Sessions</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {['soundcloud', 'spotify', 'applemusic'].map(platform => {
            const metric = metrics.find(m => m.platform.toLowerCase() === platform);
            const isConnected = platform === 'soundcloud' ? !!scToken : !!metric;
            
            return (
              <div key={platform} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", isConnected ? 'bg-green-500' : 'bg-gray-300')} />
                  <span className="capitalize font-medium">{platform}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-sm text-gray-500">
                    {isConnected ? 'Connected' : 'Not connected'}
                  </span>
                  {platform === 'spotify' && !isSpotifyAuthed && (
                    <button 
                      onClick={redirectToSpotifyAuth}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 whitespace-nowrap"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  )}
                  {platform === 'soundcloud' && !scToken && (
                    <button 
                      onClick={scLogin}
                      className="text-[#ff5500] hover:text-[#e64d00] text-xs font-bold flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 whitespace-nowrap"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
        <h4 className="font-semibold text-indigo-900 mb-2">Setup Instructions</h4>
        <ul className="text-sm text-indigo-800 space-y-1 list-disc list-inside">
          <li>Connect your SoundCloud and Spotify accounts to see real-time performance data.</li>
          <li>SoundCloud data is pulled directly from your synced tracks in the Release Tracker.</li>
          <li>The daily scheduler automatically collects additional platform data at 3 AM.</li>
        </ul>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend?: string; color?: string }> = ({ title, value, icon, trend, color }) => (
  <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex justify-between items-start mb-3 md:mb-4">
      <div className="p-2 bg-slate-50 rounded-lg shrink-0">
        {icon}
      </div>
      {trend && (
        <span className="text-[10px] md:text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div className="min-w-0">
      <p className="text-xs md:text-sm text-gray-500 mb-1 truncate">{title}</p>
      <p className={cn("text-xl md:text-2xl font-bold truncate", color || 'text-gray-900')}>{value}</p>
    </div>
  </div>
);
