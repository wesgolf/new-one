/**
 * Shared dashboard card primitives:
 *  - DashCard        - standard card container with optional header
 *  - DashSkeleton    - shimmer loading placeholder
 *  - DashError       - per-card error state
 */

import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── DashCard ───────────────────────────────────────────────────────────────

interface DashCardProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** compact removes extra padding */
  compact?: boolean;
}

export function DashCard({ title, action, children, className, compact }: DashCardProps) {
  return (
    <div className={cn(
      'bg-white border border-border/60 rounded-2xl shadow-[var(--shadow-card)] flex flex-col',
      'transition-shadow duration-200 hover:shadow-[var(--shadow-lifted)]',
      compact ? 'p-4' : 'p-5',
      className
    )}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.16em]">
              {title}
            </h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── DashSkeleton ────────────────────────────────────────────────────────────

interface DashSkeletonProps {
  rows?: number;
  className?: string;
}

export function DashSkeleton({ rows = 3, className }: DashSkeletonProps) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-border/50 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-border/50 rounded-lg w-3/4" />
            <div className="h-2.5 bg-border/40 rounded-lg w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DashError ───────────────────────────────────────────────────────────────

interface DashErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function DashError({ message = 'Failed to load', onRetry }: DashErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <AlertCircle className="w-8 h-8 text-error/60" />
      <p className="text-xs text-text-tertiary">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}
