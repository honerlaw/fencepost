import type { Card } from '../types';

export function isCorrect(card: Card, picked: number | number[]): boolean {
  if (card.type === 'order') {
    return Array.isArray(picked) && picked.length === card.steps.length && picked.every((step, i) => step === i);
  }
  return picked === card.answer;
}
