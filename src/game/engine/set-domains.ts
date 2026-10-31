import type { DomainId } from '../types';
import type { GameState } from './types';

export function setDomains(state: GameState, domains: DomainId[]): GameState {
  return { ...state, progress: { ...state.progress, domains } };
}
