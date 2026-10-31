import { DOMAIN_IDS } from '@/cards/domains';
import type { DomainId } from '@/game/types';

/** Toggles one topic; choosing every topic, or none, means "All topics" (an empty list). */
export function toggleDomain(selected: DomainId[], id: DomainId): DomainId[] {
  const next = selected.includes(id) ? selected.filter((d) => d !== id) : [...selected, id];
  return next.length === DOMAIN_IDS.length ? [] : next;
}
