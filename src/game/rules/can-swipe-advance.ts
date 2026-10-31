// ---- Swipe and background policy ----

/** Swiping up advances only once the card is answered and the card isn't mid-scroll. */
export function canSwipeAdvance(opts: { answered: boolean; scrolling: boolean }): boolean {
  return opts.answered && !opts.scrolling;
}
