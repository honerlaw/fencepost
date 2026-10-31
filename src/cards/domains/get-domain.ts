import type { DomainId } from '@/game/types';
import { DOMAINS } from './constants';
import type { Domain } from './types';

export function getDomain(id: DomainId): Domain {
  const domain = DOMAINS.find((d) => d.id === id);
  if (!domain) throw new Error(`Unknown domain: ${id}`);
  return domain;
}
