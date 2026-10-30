/** Reads a byte stream as newline-delimited JSON, calling onValue per parsed line. Bad lines are skipped. */
export async function readNdjson(body: ReadableStream<Uint8Array>, onValue: (value: unknown) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const emit = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onValue(JSON.parse(trimmed));
    } catch {
      // A malformed line is dropped; the rest of the batch still plays.
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf('\n');
    while (nl !== -1) {
      emit(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf('\n');
    }
  }
  emit(buffer + decoder.decode());
}

const EVENTS = new Set(['start', 'card', 'ping', 'done', 'error']);

/** Narrows a parsed line to a known event shape, or null. */
export function asBatchEvent(value: unknown): { event: string } | null {
  if (typeof value !== 'object' || value === null) return null;
  const ev = (value as { event?: unknown }).event;
  return typeof ev === 'string' && EVENTS.has(ev) ? (value as { event: string }) : null;
}
