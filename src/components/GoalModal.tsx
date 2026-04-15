import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentAuthUser } from '../lib/auth';
import { Goal } from '../types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: Goal | null;
}

export function GoalModal({ isOpen, onClose, onSuccess, goal }: GoalModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    target: '',
    unit: '',
    category: 'Streaming',
    term: 'short',
    start_date: '',
    deadline: '',
    manual_progress: false
  });

  React.useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title,
        target: goal.target.toString(),
        unit: goal.unit,
        category: goal.category,
        term: goal.term,
        start_date: goal.start_date || '',
        deadline: goal.deadline || '',
        manual_progress: !!goal.manual_progress
      });
    } else {
      setFormData({
        title: '',
        target: '',
        unit: '',
        category: 'Streaming',
        term: 'short',
        start_date: '',
        deadline: '',
        manual_progress: false
      });
    }
  }, [goal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = await getCurrentAuthUser();

    const goalData: any = {
      title: formData.title,
      target: parseFloat(formData.target),
      unit: formData.unit,
      category: formData.category,
      term: formData.term,
      start_date: formData.start_date || null,
      deadline: formData.deadline || null,
      manual_progress: formData.manual_progress,
    };

    if (!goal) {
      goalData.current = 0;
      if (user) {
        goalData.user_id = user.id;
      }
    }

    const performQuery = async (data: any) => {
      return goal 
        ? supabase.from('goals').update(data).eq('id', goal.id)
        : supabase.from('goals').insert([data]);
    };

    let { error } = await performQuery(goalData);

    // Fallback if columns are missing (PGRST204)
    if (error && error.code === 'PGRST204') {
      console.warn("Retrying without new columns due to schema mismatch...");
      const fallbackData = { ...goalData };
      delete fallbackData.manual_progress;
      delete fallbackData.start_date;
      const retry = await performQuery(fallbackData);
      error = retry.error;
    }

    if (!error) {
      onSuccess();
      onClose();
    } else {
      console.error('Error saving goal:', error);
      if (error.code === 'PGRST204') {
        alert("Database schema mismatch. Please ensure the 'manual_progress' and 'start_date' columns exist in your 'goals' table. You can find the SQL in supabase-schema.sql");
      } else {
        alert("Failed to save goal: " + error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">{goal ? 'Edit Goal' : 'Add New Goal'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Goal Title</label>
            <input
              required
              type="text"
              placeholder="e.g. Hit 10K Monthly Listeners"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Target</label>
              <input
                required
                type="number"
                placeholder="10000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Unit</label>
              <input
                required
                type="text"
                placeholder="listeners"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Streaming">Streaming</option>
                <option value="Social">Social</option>
                <option value="Live">Live</option>
                <option value="Revenue">Revenue</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Term</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              >
                <option value="short">Short Term</option>
                <option value="medium">Medium Term</option>
                <option value="long">Long Term</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date (Optional)</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Deadline (Optional)</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="manual_progress"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              checked={formData.manual_progress}
              onChange={(e) => setFormData({ ...formData, manual_progress: e.target.checked })}
            />
            <label htmlFor="manual_progress" className="text-sm font-medium text-slate-700">
              Manual Progress Tracking
              <span className="block text-[10px] text-slate-400 font-normal">I will update progress manually instead of AI analysis</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (goal ? 'Update Goal' : 'Create Goal')}
          </button>
        </form>
      </div>
    </div>
  );
}
