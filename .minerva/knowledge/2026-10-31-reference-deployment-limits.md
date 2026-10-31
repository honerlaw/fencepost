# What the deploy pipeline does not catch

**Date**: 2026-10-31
**Type**: reference
**Theme**: deployment
**Summary**: Deploy config is unguarded, unvalidated in CI, and a failed upload can pass unnoticed.
**Context**: .minerva/work/2026-10-31-ios-testflight-deploys (see git history if the worktree has been cleaned up)

## Context
The deploy workflow runs on EAS, outside GitHub, so the guardrails on `main` see little of it. These are the standing limits.

## Finding
- **`.eas/` and `eas.json` aren't guarded paths.** An unlabelled PR can change what ships. Adding them means editing `.github/guardrail-paths.txt`, which needs the owner's `guardrails-approved` label.
- **CI doesn't validate deploy config.** A broken workflow or `eas.json` passes `ci-required` and fails on expo.dev after merge.
- **Deploys don't wait for `main`'s CI.** The gate is `ci-required` on the PR.
- **`get-build` can't tell whether a build reached TestFlight.** If the upload fails, later merges take the update path and no binary appears. Only the red run on expo.dev shows it.
- **A merge between linking the repo and adding `ascAppId` strands the first upload** in the same way.
- **JavaScript-only merges don't renew a TestFlight build,** which expires after 90 days.
- **AGENTS.md doesn't reflect this yet.** It names `eas build --profile development`, which doesn't exist here, and says all secrets live in Doppler. It's a guarded path, so it needs the label.

## Implications
Check the expo.dev run after the first deploy and after any native change. A green `ci-required` says nothing about whether a deploy worked. Recovery steps are in NOTES.md.

## Related
- [[2026-10-31-reference-guardrail-limits]] — the same kind of list for the PR gates
- [[2026-10-31-decision-ios-deploys-run-on-a-fingerprint-gated-eas-workflow]] — the pipeline these apply to
