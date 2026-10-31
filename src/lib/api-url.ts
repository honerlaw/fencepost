/**
 * Absolute URL for an API path. `expo/fetch` hands its URL straight to the native module, and only
 * the global `fetch` is wrapped to resolve relative paths. So native code resolves them here, against
 * the `window.location` that expo-router installs from the dev-server origin (development) or the
 * `expo-router` plugin `origin` in app.json (release builds). Web already has a real location.
 */
export function apiUrl(
  path: string,
  origin: string | undefined = (globalThis as { location?: { origin?: string } }).location?.origin,
): string {
  return origin == null || origin === '' ? path : new URL(path, origin).toString();
}
