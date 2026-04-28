import { fetchJson, type FetchJsonOptions } from './api';
import { ApiContentTypeError, ApiHttpError } from './api/errors';

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, '');
}

export function buildNetlifyFunctionPath(path: string) {
  return `/.netlify/functions/${trimLeadingSlash(path)}`;
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

export async function fetchServerJsonWithFallback<T = unknown>(
  primaryPath: string,
  fallbackFunctionPath?: string,
  options?: FetchJsonOptions,
): Promise<T> {
  try {
    return await fetchJson<T>(primaryPath, options);
  } catch (error) {
    if (!fallbackFunctionPath || !isHtmlFallbackError(error)) {
      throw error;
    }

    return fetchJson<T>(buildNetlifyFunctionPath(fallbackFunctionPath), options);
  }
}
