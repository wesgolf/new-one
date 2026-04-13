import React, { useState, useEffect } from 'react';
import { 
  X, 
  Music, 
  Mic2, 
  FileAudio, 
  Video, 
  Globe, 
  TrendingUp, 
  BarChart3,
  ExternalLink,
  Edit3,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Release } from '../types';
import { cn } from '../lib/utils';
import { fetchTrackAudioAnalysis } from '../lib/spotify';
import { supabase } from '../lib/supabase';

interface ReleasePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  release: Release | null;
}

type Tab = 'overview' | 'production' | 'spotify';

export function ReleasePreviewModal({ isOpen, onClose, onEdit, release }: ReleasePreviewModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (isOpen && release?.spotify_data?.track_id && activeTab === 'spotify' && !analysis) {
      loadAnalysis();
    }
  }, [isOpen, release, activeTab]);

  const loadAnalysis = async () => {
    if (!release?.spotify_data?.track_id) return;
    try {
      setLoadingAnalysis(true);
      const data = await fetchTrackAudioAnalysis(release.spotify_data.track_id);
      setAnalysis(data);
      
      // Optionally save back to DB if missing
      if (!release.spotify_data.audio_analysis) {
        await supabase.from('releases').update({
          spotify_data: {
            ...release.spotify_data,
            audio_analysis: data
          }
        }).eq('id', release.id);
      }
    } catch (err) {
      console.error('Failed to load Spotify analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (!isOpen || !release) return null;

  const features = release.spotify_data?.audio_features;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 overflow-hidden">
              {release.assets?.cover_art_url ? (
                <img src={release.assets.cover_art_url} alt={release.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{release.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {release.status}
                </span>
                {release.type && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {release.type}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 px-8 border-b border-slate-100 bg-white">
          {(['overview', 'production', 'spotify'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all",
                activeTab === tab 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">SoundCloud Plays</p>
                    <p className="text-xl font-bold text-orange-600">{(release.performance?.streams?.soundcloud || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Spotify Popularity</p>
                    <p className="text-xl font-bold text-emerald-600">{(release.performance?.streams?.spotify || 0)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Likes</p>
                    <p className="text-xl font-bold text-slate-900">{(release.performance?.engagement?.likes || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">BPM / Key</p>
                    <p className="text-sm font-bold text-slate-900">{release.production?.bpm || '--'} / {release.production?.key || '--'}</p>
                  </div>
                </div>

                {/* Distribution Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-500" />
                      Streaming Links
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Spotify', url: release.distribution?.spotify_url, color: 'text-emerald-600' },
                        { label: 'Apple Music', url: release.distribution?.apple_music_url, color: 'text-rose-600' },
                        { label: 'SoundCloud', url: release.distribution?.soundcloud_url, color: 'text-orange-500' },
                        { label: 'YouTube', url: release.distribution?.youtube_url, color: 'text-red-600' },
                      ].map((link) => (
                        <div key={link.label} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{link.label}</span>
                          {link.url ? (
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className={cn("text-xs font-bold truncate hover:underline", link.color)}>
                              View Link
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">Not Set</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      Next Actions
                    </h4>
                    <div className="space-y-2">
                      <button 
                        onClick={() => {
                          onClose();
                          navigate('/content', { state: { releaseId: release.id, title: release.title } });
                        }}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Video className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-xs font-bold text-blue-900">Post Content</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-600" />
                      </button>

                      <button 
                        onClick={() => {
                          onClose();
                          navigate('/content', { state: { releaseId: release.id, title: release.title, mode: 'ideas' } });
                        }}
                        className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-xs font-bold text-indigo-900">Content Ideas</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                      </button>
                      
                      {(release.status === 'production' || release.status === 'idea') && (
                        <button 
                          onClick={() => {
                            const subject = encodeURIComponent(`Demo Submission: ${release.title}`);
                            const body = encodeURIComponent(`Hi,\n\nI'd like to submit my latest track "${release.title}" for your consideration.\n\nType: ${release.type}\nBPM: ${release.production?.bpm || 'TBD'}\nKey: ${release.production?.key || 'TBD'}\n\nYou can listen here: ${release.distribution?.soundcloud_url || '[Link]'}\n\nBest regards,\nArtist`);
                            window.location.href = `mailto:?subject=${subject}&body=${body}`;
                          }}
                          className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <Mail className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-xs font-bold text-purple-900">Send to Labels</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-purple-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'production' && (
              <motion.div
                key="production"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-blue-500" />
                    Production Files
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Stems', url: release.production?.stems_url },
                      { label: 'Master', url: release.production?.master_url },
                      { label: 'Extended Mix', url: release.production?.extended_mix_url },
                      { label: 'Project File', url: release.production?.project_file_url },
                    ].map((file) => (
                      <div key={file.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-600">{file.label}</span>
                        {file.url ? (
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold uppercase">Missing</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'spotify' && (
              <motion.div
                key="spotify"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {!release.spotify_data?.track_id ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No Spotify data linked to this release.</p>
                    <p className="text-xs text-slate-400 mt-2">Sync your Spotify account in the Track Library to populate this.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Audio Features Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FeatureCard label="Danceability" value={features?.danceability} icon={<Activity className="w-4 h-4" />} />
                      <FeatureCard label="Energy" value={features?.energy} icon={<Zap className="w-4 h-4" />} />
                      <FeatureCard label="Valence" value={features?.valence} icon={<TrendingUp className="w-4 h-4" />} />
                      <FeatureCard label="Acousticness" value={features?.acousticness} icon={<Music className="w-4 h-4" />} />
                      <FeatureCard label="Instrumentalness" value={features?.instrumentalness} icon={<Layers className="w-4 h-4" />} />
                      <FeatureCard label="Speechiness" value={features?.speechiness} icon={<Mic2 className="w-4 h-4" />} />
                    </div>

                    {/* Audio Analysis */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        Audio Analysis
                      </h4>
                      {loadingAnalysis ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                      ) : analysis || release.spotify_data?.audio_analysis ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Tempo</p>
                            <p className="text-xl font-bold text-indigo-600">
                              {Math.round((analysis || release.spotify_data?.audio_analysis).track.tempo)} BPM
                            </p>
                          </div>
                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Key</p>
                            <p className="text-xl font-bold text-indigo-600">
                              {(analysis || release.spotify_data?.audio_analysis).track.key}
                            </p>
                          </div>
                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Duration</p>
                            <p className="text-xl font-bold text-indigo-600">
                              {Math.round((analysis || release.spotify_data?.audio_analysis).track.duration)}s
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={loadAnalysis}
                          className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-colors border border-indigo-100"
                        >
                          Load Detailed Analysis
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ label, value, icon }: { label: string; value?: number; icon: React.ReactNode }) {
  const percentage = Math.round((value || 0) * 100);
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-slate-400">{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-bold text-slate-900">{percentage}%</p>
        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <Activity className={cn("animate-spin", className)} />;
}
