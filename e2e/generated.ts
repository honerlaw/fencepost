/** Cards in the server's (normalized) wire format, for page.route stubs. */
export const GENERATED = [
  {
    id: 'gen-1',
    type: 'flaw',
    domain: 'cache',
    title: 'Stale after expiry',
    prompt: 'get() should treat an entry as missing once its TTL has passed. Tap the wrong line.',
    why: 'An entry that expires exactly now is already stale; the check must be expires_at <= now.',
    boss: false,
    code: ['def get(cache, key, now):', '  e = cache.get(key)', '  if e is None:', '    return None', '  if e.expires_at < now:', '    return None', '  return e.value'],
    answer: 4,
  },
  {
    id: 'gen-2',
    type: 'model',
    domain: 'cache',
    title: 'Thundering herd',
    prompt: 'A hot key expires and 500 requests miss at once. What keeps the database calm?',
    why: 'Letting one request rebuild while others wait or serve stale stops 500 identical queries.',
    boss: false,
    options: ['Shorter TTLs on hot keys', 'A per-key rebuild lock', 'A bigger cache', 'Retrying misses after a delay'],
    answer: 1,
  },
  {
    id: 'gen-3',
    type: 'model',
    domain: 'cache',
    title: 'Evicting the right key',
    prompt: 'The cache is full and must drop one entry. Which policy keeps the hottest keys?',
    why: 'LRU drops the entry unused for longest, which keeps recently used keys.',
    boss: false,
    options: ['Least recently used', 'Random eviction', 'Largest entry first', 'Newest entry first'],
    answer: 0,
  },
];

export function ndjson(cards: unknown[], domain = 'cache'): string {
  const lines = [{ event: 'start', domain, count: cards.length }, ...cards.map((card) => ({ event: 'card', card })), { event: 'done', sent: cards.length }];
  return lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
}
