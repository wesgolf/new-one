/**
 * Shared fetch utility for JSON APIs with robust error handling.
 * Validates response content-type and status before parsing JSON.
 * Provides structured error information for debugging and UI handling.
 */

import {
  ApiHttpError,
  ApiContentTypeError,
  ApiNetworkError,
  type ApiError,
} from './errors';

export interface FetchJsonOptions extends RequestInit {
  signal?: AbortSignal;
  validateStatus?: (status: number) => boolean;
}

/**
 * Fetch JSON from an endpoint with robust error handling.
 * - Validates response.ok (200-299)
 * - Validates content-type includes 'application/json'
 * - Parses JSON safely
 * - Throws structured errors with debugging info
 *
 * @param url The URL to fetch from
 * @param options Fetch options (method, headers, body, signal, etc.)
 * @returns Parsed JSON response as type T
 * @throws ApiHttpError if status is not 2xx
 * @throws ApiContentTypeError if response is not JSON
 * @throws ApiNetworkError if fetch fails (network error, abort, etc.)
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const { validateStatus, ...fetchOptions } = options;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    // Check HTTP status
    const statusOk = validateStatus
      ? validateStatus(response.status)
      : response.ok;

    if (!statusOk) {
      const contentType = response.headers.get('content-type');
      let body = '';
      try {
        body = await response.text();
      } catch {
        body = '[unable to read response body]';
      }
      throw new ApiHttpError(
        url,
        response.status,
        response.statusText,
        body
      );
    }

    // Check content-type
    const contentType = response.headers.get('content-type');
    if (
      !contentType ||
      !contentType.toLowerCase().includes('application/json')
    ) {
      let body = '';
      try {
        body = await response.text();
      } catch {
        body = '[unable to read response body]';
      }
      throw new ApiContentTypeError(
        url,
        'application/json',
        contentType,
        body
      );
    }

    // Parse JSON safely
    try {
      const data = await response.json();
      return data as T;
    } catch (parseErr) {
      let body = '';
      try {
        // Try to re-read the body (we already consumed it, so this might fail)
        body = '[JSON parsing error - body already consumed]';
      } catch {
        body = '[unable to read response body]';
      }
      throw new ApiContentTypeError(
        url,
        'application/json (valid JSON)',
        contentType,
        body
      );
    }
  } catch (err) {
    // If it's already one of our structured errors, rethrow it
    if (
      err instanceof ApiHttpError ||
      err instanceof ApiContentTypeError ||
      err instanceof ApiNetworkError
    ) {
      throw err;
    }

    // Handle network errors, aborts, etc.
    if (err instanceof TypeError) {
      throw new ApiNetworkError(url, err as Error);
    }

    // Unknown error, wrap it
    throw new ApiNetworkError(url, err as Error);
  }
}

/**
 * Create a fetch wrapper with default options for a specific endpoint.
 * Useful for API clients that share common configuration.
 *
 * @param baseUrl The base URL or path prefix
 * @param defaultOptions Default fetch options (headers, credentials, etc.)
 * @returns A bound fetchJson function
 */
export function createApiFetcher(
  baseUrl: string,
  defaultOptions: FetchJsonOptions = {}
) {
  return async function apiFetch<T = unknown>(
    endpoint: string,
    options: FetchJsonOptions = {}
  ): Promise<T> {
    const url = baseUrl + endpoint;
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };
    return fetchJson<T>(url, mergedOptions);
  };
}
