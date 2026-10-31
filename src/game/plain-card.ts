import type { Card, PlayedCard } from './types';

/** Strips serve-time flags, leaving the card as it was generated. */
export function plainCard(card: PlayedCard): Card {
  const plain = { ...card };
  delete plain.double;
  delete plain.rematch;
  delete plain.starter;
  return plain;
}
