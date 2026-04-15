/**
 * Error boundary component for graceful error handling in pages.
 * Displays user-friendly error messages and provides retry mechanism.
 */

import React, { ReactNode, ReactElement } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { isApiError, type ApiError } from '../lib/api';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorDetails: string;
}

/**
 * Error boundary class component.
 * Catches errors in child tree and displays error UI.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorDetails: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorDetails: getErrorDetails(error),
    };
  }

  componentDidCatch(error: Error) {
    const { onError } = this.props;
    if (onError) {
      onError(error);
    }
    console.error('Error caught by boundary:', error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const prevResetKeys = prevProps.resetKeys;

    if (resetKeys && prevResetKeys) {
      const hasChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index]
      );

      if (hasChanged) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorDetails: '',
    });
  };

  render(): ReactElement {
    const { hasError, error, errorDetails } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return <>{fallback(error, this.resetError)}</>;
      }

      return <DefaultErrorFallback error={error} details={errorDetails} onRetry={this.resetError} />;
    }

    return <>{children}</>;
  }
}

/**
 * Default error fallback UI.
 */
function DefaultErrorFallback({
  error,
  details,
  onRetry,
}: {
  error: Error;
  details: string;
  onRetry: () => void;
}): ReactElement {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-100">
        <div className="p-6 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <h1 className="text-lg font-bold text-red-900">Something went wrong</h1>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="font-mono text-sm text-gray-600 break-words max-h-32 overflow-y-auto">
              {details}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">Debugging tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check browser console for more details</li>
              <li>Verify API endpoints are configured</li>
              <li>Check network tab for failed requests</li>
              <li>Try refreshing the page</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Extract detailed error information for debugging.
 */
function getErrorDetails(error: Error): string {
  if (isApiError(error)) {
    if ('responseBody' in error && 'url' in error && 'status' in error) {
      const apiError = error as any;
      return `API Error: ${apiError.status} from ${apiError.url}\n\nResponse:\n${apiError.responseBody?.substring(0, 500)}`;
    }
  }

  return `${error.name}: ${error.message}\n\nStack: ${error.stack?.substring(0, 500)}`;
}

/**
 * Hook version for functional components.
 * Usage: useErrorHandler() - throws in render, caught by nearest boundary
 */
export function useErrorHandler() {
  return (error: Error | null) => {
    if (error) {
      throw error;
    }
  };
}
