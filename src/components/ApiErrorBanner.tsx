import React, { useState } from 'react';
import { AlertCircle, WifiOff, FileX, RefreshCw, X } from 'lucide-react';
import { ApiHttpError, ApiContentTypeError, ApiNetworkError } from '../lib/api';
import { cn } from '../lib/utils';

interface ApiErrorBannerProps {
  /** The error to display. Accepts ApiError subclasses, generic Error, plain string, or null (hidden). */
  error: Error | string | null;
  /** When provided, shows a retry icon button. */
  onRetry?: () => void;
  /** Called when the user clicks the dismiss button. If omitted the banner is still dismissible locally. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Unified error banner for API and network failures.
 *
 * Renders a colour-coded alert that:
 * - Distinguishes HTTP errors, content-type errors, and network errors
 * - Shows an optional retry button
 * - Is dismissible by the user
 * - Returns null when error is null (zero-cost render)
 */
export function ApiErrorBanner({
  error,
  onRetry,
  onDismiss,
  className,
}: ApiErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!error || dismissed) return null;

  // Resolve display properties from the error type
  let Icon: React.ElementType = AlertCircle;
  let title = 'Something went wrong';
  let detail: string;

  if (typeof error === 'string') {
    detail = error;
  } else if (error instanceof ApiNetworkError) {
    Icon = WifiOff;
    title = 'Network error';
    detail = 'Could not reach the server. Check your connection and try again.';
  } else if (error instanceof ApiContentTypeError) {
    Icon = FileX;
    title = 'Service unavailable';
    detail = 'This feature requires a backend that is not available in the current environment.';
  } else if (error instanceof ApiHttpError) {
    const s = error.status;
    title =
      s === 401 ? 'Unauthorized'
      : s === 403 ? 'Access denied'
      : s === 404 ? 'Not found'
      : s >= 500 ? 'Server error'
      : `Request failed (${s})`;
    detail = error.statusText || error.message;
  } else {
    detail = error.message;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-sm',
        className
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-red-600 text-xs mt-0.5 leading-relaxed">{detail}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {onRetry && (
          <button
            onClick={onRetry}
            title="Retry"
            aria-label="Retry"
            className="text-red-500 hover:text-red-700 transition-colors rounded p-0.5 hover:bg-red-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleDismiss}
          title="Dismiss"
          aria-label="Dismiss error"
          className="text-red-400 hover:text-red-600 transition-colors rounded p-0.5 hover:bg-red-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
