import { BACKGROUND_CANCEL_MS } from './constants';

/** Cancel an in-flight batch once the app has been in the background for over a minute. */
export function shouldCancelInBackground(backgroundedAt: number | null, now: number): boolean {
  return backgroundedAt != null && now - backgroundedAt > BACKGROUND_CANCEL_MS;
}
