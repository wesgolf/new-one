import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Save, 
  Link, 
  FileText,
  Music,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Release, ReleaseStatus, ReleaseType } from '../types';
import { cn } from '../lib/utils';

interface IdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Release>) => Promise<void>;
  idea: Release | null;
}

export function IdeaModal({ isOpen, onClose, onSave, idea }: IdeaModalProps) {
  const [formData, setFormData] = useState<Partial<Release>>({
    title: '',
    status: 'idea',
    type: 'Original',
    rationale: '',
    is_public: false,
    production: { project_file_url: '', stems_url: '' }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (idea) {
      setFormData({
        ...idea,
        production: idea.production || { project_file_url: '', stems_url: '' }
      });
    } else {
      setFormData({
        title: '',
        status: 'idea',
        type: 'Original',
        rationale: '',
        production: { project_file_url: '', stems_url: '' }
      });
    }
  }, [idea, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save idea');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {idea ? 'Edit Idea' : 'Capture New Idea'}
              </h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Creative Pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idea Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="e.g. Summer Anthem 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as ReleaseStatus })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
              >
                <option value="idea">Idea</option>
                <option value="production">Production</option>
                <option value="mastered">Mastered</option>
                <option value="ready">Ready</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as ReleaseType })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
              >
                <option value="Original">Original</option>
                <option value="Remix">Remix</option>
                <option value="Mashup">Mashup</option>
                <option value="Mix">Mix</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dropbox / Project Link</label>
            <div className="relative">
              <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="url" 
                value={formData.production?.project_file_url || ''}
                onChange={e => setFormData({ 
                  ...formData, 
                  production: { ...formData.production!, project_file_url: e.target.value } 
                })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="https://www.dropbox.com/..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stems Link (Optional)</label>
            <div className="relative">
              <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="url" 
                value={formData.production?.stems_url || ''}
                onChange={e => setFormData({ 
                  ...formData, 
                  production: { ...formData.production!, stems_url: e.target.value } 
                })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes / Rationale</label>
            <textarea 
              rows={4}
              value={formData.rationale || ''}
              onChange={e => setFormData({ ...formData, rationale: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="What's the vibe? Any specific goals for this track?"
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Producer Portal</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Share for Collaboration</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.is_public || false}
                onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Idea'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
