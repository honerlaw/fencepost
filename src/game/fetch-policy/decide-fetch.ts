import { AUTO_RETRY_AFTER_ANSWERS, LOW_WATER } from './constants';
import type { FetchDecision, FetchState } from './types';

export function decideFetch(
  fetch: FetchState,
  ctx: { queued: number; sessionStarted: boolean; answers: number },
): FetchDecision {
  if (fetch.inFlight || !ctx.sessionStarted || ctx.queued > LOW_WATER) return 'wait';
  if (!fetch.error) return 'fetch';
  // Rate limits never retry on their own; other errors get one retry, 3 answers later.
  if (fetch.error.code === 'rate_limited' || fetch.autoRetryUsed) return 'wait';
  return ctx.answers >= fetch.error.atAnswer + AUTO_RETRY_AFTER_ANSWERS ? 'auto-retry' : 'wait';
}
