import type { LanguageModel } from 'ai';
import type { Card, DomainId, Rng } from '@/game/types';
import type { PlanSlot } from '../plan';

export interface BatchParams {
  domain: DomainId;
  plan: PlanSlot[];
  prompt: string;
  signal: AbortSignal;
}

export interface BatchStats {
  model: string;
  sent: number;
  dropped: number;
  usage: { input: number | null; output: number | null };
}

/**
 * Where batches come from. v1 generates live; a shared card bank topped up by
 * generation can replace it later without touching the handlers (handoff §11).
 */
export interface CardSource {
  getBatch(params: BatchParams, onCard: (card: Card) => void): Promise<BatchStats>;
}

export interface LiveSourceOptions {
  /** Model ids in the order to try: CARD_MODEL, then CARD_MODEL_FALLBACK. */
  models: string[];
  languageModel: (id: string) => LanguageModel;
  maxOutputTokens: number;
  rng: Rng;
  newId: () => string;
  /** Called with each element the model produced that was dropped. */
  onDrop?: (raw: unknown) => void;
}
