/** Lets titles compare equal across case, punctuation and spacing. An empty key matches nothing. */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim();
}
