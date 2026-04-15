/**
 * Global Search Overlay Component
 * Toggles with CMD/CTRL+K or from navbar icon
 * Searches across ideas, releases, content, tasks
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface SearchResult {
  id: string;
  title: string;
  type: 'idea' | 'release' | 'content' | 'task';
  path: string;
  metadata?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // TODO: Wire these to actual data sources
  const mockResults: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [
      { id: '1', title: 'Dance Floor Ambient Mix', type: 'idea', path: '/ideas', metadata: 'Production • In Progress' },
      { id: '2', title: 'Summer Vibes EP', type: 'release', path: '/releases', metadata: 'Release • Ready' },
      { id: '3', title: 'Instagram Content Calendar', type: 'content', path: '/content', metadata: 'Content Engine • 12 items' },
      { id: '4', title: 'Master new stems', type: 'task', path: '/calendar', metadata: 'Task • Due tomorrow' },
    ];

    return results.filter(r =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      (r.metadata?.toLowerCase().includes(query.toLowerCase()) ?? false)
    );
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Should be handled by parent, but keeping for completeness
      }
      if (e.key === 'Escape') {
        onClose();
      }
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(mockResults.length, 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + Math.max(mockResults.length, 1)) % Math.max(mockResults.length, 1));
        }
        if (e.key === 'Enter' && mockResults[selectedIndex]) {
          window.location.href = mockResults[selectedIndex].path;
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mockResults, selectedIndex, onClose]);

  if (!isOpen) return null;

  const typeColors = {
    idea: 'bg-blue-50 text-blue-700 border-blue-200',
    release: 'bg-purple-50 text-purple-700 border-purple-200',
    content: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    task: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const typeLabels = {
    idea: 'Idea',
    release: 'Release',
    content: 'Content',
    task: 'Task',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
      />

      {/* Modal */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto bg-light-surface rounded-2xl shadow-2xl border border-border animate-slideInDown">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-text-tertiary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search ideas, releases, content..."
              className="flex-1 bg-transparent outline-none text-lg text-text-primary placeholder-text-tertiary"
            />
            <button onClick={onClose} className="p-1 hover:bg-light-surface-secondary rounded-lg transition-colors">
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.trim() === '' ? (
              <div className="px-4 py-8 text-center text-text-tertiary">
                <p className="text-sm">Start typing to search across your work</p>
              </div>
            ) : mockResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-tertiary">
                <p className="text-sm">No results found for "{query}"</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {mockResults.map((result, index) => (
                  <a
                    key={result.id}
                    href={result.path}
                    onClick={() => onClose()}
                    className={cn(
                      'px-4 py-3 flex items-center justify-between hover:bg-light-surface-secondary transition-colors cursor-pointer',
                      index === selectedIndex && 'bg-light-surface-secondary'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{result.title}</p>
                      <p className="text-xs text-text-tertiary mt-1">{result.metadata}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-medium border',
                          typeColors[result.type]
                        )}
                      >
                        {typeLabels[result.type]}
                      </span>
                      <ArrowRight className="w-4 h-4 text-text-tertiary" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer Hint */}
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

// Provide a named export alias to match existing imports
export { GlobalSearch as GlobalSearchOverlay };
