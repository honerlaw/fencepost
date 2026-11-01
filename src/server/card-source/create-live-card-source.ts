import { jsonSchema, Output, streamText, zodSchema } from 'ai';
import { normalize } from '@/cards/normalize';
import { RawCardSchema } from '@/cards/schema';
import type { Card } from '@/game/types';
import { ModelFailedError } from './model-failed-error';
import type { BatchParams, BatchStats, CardSource, LiveSourceOptions } from './types';

/**
 * The schema the model is asked to follow is the strict RawCard; validation is left to
 * `normalize`, so every element arrives in order (keeping plan slots aligned) and
 * invalid ones are counted as dropped instead of vanishing.
 */
const element = jsonSchema(() => zodSchema(RawCardSchema).jsonSchema, {
  validate: (value) => ({ success: true, value }),
});

const asText: (error: unknown) => string = String;

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
        opts.onDrop?.(raw);
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
