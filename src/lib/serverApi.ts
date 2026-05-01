import { fetchJson, type FetchJsonOptions } from './api';
import { ApiContentTypeError, ApiHttpError, ApiNetworkError } from './api/errors';

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, '');
}

export function buildNetlifyFunctionPath(path: string) {
  return `/.netlify/functions/${trimLeadingSlash(path)}`;
}

function isLocalDevHost() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function isHtmlFallbackError(error: unknown) {
  if (error instanceof ApiContentTypeError) {
    return (
      (error.actualContentType ?? '').toLowerCase().includes('text/html') ||
      error.responseBody.toLowerCase().includes('<!doctype') ||
      error.responseBody.toLowerCase().includes('<html')
    );
  }

  if (error instanceof ApiHttpError) {
    const body = error.responseBody.toLowerCase();
    return body.includes('<!doctype') || body.includes('<html');
  }

  return false;
}

function shouldFallbackToFunction(error: unknown, primaryPath: string) {
  if (!primaryPath.startsWith('/api/')) return false;

  if (isHtmlFallbackError(error)) return true;

  if (error instanceof ApiHttpError) {
    return error.status === 404 || error.status === 405 || error.status === 408 || error.status >= 500;
  }

  if (error instanceof ApiNetworkError) {
    return true;
  }

  return false;
}

export async function fetchServerJsonWithFallback<T = unknown>(
  primaryPath: string,
  fallbackFunctionPath?: string,
  options?: FetchJsonOptions,
): Promise<T> {
  try {
    return await fetchJson<T>(primaryPath, options);
  } catch (error) {
    if (isLocalDevHost() && shouldFallbackToFunction(error, primaryPath)) {
      if (
        error instanceof ApiHttpError ||
        error instanceof ApiContentTypeError ||
        error instanceof ApiNetworkError
      ) {
        throw new Error(
          `Local API route ${primaryPath} was not reached. Start the Express app server with npm run dev instead of using a Vite-only server.`,
        );
      }
    }

    if (!fallbackFunctionPath || !shouldFallbackToFunction(error, primaryPath)) {
      throw error;
    }

    return fetchJson<T>(buildNetlifyFunctionPath(fallbackFunctionPath), options);
  }
}
