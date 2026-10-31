import type { FetchErrorCode } from './types';

/** Maps an HTTP status from /api/cards to an error code. */
export function errorCodeForStatus(status: number): FetchErrorCode {
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 413) return 'bad_request';
  if (status === 503) return 'unavailable';
  return 'upstream_error';
}
