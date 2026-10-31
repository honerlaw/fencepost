import type { Rng } from '@/game/types';
import type { CardSource } from '../card-source';
import type { RateLimiter } from '../rate-limit';

export interface HandlerDeps {
  /** Null when OPENROUTER_API_KEY or CARD_MODEL is missing: /api/cards answers 503. */
  source: CardSource | null;
  batchSize: number;
  limits: {
    cardsDevice: RateLimiter;
    cardsIp: RateLimiter;
    flagDevice: RateLimiter;
    flagIp: RateLimiter;
  };
  /** True when running on Fly (FLY_APP_NAME is set), where Fly-Client-IP can be trusted. */
  behindFly?: boolean;
  rng: Rng;
  now: () => number;
  log: (entry: Record<string, unknown>) => void;
}

export interface Handlers {
  health: () => Promise<Response>;
  cards: (request: Request) => Promise<Response>;
  flag: (request: Request) => Promise<Response>;
}
