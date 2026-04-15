/**
 * Custom error classes for API operations.
 * Provides structured error information for debugging and UI handling.
 */

export class ApiHttpError extends Error {
  constructor(
    public url: string,
    public status: number,
    public statusText: string,
    public responseBody: string
  ) {
    const bodySnippet = responseBody.substring(0, 200);
    super(
      `HTTP ${status} ${statusText} from ${url}: ${bodySnippet}${
        responseBody.length > 200 ? '...' : ''
      }`
    );
    this.name = 'ApiHttpError';
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  isNetworkError(): boolean {
    return false;
  }
}

export class ApiContentTypeError extends Error {
  constructor(
    public url: string,
    public expectedContentType: string,
    public actualContentType: string | null,
    public responseBody: string
  ) {
    const bodySnippet = responseBody.substring(0, 150);
    super(
      `Expected content-type ${expectedContentType}, got ${
        actualContentType || 'none'
      } from ${url}. Response starts with: ${bodySnippet}${
        responseBody.length > 150 ? '...' : ''
      }`
    );
    this.name = 'ApiContentTypeError';
  }

  isClientError(): boolean {
    return false;
  }

  isServerError(): boolean {
    return false;
  }

  isNetworkError(): boolean {
    return false;
  }
}

export class ApiNetworkError extends Error {
  constructor(
    public url: string,
    public originalError: Error
  ) {
    super(`Network error while fetching ${url}: ${originalError.message}`);
    this.name = 'ApiNetworkError';
  }

  isClientError(): boolean {
    return false;
  }

  isServerError(): boolean {
    return false;
  }

  isNetworkError(): boolean {
    return true;
  }
}

export type ApiError = ApiHttpError | ApiContentTypeError | ApiNetworkError;

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiHttpError ||
    error instanceof ApiContentTypeError ||
    error instanceof ApiNetworkError
  );
}
