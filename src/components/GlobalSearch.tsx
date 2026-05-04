import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music, FileText, Users, Target, Calendar, ArrowRight, Loader2, Lightbulb, StickyNote, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { searchRecords, SearchResult, SearchRecordType } from '../services/searchService';

type DisplayResult = SearchResult & { icon: React.ElementType; path: string; label: string };

const TYPE_META: Record<SearchRecordType, { icon: React.ElementType; path: string; label: string }> = {
  release:     { icon: Music,      path: '/ideas',   label: 'Release' },
  idea:        { icon: Lightbulb,  path: '/ideas',   label: 'Idea' },
  content:     { icon: Calendar,   path: '',         label: 'Content' },
  goal:        { icon: Target,     path: '/goals',   label: 'Goal' },
  task:        { icon: CheckSquare,path: '/tasks',   label: 'Task' },
  event:       { icon: Calendar,   path: '/calendar',label: 'Event' },
  report:      { icon: FileText,   path: '/reports', label: 'Report' },
  opportunity: { icon: Users,      path: '',         label: 'Contact' },
  note:        { icon: StickyNote, path: '/ideas',   label: 'Note' },
  resource:    { icon: FileText,   path: '/coach',   label: 'Resource' },
};

interface GlobalSearchProps {
  compact?: boolean;
}

export function GlobalSearch({ compact = false }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DisplayResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const raw = await searchRecords(query);
        const combined: DisplayResult[] = raw.map(r => ({
          ...r,
          ...(TYPE_META[r.record_type] ?? { icon: FileText, path: '/', label: r.record_type }),
        })).filter((item) => item.path);
        setResults(combined);
      } catch (err) {
        console.error('[GlobalSearch] search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (item: DisplayResult) => {
    navigate(item.path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {compact ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all w-full max-w-md group"
        >
          <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Search anything...</span>
          <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400 opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 md:pt-[10vh] p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden"
              ref={searchRef}
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tracks, contacts, goals, resources..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-lg text-slate-900 placeholder:text-slate-400"
                />
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Searching your workspace...</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((item) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all group text-left"
                        >
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                            <IconComp className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                            {item.snippet && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.snippet}</p>
                            )}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.label}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                ) : query ? (
                  <div className="py-12 text-center">
                    <p className="text-slate-500 font-medium">No results found for "{query}"</p>
                  </div>
                ) : (
                  <div className="py-8 px-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Searches</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Mastering', 'Label Contacts', 'Summer Tour', 'EPK Assets'].map((s) => (
                        <button 
                          key={s}
                          onClick={() => setQuery(s)}
                          className="flex items-center gap-2 p-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all text-left"
                        >
                          <Search className="w-3 h-3" />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold text-slate-400">ESC</kbd>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Close</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold text-slate-400">↵</kbd>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Workspace search · Artist OS</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
