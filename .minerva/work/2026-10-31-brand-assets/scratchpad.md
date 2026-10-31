# Scratchpad: brand-assets

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-31
- [reviewed — clean] scope check: one unit, one PR, unphased (tier: reviewer — multi-surface, so the solo predicate's single-surface clause failed; no panel clause; parallel wave. Skeptic accepted; noted: knip must infer the bare `tsx` script, determinism is local, masters vs geometry must be one source — all carried into the approach fold)
- [reviewed — folded] approach: option A, geometry module + Chromium renderer from `@playwright/test` (tier: reviewer — A not strictly dominant over B on tooling surface; no panel clause; parallel wave. Folded: import from `@playwright/test`; `src/theme/brand-mark.ts` is the single master and `assets/brand/*.svg` are outputs; determinism restated as same-machine idempotence with the resvg/sharp alternative weighed as A'; solid-fill `icon.json` verified with Xcode 26.2 actool at intake and a PNG fallback named; sync test placed in `src/theme/colors.test.ts`; actool runs on the real prebuild catalog with zero warnings and the emitted 60x60@2x viewed; bare npm script for knip with a stop-and-report branch. Rejected alternatives: B hand export, C config plugin, A' resvg/sharp)
- [rechecked — residual folded] approach: fold-audit accepted 9/10; item 8 partial (Xcode 26.2 local vs 27.1 on EAS) folded as a named residual risk with the remove-`ios.icon` recovery in NOTES.md; new concerns folded: the title keeps its "Fencepost" accessible name with the mark decorative, and the README table test is scoped to the palette table rows
- [reviewed — clean] whole-proposal (restart): first-wave review discarded because the approach fold rewrote `## Success criteria` and `## Goal`; re-reviewed draft v3 (tier: reviewer — no panel clause; parallel wave restart). Accepted; noted for work: measure the Android foreground against the 66% safe-zone circle instead of asserting it, name the Chromium binary prerequisite in README, confirm react-native-svg forwards `testID` on web

## Work notes 2026-10-31
- Pre-flight: no in-flight units, no open PRs or issues. The primary checkout is on `feat/deploy-server-on-merge` (another session's server-deploy work, clean tree): adjacent, not a collision. This unit branches from `main` in its own worktree.
- Intake spikes (scratchpad, not committed): actool compiles the Expo `.icon` bundle and a hand-written solid-fill bundle; two Chromium renders of the 1024 icon are byte-identical; the opaque tile has no alpha channel.
