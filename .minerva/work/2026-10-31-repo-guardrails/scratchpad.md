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
- Superseded by replan.md: `expo install --check` moved from blocking to advisory. It fails whenever Expo publishes a patch (58.0.21 installed, ~58.0.22 expected), so it depends on the outside world rather than the commit, which is the rule the advisory job already follows. expo, expo-router and expo-sqlite are one patch behind; not bumped here.
- `expo-updates` is ignored in knip because its Expo plugin assumes updates are on; the app does not use them.
- TS 6 defaults `types` to none, so `scripts/` has its own tsconfig with Node types, and the app keeps React Native's globals.

## Decisions 2026-10-31 (completion and review)

- [reviewer] completion verification: Verifier `revise` (criteria 1, 2, 4; CodeQL inert; AGENTS.md wording). Treated as a success-criteria divergence.
- [panel, 0/3 accept, first vote] replan: `expo install --check` to advisory rejected by Proponent and Skeptic, both proposing the offline check. Arbiter not dispatched: quorum could not be reached, and they agreed on the revision.
- [panel, 3/3 accept, 3 with fixes] replan: blocking offline check plus advisory online check. All fixes folded into replan.md. Bump given a disposition: done in this unit.
- [solo] triage of the first code review: every confirmed finding FIX, including the low ones, because each was small. Two items need the user: Dependabot security updates are off for the repo, and the dependency graph may be off.

- [user-directed] branch protection: the user wants a repository ruleset rather than classic branch protection, and to configure it themselves. A ruleset named `main` already exists (id 26272396: default branch, no bypass, deletion and non_fast_forward). The user adds the pull_request and required_status_checks rules. Criterion 8 is met by the ruleset, verified with `gh api`. No enforce_admins choice remains: an empty bypass list binds admins too.
- [user-directed] dependency graph enabled with `PUT repos/honerlaw/fencepost/vulnerability-alerts`, which also turns on Dependabot alerts. `dependency-graph/compare` now returns 200. Dependabot security updates are still off.

## Review triage 2026-10-31

1. check-suppressions misses comments after a template literal: FIX, walks parsed tokens.
2. CodeQL cannot fail a PR: FIX, `.github/scripts/check-codeql.sh` reads the SARIF.
3. Two CI jobs ran through package.json scripts: FIX, tools called directly; more paths guarded; `typeCoverage` block removed.
4. Renames escape check-guardrail-changes: FIX, `--no-renames`.
5. "A PR cannot get past this check" is false: FIX the claim; the limit is stated in the script and the PR body.
6. `.ts` parsed as TSX: FIX, script kind by extension.
7. Dependabot npm entry is inert: SUGGEST, repo setting, asked at the end gate.
8. Dependency graph may be off: verified on the PR's first run.
9. Advisory job never shows red: FIX, steps use `if: !cancelled()`.
10. Concurrency cancels queued push runs: FIX, groups by PR number or SHA.
11. Semgrep child_process and model-call gaps: FIX.
12. `const { env } = process` passes the ban: FIX.
13. Bundle regex too narrow: FIX.
14. Lint hook root: FIX, root comes from the edited file.
15. check-guardrail-changes failed open on an unknown base (from the Verifier): FIX, `ls-tree` throws.
