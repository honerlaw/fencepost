import { describe, expect, it } from 'vitest';

import { decideFetch, errorCodeForStatus, fetchFailed, fetchStarted, fetchSucceeded, initialFetchState } from './fetch-policy';

const ctx = (over: Partial<{ queued: number; sessionStarted: boolean; answers: number }> = {}) => ({
  queued: 0,
  sessionStarted: true,
  answers: 1,
  ...over,
});

describe('prefetch policy', () => {
  it('fetches when 2 or fewer cards are queued', () => {
    expect(decideFetch(initialFetchState, ctx({ queued: 2 }))).toBe('fetch');
    expect(decideFetch(initialFetchState, ctx({ queued: 3 }))).toBe('wait');
  });

  it('spends nothing before the first answer of the session', () => {
    expect(decideFetch(initialFetchState, ctx({ sessionStarted: false }))).toBe('wait');
  });

  it('runs one fetch at a time', () => {
    expect(decideFetch(fetchStarted(initialFetchState, 'fetch'), ctx())).toBe('wait');
  });
});

describe('retry policy', () => {
  it('never retries a rate limit on its own', () => {
    const failed = fetchFailed(fetchStarted(initialFetchState, 'fetch'), 'rate_limited', 1);
    for (let answers = 1; answers < 20; answers++) expect(decideFetch(failed, ctx({ answers }))).toBe('wait');
  });

  it('retries other errors once, three answers later', () => {
    let fetch = fetchFailed(fetchStarted(initialFetchState, 'fetch'), 'upstream_error', 4);
    expect(decideFetch(fetch, ctx({ answers: 6 }))).toBe('wait');
    expect(decideFetch(fetch, ctx({ answers: 7 }))).toBe('auto-retry');
    fetch = fetchFailed(fetchStarted(fetch, 'auto-retry'), 'upstream_error', 7);
    // The automatic retry is spent: only Try again can fetch now.
    for (let answers = 7; answers < 20; answers++) expect(decideFetch(fetch, ctx({ answers }))).toBe('wait');
  });

  it('a manual Try again clears the error and restores the retry budget', () => {
    let fetch = fetchFailed(fetchStarted(fetchStarted(initialFetchState, 'fetch'), 'auto-retry'), 'network', 3);
    fetch = fetchStarted(fetch, 'manual');
    expect(fetch).toMatchObject({ inFlight: true, error: null, autoRetryUsed: false });
  });

  it('a successful batch resets the failure streak', () => {
    const fetch = fetchSucceeded(fetchStarted(fetchFailed(initialFetchState, 'network', 1), 'auto-retry'));
    expect(fetch).toMatchObject({ inFlight: false, error: null, autoRetryUsed: false });
  });

  it('maps HTTP statuses to error codes', () => {
    expect([429, 400, 413, 503, 500].map(errorCodeForStatus)).toEqual(['rate_limited', 'bad_request', 'bad_request', 'unavailable', 'upstream_error']);
  });
});
