import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { MIN_FETCH_GAP_MS } from '@/game/fetch-policy';

import { createLiveCardSource } from './card-source';
import { createHandlers, type Handlers } from './handlers';
import { logLine } from './log';
import { createRateLimiter } from './rate-limit';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

function intEnv(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const n = Number(env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Builds the handlers from environment variables. expo-server doesn't load .env files,
 * so everything comes from the real environment (Fly secrets in production).
 */
export function handlersFromEnv(env: Record<string, string | undefined> = process.env): Handlers {
  const apiKey = env.OPENROUTER_API_KEY;
  const models = [env.CARD_MODEL, env.CARD_MODEL_FALLBACK].filter((m): m is string => !!m);
  const configured = !!apiKey && !!env.CARD_MODEL;
  const openrouter = configured
    ? createOpenRouter({ apiKey, ...(env.OPENROUTER_BASE_URL ? { baseURL: env.OPENROUTER_BASE_URL } : {}) })
    : null;

  return createHandlers({
    source: openrouter
      ? createLiveCardSource({
          models,
          languageModel: (id) => openrouter.chat(id),
          maxOutputTokens: intEnv(env, 'CARD_MAX_OUTPUT_TOKENS', 16_000),
          rng: Math.random,
          newId: () => crypto.randomUUID(),
        })
      : null,
    batchSize: intEnv(env, 'BATCH_SIZE', 5),
    behindFly: !!env.FLY_APP_NAME,
    limits: {
      // One batch per 20 s and 60 a day per device; a shared IP (an office, a carrier NAT) gets more room.
      cardsDevice: createRateLimiter({
        burst: 1,
        refillMs: MIN_FETCH_GAP_MS,
        perDay: intEnv(env, 'RATE_LIMIT_PER_DAY', 60),
      }),
      cardsIp: createRateLimiter({ burst: 6, refillMs: 10 * SECOND, perDay: 600 }),
      flagDevice: createRateLimiter({ burst: 5, refillMs: MINUTE, perDay: 100 }),
      flagIp: createRateLimiter({ burst: 20, refillMs: 15 * SECOND }),
    },
    rng: Math.random,
    now: Date.now,
    log: logLine,
  });
}

let shared: Handlers | null = null;

/** One set of handlers (and rate-limit state) per server process. */
export function getHandlers(): Handlers {
  shared ??= handlersFromEnv();
  return shared;
}
