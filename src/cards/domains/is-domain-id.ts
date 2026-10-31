import type { DomainId } from '@/game/types';
import { DOMAIN_IDS } from './constants';

export function isDomainId(value: unknown): value is DomainId {
  return typeof value === 'string' && (DOMAIN_IDS as readonly string[]).includes(value);
}
