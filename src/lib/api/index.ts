/**
 * Shared API utilities for robust, typed fetch operations.
 * All external API calls should go through these utilities.
 */

export { fetchJson, createApiFetcher } from './fetchJson';
export type { FetchJsonOptions } from './fetchJson';
export {
  ApiHttpError,
  ApiContentTypeError,
  ApiNetworkError,
  isApiError,
  type ApiError,
} from './errors';
export { useApiFetch } from './useApiFetch';
export type { UseApiFetchOptions, UseApiFetchResult } from './useApiFetch';
