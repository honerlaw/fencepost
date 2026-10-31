import type { Progress } from '../types';

export function newProgress(deviceId: string): Progress {
  return {
    v: 1,
    xp: 0,
    answered: 0,
    correct: 0,
    bestCombo: 0,
    streak: 0,
    lastDay: '',
    missed: [],
    recent: [],
    domains: [],
    starterDone: false,
    deviceId,
  };
}
