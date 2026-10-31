import type { DomainId } from '@/game/types';

export interface CardsParams {
  deviceId: string;
  /** Known domains only; empty means all. */
  domains: DomainId[];
  recent: string[];
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
