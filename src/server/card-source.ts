import { jsonSchema, Output, streamText, zodSchema, type LanguageModel } from 'ai';

import { normalize } from '@/cards/normalize';
import { RawCardSchema } from '@/cards/schema';
import type { Card, DomainId, Rng } from '@/game/types';
import type { PlanSlot } from './plan';

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

/** Thrown when a model fails before producing a card, so the caller can try the next one. */
export class ModelFailedError extends Error {}

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
}

/**
 * The schema the model is asked to follow is the strict RawCard; validation is left to
 * `normalize`, so every element arrives in order (keeping plan slots aligned) and
 * invalid ones are counted as dropped instead of vanishing.
 */
const element = jsonSchema(() => zodSchema(RawCardSchema).jsonSchema, {
  validate: (value) => ({ success: true, value }),
});

function asText(error: unknown): string {
  return String(error);
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(asText(error));
}

export function createLiveCardSource(opts: LiveSourceOptions): CardSource {
  async function run(modelId: string, params: BatchParams, onCard: (card: Card) => void): Promise<BatchStats> {
    // Set from the onError callback.
    const stream: { failure: unknown } = { failure: null };
    const result = streamText({
      model: opts.languageModel(modelId),
      output: Output.array({ element, maxItems: params.plan.length }),
      prompt: params.prompt,
      abortSignal: params.signal,
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: 0,
      onError: ({ error }) => {
        stream.failure = error;
      },
    });
    let index = 0;
    let sent = 0;
    let dropped = 0;
    for await (const raw of result.elementStream) {
      const slot = params.plan[index++];
      const card = slot
        ? normalize(raw, { domain: params.domain, boss: slot.boss, rng: opts.rng, newId: opts.newId })
        : null;
      if (!card) {
        dropped++;
        continue;
      }
      onCard(card);
      sent++;
    }
    if (stream.failure != null && !params.signal.aborted) {
      if (sent === 0) throw new ModelFailedError(asText(stream.failure));
      throw toError(stream.failure);
    }
    // A model that answered but produced nothing playable failed too, before any card was sent.
    if (sent === 0 && !params.signal.aborted) throw new ModelFailedError(`no valid cards (${dropped} dropped)`);
    const usage = await result.usage.then(
      (u) => ({ input: u.inputTokens ?? null, output: u.outputTokens ?? null }),
      () => ({ input: null, output: null }),
    );
    return { model: modelId, sent, dropped, usage };
  }

  return {
    async getBatch(params, onCard) {
      let lastError: Error | null = null;
      for (const modelId of opts.models) {
        try {
          return await run(modelId, params, onCard);
        } catch (error) {
          // Only a failure before any card reaches the player falls through to the next model.
          if (!(error instanceof ModelFailedError) || params.signal.aborted) throw error;
          lastError = error;
        }
      }
      throw lastError ?? new Error('no model configured');
    },
  };
}
