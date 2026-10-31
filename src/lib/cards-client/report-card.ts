import { fetch } from 'expo/fetch';
import { plainCard } from '@/game/plain-card';
import type { Card } from '@/game/types';
import { apiUrl } from '../api-url';

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
