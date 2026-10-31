# What the first production iOS build showed

**Date**: 2026-10-31
**Type**: reference
**Theme**: deployment
**Summary**: Local EAS builds need a fresh npm ci, and eas submit creates the TestFlight group itself.
**Context**: first production build, 5a5099d8-f438-47be-9837-bb5313b8cdd4, run from the primary checkout after PR #5 merged

## Context
The first signed production build failed at "Configure expo-updates", and the same work turned up a wrong claim in [[2026-10-31-reference-deployment-limits]]. That entry's other limits still stand.

## Finding
- **A stale `node_modules` fails a local EAS build.** The CLI hashes the local install and EAS hashes a fresh one. If they differ, the build stops with "Runtime version calculated on local machine not equal to runtime version calculated during build". Here the checkout had no `expo-updates` installed, so the CLI hash was `babbc2c…` against EAS's `9d6c433…`, and the runtime version showed as the placeholder `file:fingerprint`.
- **A matching local hash isn't proof.** `eas fingerprint:compare --build-id` against the failed build passed, because both hashes came from the same stale folder. Compare against a build that succeeded.
- **The EAS CLI does create the TestFlight group.** `eas submit` defaults to `--auto-testflight-setup`. If the app has no TestFlight groups, it creates an internal group, `Team (Expo)`, with access to all builds and adds the team's admins (`ensureTestFlightGroup.js` in eas-cli 27.2.0). The earlier entry's claim was wrong. The GitHub link claim held up when rechecked against the CLI source.

## Implications
Run `npm ci` before any local `eas build`, including after a merge that changed the lockfile. Workflow builds install fresh, so this doesn't apply to them. Check `--help` for a flag as well as the command list before saying the CLI can't do something.

## Related
- [[2026-10-31-reference-deployment-limits]] — corrects its TestFlight group line
- [[2026-10-31-reference-ios-fingerprint-inputs]] — what feeds the hash
