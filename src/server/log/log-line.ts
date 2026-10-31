/** One JSON object per line on stdout (Fly collects these). Never pass secrets here. */
export function logLine(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}
