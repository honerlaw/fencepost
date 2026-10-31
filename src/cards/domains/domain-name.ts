import type { DomainId } from '@/game/types';
import { DOMAINS } from './constants';

export function domainName(id: DomainId): string {
  return DOMAINS.find((d) => d.id === id)?.name ?? id;
}
