/**
 * ActionBar — Top command strip for the dashboard.
 *
 * Buttons:
 *   - Generate Report → opens inline modal
 *   - Sync Now       → triggers analytics refresh + re-fetch
 *   - AI Assistant   → navigates to /coach
 *
 * Includes the GenerateReport modal inline to keep it co-located.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, RefreshCw, Sparkles, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WeeklyReportModal } from '../WeeklyReportModal';

// ─── ActionBar ───────────────────────────────────────────────────────────────

interface ActionBarProps {
  onSyncNow: () => void;
  onAIAssistant?: () => void;
  syncing?: boolean;
  syncSuccess?: boolean;
}

export function ActionBar({ onSyncNow, onAIAssistant, syncing, syncSuccess }: ActionBarProps) {
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: page heading */}
        <div>
          <h1 className="text-xl font-bold text-text-primary">Command Center</h1>
          <p className="text-sm text-text-tertiary">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <BarChart2 className="w-4 h-4" />
            Generate Report
          </button>

          <button
            onClick={onSyncNow}
            disabled={syncing}
            className={cn(
              'btn-secondary flex items-center gap-2 text-sm',
              syncing && 'opacity-70 cursor-wait'
            )}
            title="Sync latest analytics data"
          >
            {syncSuccess ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            )}
            {syncing ? 'Syncing…' : syncSuccess ? 'Synced' : 'Sync Now'}
          </button>

          <button
            onClick={() => onAIAssistant ? onAIAssistant() : navigate('/coach')}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>
        </div>
      </div>

      {showReportModal && (
        <WeeklyReportModal onClose={() => setShowReportModal(false)} />
      )}
    </>
  );
}
