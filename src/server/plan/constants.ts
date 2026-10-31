import type { CardType } from '@/game/types';

export const TYPE_WEIGHTS: Record<CardType, number> = { flaw: 30, break: 25, trace: 15, model: 15, order: 15 };

export const BOSS_CHANCE = 0.18;

export const FLAVORS = [
  'a Friday dinner rush',
  'a holiday weekend',
  'the night the clocks change',
  'a flash sale',
  'the last day of the month',
  'a launch in a new city',
  'a flaky mobile network',
  'a customer who taps twice',
  'a server restart mid-request',
  'a leap day',
  'a VIP customer',
  'a completely full house',
  'two data centers',
  'a slow downstream service',
] as const;
