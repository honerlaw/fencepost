import { plainCard } from '../plain-card';
import type { Card, PlayedCard } from '../types';
import { MAX_MISSED } from './constants';
import { withoutCard } from './without-card';

/** Moves a card to the back of the rematch queue, dropping the oldest past the cap. */
export function toBack(missed: Card[], card: PlayedCard): Card[] {
  return [...withoutCard(missed, card.id), plainCard(card)].slice(-MAX_MISSED);
}
