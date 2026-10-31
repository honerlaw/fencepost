import { fetch } from 'expo/fetch';

import { errorCodeForStatus } from '@/game/fetch-policy';
import type { BatchEvent } from '@/game/engine';
import { plainCard } from '@/game/plain-card';
import type { Card } from '@/game/types';
import type { FetchBatch } from '@/store/game-store';
import { apiUrl } from './api-url';
import { asBatchEvent, readNdjson } from './ndjson';

/** Streams one batch from /api/cards (see `apiUrl` for how native resolves the server). */
export const fetchBatch: FetchBatch = async (req, onEvent, signal) => {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(apiUrl('/api/cards'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
  } catch {
    return { ok: false, code: 'network' };
  }
  if (!res.ok || !res.body) return { ok: false, code: res.ok ? 'network' : errorCodeForStatus(res.status) };
  try {
    await readNdjson(res.body, (value) => {
      const ev = asBatchEvent(value);
      if (ev) onEvent(ev as BatchEvent);
    });
  } catch {
    return { ok: false, code: 'network' };
  }
  return { ok: true };
};

/** Reports a card the player says was wrong. Best effort: failures are ignored. */
export function reportCard(deviceId: string, card: Card): void {
  // Serve-time flags are the client's business, not part of the card.
  fetch(apiUrl('/api/flag'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, card: plainCard(card), reason: 'wrong' }),
  }).catch(() => {
    // Best effort: a lost report costs nothing.
  });
}
