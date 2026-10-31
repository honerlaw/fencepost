// A local stand-in for OpenRouter's chat completions endpoint, for verification only
// (never shipped: it lives outside src/ and isn't imported by the app or the server).
// It streams scripts/stub-cards.json as an OpenAI-compatible SSE completion, slowly, so
// `curl -N` against the real server shows cards arriving one by one.
//
//   STUB_PORT=8790 node scripts/stub-openrouter.mjs
//   OPENROUTER_BASE_URL=http://127.0.0.1:8790/api/v1 OPENROUTER_API_KEY=stub CARD_MODEL=stub/model node server.js
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { buffer } from 'node:stream/consumers';

const port = Number(process.env.STUB_PORT ?? 8790);
const firstDelayMs = Number(process.env.STUB_FIRST_DELAY_MS ?? 11_000);
const chunkDelayMs = Number(process.env.STUB_CHUNK_DELAY_MS ?? 30);
const cards = JSON.parse(readFileSync(new URL('stub-cards.json', import.meta.url), 'utf8'));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
    res.writeHead(404).end();
    return;
  }
  await buffer(req); // drain the request body
  const id = `stub-${Date.now()}`;
  const chunk = (delta, finish = null, extra = {}) =>
    `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'stub/model', choices: [{ index: 0, delta, finish_reason: finish }], ...extra })}\n\n`;

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  res.write(chunk({ role: 'assistant', content: '' }));
  await sleep(firstDelayMs);
  const text = JSON.stringify({ elements: cards });
  for (const piece of text.match(/[\s\S]{1,24}/g)) {
    if (res.destroyed) return;
    res.write(chunk({ content: piece }));
    await sleep(chunkDelayMs);
  }
  res.write(chunk({}, 'stop', { usage: { prompt_tokens: 1200, completion_tokens: 900, total_tokens: 2100 } }));
  res.write('data: [DONE]\n\n');
  res.end();
}).listen(port, () => console.log(JSON.stringify({ event: 'stub-listening', port })));
