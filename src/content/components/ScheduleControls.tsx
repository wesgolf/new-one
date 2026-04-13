import React, { useState } from 'react';
import { Send, Clock, Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ScheduleControlsProps {
  onPostNow: () => Promise<void>;
  onSchedule: (scheduledAt: string) => Promise<void>;
  isPublishDisabled: boolean;
  disabledReason?: string;
  isPublishing?: boolean;
}

export function ScheduleControls({
  onPostNow,
  onSchedule,
  isPublishDisabled,
  disabledReason,
  isPublishing,
}: ScheduleControlsProps) {
  const [mode, setMode] = useState<'none' | 'schedule'>('none');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePostNow = async () => {
    setIsProcessing(true);
    setResult(null);
    try {
      await onPostNow();
      setResult({ type: 'success', message: 'Published successfully!' });
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to publish' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      setResult({ type: 'error', message: 'Please select both date and time' });
      return;
    }
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    if (new Date(scheduledAt) <= new Date()) {
      setResult({ type: 'error', message: 'Schedule time must be in the future' });
      return;
    }

    setIsProcessing(true);
    setResult(null);
    try {
      await onSchedule(scheduledAt);
      setResult({ type: 'success', message: 'Scheduled successfully!' });
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to schedule' });
    } finally {
      setIsProcessing(false);
    }
  };

  const processing = isProcessing || isPublishing;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={handlePostNow}
          disabled={isPublishDisabled || processing}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg",
            isPublishDisabled || processing
              ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {processing && mode === 'none' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Post Now
        </button>

        <button
          onClick={() => setMode(mode === 'schedule' ? 'none' : 'schedule')}
          disabled={isPublishDisabled || processing}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all border-2",
            mode === 'schedule'
              ? "border-purple-500 bg-purple-50 text-purple-700"
              : isPublishDisabled || processing
                ? "border-slate-100 text-slate-300 cursor-not-allowed"
                : "border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50/50"
          )}
        >
          <Clock className="w-4 h-4" />
          Schedule
        </button>
      </div>

      {isPublishDisabled && disabledReason && (
        <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {disabledReason}
        </p>
      )}

      <AnimatePresence>
        {mode === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-500">
                <Calendar className="w-3.5 h-3.5" />
                Schedule for Later
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  />
                </div>
              </div>
              <button
                onClick={handleSchedule}
                disabled={processing || !scheduledDate || !scheduledTime}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all",
                  processing || !scheduledDate || !scheduledTime
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200"
                )}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Confirm Schedule
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
              result.type === 'success'
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-red-50 text-red-700 border border-red-100"
            )}
          >
            {result.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {result.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
