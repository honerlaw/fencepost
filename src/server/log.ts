/** A stable, non-reversible id for logs: the first 16 hex chars of SHA-256(deviceId). */
export async function hashDevice(deviceId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceId));
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** One JSON object per line on stdout (Fly collects these). Never pass secrets here. */
export function logLine(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}
