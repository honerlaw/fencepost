# Scratchpad: readable-pseudocode-cards

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-31
- [reviewed — clean] scope check: one unit, one PR; Skeptic noted test and eval tightening, all folded under approach and whole-proposal (tier: reviewer — not provably small; parallel wave; interface doubt answered: normalize has two in-repo callers, no outside consumer)
- [reviewed — folded] approach: B kept; criterion 1 reworded for a denylist, gate widened and tokenised, required trace input removed, drop reasons added through onDrop, candidate F added (tier: reviewer; parallel wave)
- [rechecked — residual folded] approach: drop test and fallback test added to criterion 3; line width accepted because code blocks scroll sideways
- [reviewed — folded] whole-proposal: Overlapping card rewritten in full, consumers named, overclaim removed, prompt and input limits raised to 320, Billing and why rewrites spelled out (tier: reviewer; parallel wave; no restart, because the pick was unchanged and neither scope nor approach folds rewrote Goal or Success criteria)
- [rechecked — residual folded] whole-proposal: Billing bad_line stated, drop threshold aligned to 2 of 25, NOTES baseline of 25 kept and 0 dropped confirmed
- [panel — 3/3 accept, 3 with fixes] mid-work divergence: load-bearing, replan (tier: panel floor; criterion 1 no longer held and the free-rules assumption broke)
    - fix (skeptic, proponent, arbiter): record-keeping only; folded into replan.md (drop bar kept at 8%, timing bar not called pre-registered, Opus sample labelled, Approach item 1 updated)
- [panel — 3/3 accept, 3 with fixes] new-plan acceptance: shorten the prompt, keep the gate (tier: panel floor)
    - fix (skeptic, arbiter): "Use only ... as symbols" read as banning . [] and quotes; prompt now lists allowed forms and operators. Wording only, so the vote stands; eval rerun on the exact text
    - fix (all): timeout risk stated with numbers, per-rule timing labelled a judgment call, criterion 6 given a zero-failed-batch bar and an independent reader
- [escalated to user] batch limit: final text failed the zero-timeout bar (1 of 10 at 90 s). User chose raising to 120 s and 130 s, and chose push, PR and auto-merge. Escalation counter: 1

## Work notes
Starter cards traced by hand:
- Overlapping bookings: existing r 10 to 20, new booking s=15, e=25 overlaps; r.start <= s is true but e <= r.end is false, so the line misses it and the card lets it through. Marked line is the single bug.
- Splitting the bill: 10000 / 3 rounds down to 3333, 3 copies total 9999. 9000/3, 10000/4 and 5000/2 divide exactly. Only $100.00 split 3 ways breaks.
- Three per minute: t=0, 10, 20 each see n of 0, 1, 2 and are saved. At t=30, calls_since(user, -30) is 3, 3 > 3 is false, so the 4th call is allowed.
- Billing by the hour: 50 minutes gives round_down(0.83) = 0 hours and a fee of 0; a started hour must bill 1. Marked line is the single bug; the grace check is right.

Independent read of 55 cards from the final prompt: 0 wrong. Small problems on 11 cards: range() on a boss card (now in the gate), a list literal and `key in cache` (readable, left to the prompt), an unstated rule in "Month boundary cancel fee" that gives it two answers, a payouts order whose goal does not force one order, and six low-severity ambiguities. These are generated cards, not stored, so there is nothing to fix on disk.
