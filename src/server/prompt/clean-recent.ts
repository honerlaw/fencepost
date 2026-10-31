import { MAX_RECENT, RECENT_CHARS } from './constants';

/** At most 20 titles, newlines stripped, each trimmed to 60 characters, blanks dropped. */
export function cleanRecent(recent: readonly string[]): string[] {
  return (
    recent
      .slice(-MAX_RECENT)
      // Titles sit inside "…" in the prompt, so a double quote can't close the quoting early.
      .map((t) =>
        t
          .replaceAll(/[\r\n]+/g, ' ')
          .replaceAll('"', "'")
          .replaceAll(/\s+/g, ' ')
          .trim()
          .slice(0, RECENT_CHARS)
          .trim(),
      )
      .filter((t) => t.length > 0)
  );
}
