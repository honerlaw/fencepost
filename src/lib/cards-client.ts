import { fetch } from 'expo/fetch';

import { errorCodeForStatus } from '@/game/fetch-policy';
import type { BatchEvent } from '@/game/engine';
import type { Card, PlayedCard } from '@/game/types';
import type { FetchBatch } from '@/store/game-store';
import { asBatchEvent, readNdjson } from './ndjson';

/** Streams one batch from /api/cards. Relative URLs resolve via the expo-router `origin` on native. */
export const fetchBatch: FetchBatch = async (req, onEvent, signal) => {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch('/api/cards', {
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
  const { double: _double, rematch: _rematch, starter: _starter, ...plain } = card as PlayedCard;
  fetch('/api/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, card: plain }),
  }).catch(() => {});
}
