import type { DomainId } from '@/game/types';
import type { PlanSlot } from '../plan';

export interface PromptInput {
  domain: DomainId;
  plan: readonly PlanSlot[];
  flavor: string;
  recent: readonly string[];
}
