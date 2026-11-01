export type SwipeDirection = 'up' | 'left' | 'right';

export interface Score {
  points: number;
  multiplier: number;
  doubled: boolean;
}

export interface StreakUpdate {
  streak: number;
  lastDay: string;
  /** True only when a consecutive-day answer raised the streak above 1. */
  increased: boolean;
}

export interface RankInfo {
  name: string;
  index: number;
  floor: number;
  /** XP needed for the next rank; null at the top. */
  next: number | null;
  /** 0..1 progress from this rank's floor to the next. */
  progress: number;
}

/** A light tap when right, a double buzz when wrong. */
export type HapticPattern = 'light' | 'double';
