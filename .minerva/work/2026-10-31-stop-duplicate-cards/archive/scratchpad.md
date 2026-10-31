# Scratchpad: stop-duplicate-cards

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-31
- [solo] scope check: one unit, one PR, unphased (tier: solo predicate — one concern, additive, no new interface, no knowledge conflict; evidence is the file list; parallel wave)
- [reviewed — folded] approach: kept A. Skeptic surfaced starter replay outside A, an unmeasured 100-title cap whose bound ran the wrong way, the e2e assertion at `e2e/generated.spec.ts:29`, a non-discriminating criterion, and the unnamed A+ hybrid. Folded: starter replay in scope, cap stays 30, e2e update, criteria reworded, A+ named and rejected (tier: reviewer — not provably small, interface-clause doubt on `recent` and Progress.recent passed to the Skeptic, answered no; parallel wave)
- [rechecked — residual folded] approach: fold-audit accepted; item 5 partial on non-load-bearing omissions (second all-duplicate batch stops fetching, single-topic Try again). Also folded: dropped the unmeasured "small", removed the criterion that A passed only by owning the starter fix, stated skipped and flagged starters, noted `recent`'s second job
- [reviewed — clean] whole-proposal (restart): first-wave review stale because the approach fold rewrote Goal and Success criteria. First-wave findings merged into the draft first (e2e criterion, SC5 and the error-card fact, SC3/SC4 keys, SC7, small facts). Restart Skeptic accepted with no blocker. Folded as write-up: rematches as a third candidate source, deferrals stated as having no trigger, skipped and flagged starters in SC8, an e2e reload test, a single welcome branch without the non-empty-deck clause, SC9's command (tier: reviewer; parallel wave restart)
- Peer sessions not queried: no user authorization, per the in-flight check's skip clause.
- [reviewed — clean] completion verification: Verifier reproduced all 9 criteria and killed 18 of its own mutants; notes only (tier: reviewer floor; the diff changes no interface beyond what the proposal approved)
- [solo] review triage: 2 FIX / 1 SUGGEST / 1 IGNORE (tier: default-solo row — no item had two defensible dispositions under the deferral bar; the Try again dead end has a writable failure scenario and a one-line fix, so it's FIX though it predates this diff)
- [solo] replan-vs-FIX: not triggered; the dead-end fix changes no Goal, Approach or criterion
- [solo] promote partition: 1 PROMOTE (decision entry), rest DISCARD as routine; 0 TODO (tier: default-solo row)

## Review triage 2026-10-31
1. FIX (medium, pre-existing): the only rematch was withheld behind the error card, and Try again couldn't reach it. Fixed in `begin-fetch.ts`, test added and shown to fail without the fix.
2. SUGGEST (low): retitling a starter replays it for mid-deck players. Recorded in the decision entry.
3. IGNORE (low): the "no XP twice" assertions can't fail alone; the next-card assertions beside them give the protection.
4. FIX (low): the flagged-starter test passed without `flagWrong`; it now asserts the card left `missed`.

## Work notes
- `git checkout <file>` as a mutation restore wiped uncommitted work in `apply-batch-event.ts`; restored by hand. Copy to a file to restore, or commit first.

