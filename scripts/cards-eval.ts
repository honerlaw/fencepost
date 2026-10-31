// Card eval (handoff §13): calls the generation function directly against a real model,
// prints every card readably, and reports drop rate and latency. Use it to choose
// CARD_MODEL and to check prompt changes, and read the cards yourself.
//
//   npm run cards:eval -- --model <openrouter-model-id> --batches 5 [--domain cache]
//   (the npm script gets OPENROUTER_API_KEY from Doppler: project fencepost, config prd)
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { domainName, isDomainId } from '@/cards/domains';
import { OPTION_LETTERS } from '@/components/card/labels';
import type { Card, DomainId } from '@/game/types';
import { createLiveCardSource } from '@/server/card-source';
import { makePlan, pickDomain, pickFlavor } from '@/server/plan';
import { buildPrompt } from '@/server/prompt';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function fail(message: string): never {
  console.error(`cards:eval: ${message}`);
  process.exit(1);
  // React Native's typings don't mark process.exit as `never`.
  throw new Error(message);
}

function printCard(card: Card, n: number) {
  const tags = [card.type, card.boss ? 'BOSS' : null].filter(Boolean).join(', ');
  console.log(`\n  ${n}. ${card.title}  [${tags}]`);
  console.log(`     ${card.prompt}`);
  if ('input' in card && card.input) console.log(`     Input: ${card.input}`);
  if ('code' in card) {
    for (const [i, line] of card.code.entries()) {
      const mark = card.type === 'flaw' && i === card.answer ? '✗' : ' ';
      console.log(`     ${mark} ${String(i + 1).padStart(2)} | ${line}`);
    }
  }
  if ('options' in card)
    for (const [i, o] of card.options.entries()) console.log(`     ${i === card.answer ? '✓' : ' '} ${OPTION_LETTERS[i]}. ${o}`);
  if (card.type === 'order') for (const [i, s] of card.steps.entries()) console.log(`       ${i + 1}) ${s}`);
  console.log(`     Why: ${card.why}`);
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    fail(
      'OPENROUTER_API_KEY is not set. Add it to the Doppler project fencepost (config prd) and run this through `npm run cards:eval`.',
    );
  const model = arg('model') ?? process.env.CARD_MODEL;
  if (!model) fail('pass --model <openrouter-model-id> (or set CARD_MODEL).');
  const batches = Number(arg('batches') ?? 3);
  if (!Number.isInteger(batches) || batches < 1) fail('--batches must be a positive whole number.');
  const domainArg = arg('domain');
  if (domainArg && !isDomainId(domainArg)) fail(`unknown domain "${domainArg}".`);
  const requested: DomainId[] = domainArg && isDomainId(domainArg) ? [domainArg] : [];

  const openrouter = createOpenRouter({
    apiKey,
    ...(process.env.OPENROUTER_BASE_URL ? { baseURL: process.env.OPENROUTER_BASE_URL } : {}),
  });
  const source = createLiveCardSource({
    models: [model],
    languageModel: (id) => openrouter.chat(id),
    maxOutputTokens: Number(process.env.CARD_MAX_OUTPUT_TOKENS ?? 16_000),
    rng: Math.random,
    newId: () => crypto.randomUUID(),
  });

  let previous: DomainId | undefined;
  const totals = { sent: 0, dropped: 0, failed: 0, ms: [] as number[], firstCardMs: [] as number[] };
  for (let b = 1; b <= batches; b++) {
    const domain = pickDomain(requested, previous, Math.random);
    previous = domain;
    const plan = makePlan(5, Math.random);
    const flavor = pickFlavor(Math.random);
    console.log(
      `\n=== Batch ${b}/${batches}: ${domainName(domain)} · ${flavor} · plan ${plan.map((s) => s.type + (s.boss ? '*' : '')).join(', ')}`,
    );
    const started = Date.now();
    let first: number | null = null;
    let n = 0;
    try {
      const stats = await source.getBatch(
        {
          domain,
          plan,
          prompt: buildPrompt({ domain, plan, flavor, recent: [] }),
          signal: AbortSignal.timeout(90_000),
        },
        (card) => {
          first ??= Date.now() - started;
          printCard(card, ++n);
        },
      );
      const ms = Date.now() - started;
      totals.sent += stats.sent;
      totals.dropped += stats.dropped;
      totals.ms.push(ms);
      if (first != null) totals.firstCardMs.push(first);
      console.log(
        `\n  -> ${stats.sent} sent, ${stats.dropped} dropped, first card ${first ?? '-'} ms, total ${ms} ms, tokens in/out ${stats.usage.input}/${stats.usage.output}`,
      );
    } catch (error) {
      totals.failed++;
      console.log(
        `\n  -> batch failed after ${Date.now() - started} ms: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const avg = (xs: number[]) => (xs.length > 0 ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const produced = totals.sent + totals.dropped;
  console.log(
    `\n=== ${model}: ${totals.sent} cards kept, ${totals.dropped} dropped (${produced ? Math.round((100 * totals.dropped) / produced) : 0}% drop rate), ${totals.failed} failed batches`,
  );
  console.log(`    average first card ${avg(totals.firstCardMs)} ms, average batch ${avg(totals.ms)} ms`);
  console.log('    Now read every card above: a puzzle with a wrong answer is the worst bug this app can have.');
}

void main();
