/** `combo` counts this answer: the 3rd right answer in a row is combo 3. */
export function multiplierFor(combo: number): number {
  return Math.min(3, 1 + 0.5 * Math.floor(combo / 3));
}
