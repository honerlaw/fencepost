import { DOMAIN_IDS } from '@/cards/domains';
import { pick } from '@/game/rng';
import type { DomainId, Rng } from '@/game/types';

/** One domain per batch: random from the requested ones (or all), avoiding the device's last one when there's a choice. */
export function pickDomain(requested: readonly DomainId[], previous: DomainId | undefined, rng: Rng): DomainId {
  const pool = requested.length > 0 ? requested : DOMAIN_IDS;
  const fresh = pool.filter((d) => d !== previous);
  return pick(fresh.length > 0 ? fresh : pool, rng);
}
