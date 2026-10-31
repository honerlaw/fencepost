const EVENTS = new Set(['start', 'card', 'ping', 'done', 'error']);

/** Narrows a parsed line to a known event shape, or null. */
export function asBatchEvent(value: unknown): { event: string } | null {
  if (typeof value !== 'object' || value === null) return null;
  const ev = (value as { event?: unknown }).event;
  return typeof ev === 'string' && EVENTS.has(ev) ? (value as { event: string }) : null;
}
