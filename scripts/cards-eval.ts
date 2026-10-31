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
import { createLiveCardSource, type CardSource } from '@/server/card-source';
import { makePlan, pickDomain, pickFlavor } from '@/server/plan';
import { buildPrompt } from '@/server/prompt';

const { env } = process;

interface Totals {
  sent: number;
  dropped: number;
  failed: number;
  ms: number[];
  firstCardMs: number[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function fail(message: string): never {
  console.error(`cards:eval: ${message}`);
  process.exit(1);
}

function isSet(value: string | undefined): value is string {
  return value != null && value !== '';
}

function printAnswers(card: Card) {
  if ('options' in card) {
    for (const [i, o] of card.options.entries())
      console.log(`     ${i === card.answer ? '✓' : ' '} ${OPTION_LETTERS[i]}. ${o}`);
  }
  if (card.type === 'order') for (const [i, s] of card.steps.entries()) console.log(`       ${i + 1}) ${s}`);
}

function printCard(card: Card, n: number) {
  const tags = [card.type, card.boss ? 'BOSS' : null].filter(Boolean).join(', ');
  console.log(`\n  ${n}. ${card.title}  [${tags}]`);
  console.log(`     ${card.prompt}`);
  if ('input' in card && isSet(card.input)) console.log(`     Input: ${card.input}`);
  if ('code' in card) {
    for (const [i, line] of card.code.entries()) {
      const mark = card.type === 'flaw' && i === card.answer ? '✗' : ' ';
      console.log(`     ${mark} ${String(i + 1).padStart(2)} | ${line}`);
    }
  }
  printAnswers(card);
  console.log(`     Why: ${card.why}`);
}

function requestedDomains(): DomainId[] {
  const domain = arg('domain');
  if (!isSet(domain)) return [];
  if (!isDomainId(domain)) fail(`unknown domain "${domain}".`);
  return [domain];
}

function readConfig() {
  const apiKey = env['OPENROUTER_API_KEY'];
  if (!isSet(apiKey))
    fail(
      'OPENROUTER_API_KEY is not set. Add it to the Doppler project fencepost (config prd) and run this through `npm run cards:eval`.',
    );
  const model = arg('model') ?? env['CARD_MODEL'];
  if (!isSet(model)) fail('pass --model <openrouter-model-id> (or set CARD_MODEL).');
  const batches = Number(arg('batches') ?? 3);
  if (!Number.isInteger(batches) || batches < 1) fail('--batches must be a positive whole number.');
  return { apiKey, model, batches, requested: requestedDomains() };
}

async function runBatch(source: CardSource, domain: DomainId, label: string, totals: Totals) {
  const plan = makePlan(5, Math.random);
  const flavor = pickFlavor(Math.random);
  console.log(
    `\n=== Batch ${label}: ${domainName(domain)} · ${flavor} · plan ${plan.map((s) => s.type + (s.boss ? '*' : '')).join(', ')}`,
  );
  const started = Date.now();
  // Set from the card callback.
  const seen: { first: number | null; n: number } = { first: null, n: 0 };
  try {
    const stats = await source.getBatch(
      {
        domain,
        plan,
        prompt: buildPrompt({ domain, plan, flavor, recent: [] }),
        signal: AbortSignal.timeout(90_000),
      },
      (card) => {
        seen.first ??= Date.now() - started;
        printCard(card, ++seen.n);
      },
    );
    const ms = Date.now() - started;
    totals.sent += stats.sent;
    totals.dropped += stats.dropped;
    totals.ms.push(ms);
    if (seen.first != null) totals.firstCardMs.push(seen.first);
    console.log(
      `\n  -> ${stats.sent} sent, ${stats.dropped} dropped, first card ${seen.first ?? '-'} ms, total ${ms} ms, tokens in/out ${stats.usage.input}/${stats.usage.output}`,
    );
  } catch (error) {
    totals.failed++;
    console.log(
      `\n  -> batch failed after ${Date.now() - started} ms: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function average(xs: number[]): number {
  return xs.length > 0 ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
}

function printTotals(model: string, totals: Totals) {
  const produced = totals.sent + totals.dropped;
  const dropRate = produced > 0 ? Math.round((100 * totals.dropped) / produced) : 0;
  console.log(
    `\n=== ${model}: ${totals.sent} cards kept, ${totals.dropped} dropped (${dropRate}% drop rate), ${totals.failed} failed batches`,
  );
  console.log(`    average first card ${average(totals.firstCardMs)} ms, average batch ${average(totals.ms)} ms`);
  console.log('    Now read every card above: a puzzle with a wrong answer is the worst bug this app can have.');
}

async function main() {
  const { apiKey, model, batches, requested } = readConfig();
  const baseURL = env['OPENROUTER_BASE_URL'];
  const openrouter = createOpenRouter({ apiKey, ...(isSet(baseURL) ? { baseURL } : {}) });
  const source = createLiveCardSource({
    models: [model],
    languageModel: (id) => openrouter.chat(id),
    maxOutputTokens: Number(env['CARD_MAX_OUTPUT_TOKENS'] ?? 16_000),
    rng: Math.random,
    newId: () => crypto.randomUUID(),
  });

  const totals: Totals = { sent: 0, dropped: 0, failed: 0, ms: [], firstCardMs: [] };
  let previous: DomainId | undefined;
  for (let b = 1; b <= batches; b++) {
    const domain = pickDomain(requested, previous, Math.random);
    previous = domain;
    await runBatch(source, domain, `${b}/${batches}`, totals);
  }
  printTotals(model, totals);
}

// tsx runs this as CommonJS, so there is no top-level await.
function start(): void {
  main().catch((error: unknown) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}

start();
