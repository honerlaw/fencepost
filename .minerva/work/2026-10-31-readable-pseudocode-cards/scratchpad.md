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
