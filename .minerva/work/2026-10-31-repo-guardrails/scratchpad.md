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
