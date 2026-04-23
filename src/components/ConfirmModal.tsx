/**
 * ConfirmModal — accessible, animated confirmation dialog.
 *
 * Drop-in replacement for browser-native `confirm()`.
 * Keyboard: Escape → cancel, Enter → confirm.
 * Focus is trapped inside while open.
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const VARIANT_CFG: Record<ConfirmVariant, {
  iconBg: string;
  iconColor: string;
  btnClass: string;
  Icon: React.ElementType;
}> = {
  danger: {
    iconBg:    'bg-rose-50',
    iconColor: 'text-rose-500',
    btnClass:  'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500 text-white',
    Icon: Trash2,
  },
  warning: {
    iconBg:    'bg-amber-50',
    iconColor: 'text-amber-500',
    btnClass:  'bg-amber-500 hover:bg-amber-400 focus-visible:ring-amber-500 text-white',
    Icon: AlertTriangle,
  },
  info: {
    iconBg:    'bg-blue-50',
    iconColor: 'text-blue-500',
    btnClass:  'bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-500 text-white',
    Icon: AlertTriangle,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef  = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Auto-focus cancel button when opening (safer default focus for destructive dialogs)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keyboard handling: Escape → cancel, Enter → confirm
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      if (e.key === 'Enter')  { e.stopPropagation(); if (!loading) onConfirm(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, loading, onConfirm, onCancel]);

  const { iconBg, iconColor, btnClass, Icon } = VARIANT_CFG[variant];

  return (
    <AnimatePresence>
      {open && (
        // Backdrop
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(13,14,26,0.48)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby={description ? 'confirm-desc' : undefined}
        >
          {/* Panel */}
          <motion.div
            key="confirm-panel"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Body */}
            <div className="px-6 pt-6 pb-5 flex gap-4">
              {/* Icon */}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', iconBg)}>
                <Icon className={cn('w-5 h-5', iconColor)} />
              </div>

              <div className="flex-1 min-w-0">
                <h2
                  id="confirm-title"
                  className="text-base font-bold text-text-primary leading-snug"
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id="confirm-desc"
                    className="mt-1.5 text-sm text-text-secondary leading-relaxed"
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50/70 border-t border-border/60">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-text-secondary bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>

              <button
                ref={confirmRef}
                type="button"
                onClick={() => { if (!loading) onConfirm(); }}
                disabled={loading}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  btnClass,
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="45" />
                    </svg>
                    Working…
                  </span>
                ) : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
