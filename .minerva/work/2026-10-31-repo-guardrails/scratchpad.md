# Scratchpad: repo-guardrails

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-31
- [reviewed — clean] scope check: one unit, one PR (tier: reviewer — parallel wave; Skeptic asked for 3 phases, dismissed: the seed says "the PR" and merges between phases are not authorized, so phases 2-3 could not ship; its risks are carried by the panel's fixes. Folded its one new point into Approach via the panel fix list: time-varying scanners stay out of the required set)
- [panel — 3/3 accept, 3 with fixes] approach: A, full strictness with no baseline, over B (ruleset baseline) and C (small subset) (tier: panel — high blast radius, repo-wide surface and a merge gate; parallel wave)
    - fix: ci-required lives in one workflow, if: always(), fails unless every needs result is success, no paths filters on required jobs
    - fix: branch protection is an explicit user-confirmed step with a documented break-glass
    - fix: reformat, autofix and manual fixes in separate commits; no `!` or `as X` to silence errors; suppression check covers them; volume fallback is a reasoned off or narrow, never a baseline
    - fix: timeouts, concurrency, cache, no retries, SHA pins; blocking vs advisory jobs stated; Stryker optional
    - fix: guardrail files protected by a marker check
    - fix: vibe-proof pinned, reviewed, optional; gitleaks binary with fetch-depth 0, dependency graph, CodeQL advanced only
    - fix: thresholds ratchet upward; overlaps stated; knowledge ids cited at derived rules
- [reviewed — folded] whole-proposal (restart): first-wave review stale because the approach fold rewrote Success criteria. Folded goal reword, disabled-rule reporting criterion, explicit user gate, expo plugin redefinition risk, dependency-review resolution, guarded lefthook prepare (.git is dockerignored), PR-only cancel-in-progress, CI-only label check (tier: reviewer — provisional on the approach blast-radius clause, which was approved; parallel wave restart)
- [rechecked — residual folded] whole-proposal: 10/11 addressed; item 10 is a non-issue (fencepost is honerlaw, plugin is onerlaw; git remote confirmed). Folded residuals: dependency-review config joins guardrail paths; criterion 2 says every exported rule rather than a count

## Notes 2026-10-31

- Baseline on main before this work: 137 tests in 14 files.
- `eslint-plugin-vibe-proof@1.10.0` is third-party. Source reviewed: MIT, no install scripts, no network, exec or eval. The only `fetch` hit is a message string. Curated rule list only.
- `expo install --dev` ran `lefthook install`, which wrote a stray `.git/hooks/prepare-commit-msg` into the shared `.git`. Removed after confirming it was lefthook's.
- `prepare` is inline and guarded because the Docker build runs `npm ci` before source is copied and `.git` is dockerignored.
- CI calls tools directly rather than through package.json scripts: `.github/` needs the label to change and package.json does not, so a script could otherwise be gutted without approval.
- Dockerfile `USER node` became `USER 1000:1000` for hadolint DL3066. hadolint's default threshold fails on info findings, so this fix was preferred to lowering the threshold.
- `.claude/settings.json` hook wiring is held back until the fork finishes, so hooks cannot fire on its in-progress edits.
- `expo install --check` moved from blocking to advisory. It fails whenever Expo publishes a patch (58.0.21 installed, ~58.0.22 expected), so it depends on the outside world rather than the commit, which is the rule the advisory job already follows. expo, expo-router and expo-sqlite are one patch behind; not bumped here.
- `expo-updates` is ignored in knip because its Expo plugin assumes updates are on; the app does not use them.
- TS 6 defaults `types` to none, so `scripts/` has its own tsconfig with Node types, and the app keeps React Native's globals.
