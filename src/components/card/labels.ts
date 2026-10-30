import type { CardType } from '@/game/types';

export const TYPE_LABEL: Record<CardType, string> = {
  flaw: 'Spot the flaw',
  break: 'Break it',
  trace: 'Trace it',
  model: 'Pick the design',
  order: 'Order the steps',
};

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];
