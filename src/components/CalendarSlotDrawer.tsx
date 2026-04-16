import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckSquare, Loader2, Radio, Target, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface Props {
  open: boolean;
  date: string;
  time?: string;
  prefillTitle?: string;
  prefillType?: 'event' | 'task';
  onClose: () => void;
  onCreated: () => void;
}

type Step = 'choose' | 'event' | 'task';

const TYPE_OPTIONS = [
  {
    type: 'event' as const,
    label: 'Custom event',
    description: 'Meeting, studio session, deadline',
    icon: Calendar,
    border: 'border-blue-100 bg-blue-50 hover:border-blue-300',
    iconClass: 'text-blue-600',
  },
  {
    type: 'task' as const,
    label: 'Task',
    description: 'Action item with a due date',
    icon: CheckSquare,
    border: 'border-purple-100 bg-purple-50 hover:border-purple-300',
    iconClass: 'text-purple-600',
  },
  {
    type: 'post' as const,
    label: 'Scheduled post',
    description: 'Deep-link into content scheduler',
    icon: Radio,
    border: 'border-orange-100 bg-orange-50 hover:border-orange-300',
    iconClass: 'text-orange-600',
  },
  {
    type: 'goal' as const,
    label: 'Goal milestone',
    description: 'Open goal creation flow',
    icon: Target,
    border: 'border-emerald-100 bg-emerald-50 hover:border-emerald-300',
    iconClass: 'text-emerald-600',
  },
] as const;

export function CalendarSlotDrawer({ open, date, time, prefillTitle, prefillType, onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLInputElement>(null);

  const [step, setStep]               = useState<Step>('choose');
  const [title, setTitle]             = useState('');
  const [selectedTime, setTime]       = useState('12:00');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(prefillTitle ?? '');
    setTime(time ?? '12:00');
    setError(null);
    setStep(prefillType ?? 'choose');
    // Focus the title input when skipping the choose step
    if (prefillType) {
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, prefillTitle, prefillType, time]);

  const reset = () => { setStep('choose'); setTitle(''); setError(null); };
  const handleClose = () => { reset(); onClose(); };

  const handleTypeChoose = (type: 'event' | 'task' | 'post' | 'goal') => {
    if (type === 'post') {
      navigate('/content', { state: { prefillDate: date, prefillTime: time } });
      handleClose();
      return;
    }
    if (type === 'goal') {
      navigate('/goals', { state: { prefillDate: date, openCreate: true } });
      handleClose();
      return;
    }
    setStep(type);
    setTimeout(() => titleRef.current?.focus(), 60);
  };

  const saveEvent = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from('meetings').insert([{
        title: title.trim(),
        date,
        time: selectedTime,
        user_id: user?.id ?? null,
        created_at: new Date().toISOString(),
      }]);
      if (err) throw err;
      reset();
      onCreated();
    } catch (e: any) {
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveTask = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from('tasks').insert([{
        title: title.trim(),
        due_date: `${date}T${selectedTime}:00`,
        status: 'todo',
        priority: 'medium',
        created_by: user?.id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      if (err) throw err;
      reset();
      onCreated();
    } catch (e: any) {
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-100 bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250">
        <div className="flex items-start justify-between px-7 pt-7 pb-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {date}{selectedTime && step !== 'choose' ? ` · ${selectedTime}` : ''}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              {step === 'choose' ? 'What would you like to add?' : step === 'event' ? 'New event' : 'New task'}
            </h2>
          </div>
          <button onClick={handleClose} className="rounded-xl p-2 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-7 pt-4">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          {step === 'choose' && (
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map(({ type, label, description, icon: Icon, border, iconClass }) => (
                <button
                  key={type}
                  onClick={() => handleTypeChoose(type)}
                  className={cn('flex flex-col items-start gap-2.5 rounded-[1.5rem] border p-4 text-left transition-all hover:shadow-md active:scale-[0.98]', border)}
                >
                  <Icon className={cn('h-5 w-5', iconClass)} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(step === 'event' || step === 'task') && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {step === 'event' ? 'Event title' : 'Task title'}
                </label>
                <input
                  ref={titleRef}
                  className="input-base mt-1"
                  placeholder={step === 'event' ? 'Studio session, meeting, drop deadline…' : 'Action item…'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (step === 'event' ? saveEvent() : saveTask())}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Time</label>
                <input
                  type="time"
                  className="input-base mt-1"
                  value={selectedTime}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={step === 'event' ? saveEvent : saveTask}
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
