import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Circle, 
  Loader2, 
  Star, 
  CheckCircle2,
  Trash2,
  Edit2,
  Music,
  Zap,
  ArrowRight,
  ChevronDown,
  Filter,
  Sparkles,
  Flame,
  Youtube,
  Cloud,
  Share2,
  AlertTriangle,
  History
} from 'lucide-react';
import { Release, ReleaseStatus } from '../types';
import { useArtistData } from '../hooks/useArtistData';
import { cn } from '../lib/utils';
import { ApiErrorBanner } from '../components/ApiErrorBanner';
import { ReleaseModal } from '../components/ReleaseModal';
import { IdeaModal } from '../components/IdeaModal';
import { PromoteModal } from '../components/PromoteModal';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';

const statusColors: Record<string, { bg: string, text: string, border: string, icon: any }> = {
  idea: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', icon: Circle },
  production: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: Loader2 },
  mastered: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: Star },
  ready: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

export function Ideas() {
  const { data: rawReleases, loading, error, addItem, updateItem, deleteItem } = useArtistData<Release>('releases');
  const { canCreateTrack } = useCurrentUserRole();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const ideas = useMemo(() => {
    return rawReleases
      .filter(r => ['idea', 'production', 'mastered', 'ready'].includes(r.status))
      .map(r => {
        const raw = r as any;
        const assets = raw.assets || {};
        return {
          ...r,
          type: raw.type || assets.type || 'Original',
          production: raw.production || assets.production || { project_file_url: '', stems_url: '' },
          distribution: raw.distribution || assets.distribution || {},
          marketing: raw.marketing || assets.marketing || {},
          performance: raw.performance || {
            streams: { spotify: 0, apple: 0, soundcloud: 0, youtube: 0 },
            engagement: { likes: 0, saves: 0, reposts: 0 },
            growth_rate: 0,
            engagement_rate: 0
          }
        } as Release;
      });
  }, [rawReleases]);

  const filteredIdeas = ideas
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handlePromote = async (release: Release) => {
    setSelectedRelease(release);
    setIsPromoteModalOpen(true);
  };

  const finalizePromotion = async (options: { uploadSoundCloud: boolean; uploadYouTube: boolean }) => {
    if (!selectedRelease) return;
    
    // Update status to 'ready' (or 'scheduled' if we want to be more specific)
    // For now, let's keep it as 'ready' but open the full release modal for final details
    setIsPromoteModalOpen(false);
    setIsModalOpen(true);
  };

  const handleScheduleRemix = (release: Release) => {
    // Logic for scheduling to SoundCloud/YouTube
    alert(`Scheduling remix "${release.title}" to SoundCloud and YouTube... (Integration pending assets)`);
  };

  return (
    <div className="space-y-10">
      <ApiErrorBanner error={error} />
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Track Ideas & WIPs</h2>
          <p className="text-slate-500 mt-2">Manage your creative pipeline from spark to master.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.open('/collab', '_blank')}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            Share Portal
          </button>
          {canCreateTrack && (
          <button 
            onClick={() => {
              setSelectedRelease(null);
              setIsIdeaModalOpen(true);
            }}
            className="btn-primary shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            New Idea
          </button>
          )}
        </div>
      </header>

      {/* Workflow Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {['idea', 'production', 'mastered', 'ready'].map(status => (
          <div key={status} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{status}</p>
              <p className="text-2xl font-bold text-slate-900">
                {ideas.filter(i => i.status === status).length}
              </p>
            </div>
            <div className={cn("p-2 rounded-xl", statusColors[status].bg, statusColors[status].text)}>
              {React.createElement(statusColors[status].icon, { className: "w-5 h-5" })}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search ideas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar max-w-full">
          {['all', 'idea', 'production', 'mastered', 'ready'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                statusFilter === s 
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.map((idea) => (
          <div 
            key={idea.id} 
            onClick={() => {
              setSelectedRelease(idea);
              setIsIdeaModalOpen(true);
            }}
            className="glass-card group hover:border-blue-200 transition-all duration-300 cursor-pointer"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border w-fit",
                    statusColors[idea.status].bg, statusColors[idea.status].text, statusColors[idea.status].border
                  )}>
                    {React.createElement(statusColors[idea.status].icon, { className: "w-3 h-3" })}
                    {idea.status}
                  </div>
                  
                  {/* Urgency Indicators */}
                  {idea.status === 'ready' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-bold uppercase tracking-widest border border-rose-100 animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Urgent: Promote Now
                    </div>
                  )}
                  {idea.status === 'production' && new Date(idea.created_at).getTime() < Date.now() - (14 * 24 * 60 * 60 * 1000) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-bold uppercase tracking-widest border border-amber-100">
                      <History className="w-2.5 h-2.5" />
                      Stale: 14+ Days
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {idea.is_public && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-bold uppercase tracking-widest border border-blue-100 mr-1">
                      <Share2 className="w-2.5 h-2.5" />
                      Public
                    </div>
                  )}
                  {idea.production?.project_file_url && (
                    <a 
                      href={idea.production.project_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Open Dropbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Cloud className="w-4 h-4" />
                    </a>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRelease(idea);
                      setIsIdeaModalOpen(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(idea.id);
                    }}
                    className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">{idea.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                {idea.rationale || "No description provided for this idea yet."}
              </p>

              {/* Links Section */}
              <div className="flex flex-wrap gap-2 mb-6">
                {idea.production?.project_file_url && (
                  <a 
                    href={idea.production.project_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    <Cloud className="w-3 h-3" />
                    Project
                  </a>
                )}
                {idea.production?.stems_url && (
                  <a 
                    href={idea.production.stems_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-100 transition-all border border-purple-100"
                  >
                    <Music className="w-3 h-3" />
                    Stems
                  </a>
                )}
              </div>

              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Production Progress</span>
                    <span>
                      {idea.status === 'idea' ? '10%' : idea.status === 'production' ? '40%' : idea.status === 'mastered' ? '80%' : '100%'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        idea.status === 'idea' ? "w-[10%] bg-slate-300" : 
                        idea.status === 'production' ? "w-[40%] bg-blue-500" : 
                        idea.status === 'mastered' ? "w-[80%] bg-purple-500" : "w-full bg-emerald-500"
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1 flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {['idea', 'production', 'mastered', 'ready'].map((s) => (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateItem(idea.id, { status: s as ReleaseStatus });
                        }}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-tighter transition-all",
                          idea.status === s 
                            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                        title={`Move to ${s}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {idea.status === 'ready' ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePromote(idea);
                      }}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 group/btn"
                    >
                      <Zap className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" />
                      Promote to Release
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStatus: Record<string, ReleaseStatus> = {
                          'idea': 'production',
                          'production': 'mastered',
                          'mastered': 'ready'
                        };
                        updateItem(idea.id, { status: nextStatus[idea.status] });
                      }}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-slate-200"
                    >
                      Next Stage: {
                        idea.status === 'idea' ? 'Production' : 
                        idea.status === 'production' ? 'Mastering' : 'Ready'
                      }
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  )}
                  
                  {idea.type === 'Remix' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScheduleRemix(idea);
                      }}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2"
                      title="Schedule Remix"
                    >
                      <Cloud className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Schedule</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredIdeas.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
            <Sparkles className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Your creative pipeline is empty. Start a new idea!</p>
          </div>
        )}
      </div>

      <ReleaseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          if (selectedRelease) {
            await updateItem(selectedRelease.id, data);
          } else {
            await addItem({ ...data, status: data.status || 'idea' });
          }
          setIsModalOpen(false);
        }}
        release={selectedRelease}
      />

      <IdeaModal 
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        onSave={async (data) => {
          const supabaseData = {
            title: data.title,
            status: data.status,
            type: data.type,
            rationale: data.rationale,
            is_public: data.is_public || false,
            production: data.production,
            assets: data.assets || {},
            distribution: data.distribution || {},
            marketing: data.marketing || {},
            performance: data.performance || {
              streams: { spotify: 0, apple: 0, soundcloud: 0, youtube: 0 },
              engagement: { likes: 0, saves: 0, reposts: 0 },
              growth_rate: 0,
              engagement_rate: 0
            }
          };

          if (selectedRelease) {
            await updateItem(selectedRelease.id, supabaseData);
          } else {
            await addItem({ ...supabaseData, status: data.status || 'idea' });
          }
          setIsIdeaModalOpen(false);
        }}
        idea={selectedRelease}
      />

      <PromoteModal 
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        onPromote={finalizePromotion}
        idea={selectedRelease}
      />
    </div>
  );
}
