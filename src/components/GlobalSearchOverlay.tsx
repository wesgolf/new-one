/**
 * Global Search Overlay Component
 * Toggles with CMD/CTRL+K or from navbar icon
 * Searches across ideas, tasks, goals, calendar events, and reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface SearchResult {
  id: string;
  title: string;
  type: 'idea' | 'task' | 'goal' | 'event' | 'report';
  path: string;
  metadata?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const like = `%${q}%`;
      const [ideasRes, tasksRes, goalsRes, eventsRes, reportsRes] = await Promise.allSettled([
        supabase.from('ideas').select('id, title, status').ilike('title', like).limit(4),
        supabase.from('tasks').select('id, title, completed').ilike('title', like).limit(4),
        supabase.from('goals').select('id, title, category').ilike('title', like).limit(4),
        supabase.from('calendar_events').select('id, title, event_type').ilike('title', like).limit(4),
        supabase.from('reports').select('id, title, report_date').ilike('title', like).limit(4),
      ]);

      const merged: SearchResult[] = [
        ...((ideasRes.status === 'fulfilled' ? ideasRes.value.data ?? [] : []) as any[]).map((r) => ({
          id: r.id, title: r.title, type: 'idea' as const,
          path: '/ideas', metadata: r.status ?? 'Idea',
        })),
        ...((tasksRes.status === 'fulfilled' ? tasksRes.value.data ?? [] : []) as any[]).map((r) => ({
          id: r.id, title: r.title, type: 'task' as const,
          path: '/tasks', metadata: r.completed ?? 'Task',
        })),
        ...((goalsRes.status === 'fulfilled' ? goalsRes.value.data ?? [] : []) as any[]).map((r) => ({
          id: r.id, title: r.title, type: 'goal' as const,
          path: '/goals', metadata: r.category ?? 'Goal',
        })),
        ...((eventsRes.status === 'fulfilled' ? eventsRes.value.data ?? [] : []) as any[]).map((r) => ({
          id: r.id, title: r.title, type: 'event' as const,
          path: '/calendar', metadata: r.event_type ?? 'Event',
        })),
        ...((reportsRes.status === 'fulfilled' ? reportsRes.value.data ?? [] : []) as any[]).map((r) => ({
          id: r.id, title: r.title, type: 'report' as const,
          path: '/reports', metadata: r.report_date ? new Date(r.report_date).toLocaleDateString() : 'Report',
        })),
      ];
      setResults(merged.slice(0, 12));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (!isOpen) { setQuery(''); setResults([]); }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        navigate(results[selectedIndex].path);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, navigate]);

  if (!isOpen) return null;

  const typeColors = {
    idea: 'bg-blue-50 text-blue-700 border-blue-200',
    task: 'bg-amber-50 text-amber-700 border-amber-200',
    goal: 'bg-violet-50 text-violet-700 border-violet-200',
    event: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    report: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const typeLabels = { idea: 'Idea', task: 'Task', goal: 'Goal', event: 'Event', report: 'Report' };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto bg-light-surface rounded-2xl shadow-2xl border border-border">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            {loading
              ? <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
              : <Search className="w-5 h-5 text-text-tertiary" />
            }
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ideas, tasks, goals, events, reports..."
              className="flex-1 bg-transparent outline-none text-lg text-text-primary placeholder-text-tertiary"
            />
            <button onClick={onClose} className="p-1 hover:bg-light-surface-secondary rounded-lg transition-colors">
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.trim() === '' ? (
              <div className="px-4 py-8 text-center text-text-tertiary">
                <p className="text-sm">Start typing to search across your work</p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center text-text-tertiary">
                <p className="text-sm">No results for "{query}"</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => { navigate(result.path); onClose(); }}
                    className={cn(
                      'w-full px-4 py-3 flex items-center justify-between hover:bg-light-surface-secondary transition-colors text-left',
                      index === selectedIndex && 'bg-light-surface-secondary'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{result.title}</p>
                      <p className="text-xs text-text-tertiary mt-1 capitalize">{result.metadata}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className={cn('px-2 py-1 rounded-md text-xs font-medium border', typeColors[result.type])}>
                        {typeLabels[result.type]}
                      </span>
                      <ArrowRight className="w-4 h-4 text-text-tertiary" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border bg-light-surface-secondary text-xs text-text-tertiary flex items-center justify-between">
            <span>
              Press <kbd className="px-2 py-1 bg-light-surface rounded border border-border font-mono text-xs">↑↓</kbd> to navigate,{' '}
              <kbd className="px-2 py-1 bg-light-surface rounded border border-border font-mono text-xs">⏎</kbd> to select,{' '}
              <kbd className="px-2 py-1 bg-light-surface rounded border border-border font-mono text-xs">ESC</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export { GlobalSearch as GlobalSearchOverlay };
