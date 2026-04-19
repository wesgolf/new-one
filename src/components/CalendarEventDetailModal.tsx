import React, { useState } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  Edit2, 
  Music, 
  Video, 
  MapPin, 
  CheckSquare, 
  Target, 
  AlertCircle,
  ExternalLink,
  Share2,
  CheckCircle2,
  Circle,
  Repeat,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'post' | 'release' | 'show' | 'meeting' | 'todo' | 'goal';
  platform?: string;
  priority?: 'low' | 'medium' | 'high';
  zernioId?: string;
  releaseId?: string;
  status?: string;
  notes?: string;
  venue?: string;
  task?: string;
  category?: string;
  target?: number;
  current?: number;
  unit?: string;
  isFullDay?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

interface CalendarEventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onDelete: () => void;
  onUpdate: () => void;
}

export function CalendarEventDetailModal({ isOpen, onClose, event, onDelete, onUpdate }: CalendarEventDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Events from the tasks table have a synthetic 'task_' id prefix
      const isTask = event.id.startsWith('task_');
      const rowId  = isTask ? event.id.slice(5) : event.id;

      let table = '';
      if (isTask) {
        table = 'tasks';
      } else {
        switch (event.type) {
          case 'release': table = 'releases'; break;
          case 'post': table = 'content_items'; break;
          case 'show': table = 'shows'; break;
          case 'meeting': table = 'meetings'; break;
          case 'todo': table = 'todos'; break;
          case 'goal': table = 'goals'; break;
        }
      }

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', rowId);

      if (deleteError) throw deleteError;

      onDelete();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTodo = async () => {
    if (event.type !== 'todo') return;

    setLoading(true);
    try {
      const isTask = event.id.startsWith('task_');
      const rowId  = isTask ? event.id.slice(5) : event.id;
      const table  = isTask ? 'tasks' : 'todos';
      const update = isTask
        ? { status: event.status !== 'completed' ? 'done' : 'todo' }
        : { completed: event.status !== 'completed' };

      const { error: updateError } = await supabase
        .from(table)
        .update(update)
        .eq('id', rowId);

      if (updateError) throw updateError;
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (event.type) {
      case 'release': return Music;
      case 'post': return Video;
      case 'show': return MapPin;
      case 'meeting': return Clock;
      case 'todo': return CheckSquare;
      case 'goal': return Target;
      default: return CalendarIcon;
    }
  };

  const Icon = getIcon();

  const getTypeColor = () => {
    switch (event.type) {
      case 'release': return 'bg-blue-600 text-white';
      case 'post': return 'bg-purple-600 text-white';
      case 'show': return 'bg-rose-600 text-white';
      case 'meeting': return 'bg-slate-600 text-white';
      case 'todo': return 'bg-emerald-600 text-white';
      case 'goal': return 'bg-amber-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={cn("p-8 flex items-center justify-between", getTypeColor())}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{event.type}</p>
              <h3 className="text-2xl font-bold text-white leading-tight">{event.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon className="w-3 h-3" />
                Date
              </label>
              <p className="text-lg font-bold text-slate-900">
                {new Date(event.date).toLocaleDateString('default', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              {event.isFullDay && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Zap className="w-3 h-3 text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Full Day Event</span>
                </div>
              )}
            </div>
            {event.time && !event.isFullDay && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Time
                </label>
                <p className="text-lg font-bold text-slate-900">{event.time}</p>
              </div>
            )}
          </div>

          {event.isRecurring && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Repeat className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Recurring Event</p>
                <p className="text-sm font-bold text-indigo-900">
                  Every {event.recurrenceInterval > 1 ? event.recurrenceInterval : ''} {event.recurrencePattern}
                  {event.recurrenceEndDate && ` until ${new Date(event.recurrenceEndDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8">
            {event.status && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    event.status === 'released' || event.status === 'completed' || event.status === 'posted'
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-blue-100 text-blue-600"
                  )}>
                    {event.status}
                  </span>
                </div>
              </div>
            )}
            {event.priority && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    event.priority === 'high' ? "bg-red-100 text-red-600" :
                    event.priority === 'medium' ? "bg-amber-100 text-amber-600" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {event.priority}
                  </span>
                </div>
              </div>
            )}
          </div>

          {event.type === 'post' && event.platform && (
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Video className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform</p>
                    <p className="text-sm font-bold text-slate-900">{event.platform}</p>
                  </div>
                </div>
                {event.zernioId && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <Share2 className="w-3 h-3" />
                    Zernio Scheduled
                  </div>
                )}
              </div>
              {event.notes && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Caption / Hook</p>
                  <p className="text-sm text-slate-600 leading-relaxed italic">"{event.notes}"</p>
                </div>
              )}
            </div>
          )}

          {event.type === 'release' && (
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Music className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Release Details</p>
                  <p className="text-sm font-bold text-blue-900">Official Launch Date</p>
                </div>
              </div>
              {event.notes && (
                <div className="pt-4 border-t border-blue-200">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{event.notes}</p>
                </div>
              )}
            </div>
          )}

          {event.type === 'todo' && (
            <button 
              onClick={handleToggleTodo}
              disabled={loading}
              className={cn(
                "w-full p-6 rounded-3xl border transition-all flex items-center justify-between group",
                event.status === 'completed' 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                  : "bg-slate-50 border-slate-100 text-slate-700 hover:border-emerald-200"
              )}
            >
              <div className="flex items-center gap-4">
                {event.status === 'completed' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : (
                  <Circle className="w-8 h-8 text-slate-300 group-hover:text-emerald-400" />
                )}
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Task Status</p>
                  <p className="text-lg font-bold">{event.status === 'completed' ? 'Completed' : 'Mark as Complete'}</p>
                </div>
              </div>
              <CheckSquare className={cn(
                "w-6 h-6 transition-all",
                event.status === 'completed' ? "text-emerald-500" : "text-slate-300 opacity-0 group-hover:opacity-100"
              )} />
            </button>
          )}

          {event.type === 'goal' && (
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Target className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Goal Category</p>
                    <p className="text-sm font-bold text-amber-900">{event.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Target</p>
                  <p className="text-sm font-bold text-amber-900">{event.target} {event.unit}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  <span>Progress</span>
                  <span>{Math.round(((event.current || 0) / (event.target || 1)) * 100)}%</span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden border border-amber-200">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, ((event.current || 0) / (event.target || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleDelete}
              disabled={loading}
              className={cn(
                "flex-1 px-6 py-4 rounded-2xl border text-sm font-bold transition-all flex items-center justify-center gap-2",
                showConfirmDelete 
                  ? "bg-red-600 text-white border-red-700 hover:bg-red-700" 
                  : "border-red-100 text-red-600 hover:bg-red-50"
              )}
            >
              <Trash2 className="w-4 h-4" />
              {showConfirmDelete ? 'Confirm Delete' : 'Delete Event'}
            </button>
            <button
              onClick={showConfirmDelete ? () => setShowConfirmDelete(false) : onClose}
              className="flex-1 px-6 py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              {showConfirmDelete ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
