import type { DomainId, Rng } from '@/game/types';

export interface NormalizeOptions {
  domain: DomainId;
  boss: boolean;
  rng: Rng;
  /** Creates ids for generated cards. */
  newId: () => string;
  /** Fixed id (starter cards), overriding `newId`. */
  id?: string;
}
