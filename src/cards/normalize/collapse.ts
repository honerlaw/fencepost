/** Collapses runs of whitespace and trims. */
export function collapse(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}
