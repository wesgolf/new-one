import React, { useState } from 'react';
import { 
  Folder, 
  ExternalLink, 
  Image, 
  Palette, 
  Music, 
  Layers, 
  FileText, 
  Share2,
  Download,
  Cloud,
  Search,
  Plus,
  Shield,
  Video,
  Camera,
  Zap,
  Sparkles,
  ArrowRight,
  Loader2,
  RefreshCw,
  LayoutGrid,
  List
} from 'lucide-react';
import { ARTIST_INFO } from '../constants';
import { cn } from '../lib/utils';
import { useSoundCloud } from '../hooks/useSoundCloud';
import { useArtistData } from '../hooks/useArtistData';
import { Release } from '../types';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const iconMap = {
  Image,
  Palette,
  Music,
  Layers,
  FileText,
  Share2,
  Shield,
  Video,
  Camera
};

export function BrandVault() {
  const { login, token, fetchTracks } = useSoundCloud();
  const { data: releases, addItem } = useArtistData<Release>('releases');
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSync = async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const tracks = await fetchTracks();
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
              cover_art_url: track.artwork_url || '/placeholder-cover.svg',
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
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredFolders = ARTIST_INFO.dropbox_folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Brand Vault</h2>
          </div>
          <p className="text-slate-500">Centralized hub for your EPK, branding, and creative assets.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mr-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-slate-100 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-slate-100 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {!token ? (
            <button 
              onClick={login}
              className="btn-secondary flex items-center gap-2"
            >
              <Music className="w-4 h-4" />
              Connect SoundCloud
            </button>
          ) : (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-secondary flex items-center gap-2"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync SoundCloud
            </button>
          )}
          <a 
            href={ARTIST_INFO.dropbox_url} 
            target="_blank" 
            rel="noreferrer"
            className="btn-primary flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open Dropbox
          </a>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search vault assets..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {['EPK', 'Logos', 'Contracts', 'Content'].map(tag => (
            <button key={tag} className="px-5 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm">
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredFolders.map((folder, index) => {
            const Icon = (iconMap as any)[folder.icon] || Folder;
            return (
              <motion.a 
                key={folder.name}
                href={`${ARTIST_INFO.dropbox_url}${folder.path}`}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card group hover:border-blue-200 hover:shadow-xl transition-all duration-300"
              >
                <div className="p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors">
                      <Download className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{folder.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5" />
                    Dropbox Synced
                  </p>
                </div>
              </motion.a>
            );
          })}

          {/* Special Link to Content Engine */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: filteredFolders.length * 0.05 }}
          >
            <Link 
              to="/content"
              className="glass-card p-8 group hover:border-emerald-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full bg-emerald-50/30 border-emerald-100"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="p-4 bg-emerald-100 text-emerald-600 rounded-[1.5rem] group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Zap className="w-7 h-7" />
                </div>
                <div className="p-2 bg-white rounded-xl text-emerald-400 group-hover:text-emerald-600 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Content Engine</h3>
              <p className="text-sm text-slate-500">Manage and schedule your finished content assets.</p>
            </Link>
          </motion.div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Storage</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFolders.map((folder) => {
                const Icon = (iconMap as any)[folder.icon] || Folder;
                return (
                  <tr key={folder.name} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900">{folder.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Cloud className="w-4 h-4" />
                        Dropbox
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                        Synced
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={`${ARTIST_INFO.dropbox_url}${folder.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                      >
                        Open
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Integration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="glass-card p-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Cloud className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Cloud Sync Active</h3>
                <p className="text-slate-400 text-sm">Real-time Dropbox Integration</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm font-bold">Connected: Artist Dropbox</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">LIVE</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your Brand Vault is directly mirrored from your master Dropbox. Any high-res press photos, signed contracts, or logo assets added to your Dropbox will appear here instantly.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card p-8 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Vault Health</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-slate-900">142</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Storage Used</p>
              <p className="text-3xl font-bold text-slate-900">4.2GB</p>
            </div>
          </div>
          <button className="mt-8 w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Category
          </button>
        </section>
      </div>
    </div>
  );
}
