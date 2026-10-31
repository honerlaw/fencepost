import type { Handlers } from '../handlers';
import { handlersFromEnv } from './handlers-from-env';

let shared: Handlers | null = null;

/** One set of handlers (and rate-limit state) per server process. */
export function getHandlers(): Handlers {
  shared ??= handlersFromEnv();
  return shared;
}
