import type { Card } from '../types';

export function withoutCard(missed: Card[], id: string): Card[] {
  return missed.filter((c) => c.id !== id);
}
