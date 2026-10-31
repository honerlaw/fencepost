import type { DomainId } from '@/game/types';

export interface Domain {
  id: DomainId;
  name: string;
  /** Goes into the generation prompt. */
  blurb: string;
}
