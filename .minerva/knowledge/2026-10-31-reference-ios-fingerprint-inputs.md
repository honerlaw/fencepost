# What changes the iOS fingerprint, measured

**Date**: 2026-10-31
**Type**: reference
**Theme**: deployment
**Summary**: Scripts, `.gitignore` and `origin` edits force a build; `version` and `eas.json` edits don't.
**Context**: .minerva/work/2026-10-31-ios-testflight-deploys (see git history if the worktree has been cleaned up)

## Context
The deploy workflow takes the build path when the fingerprint is new. A build costs quota and 30+ minutes, so what moves the hash matters. These were measured with `eas fingerprint:generate -p ios` against an unchanged base.

## Finding
- **Changes the hash:** a new `package.json` script, a `.gitignore` line, the `expo-router` plugin `origin`.
- **Doesn't:** the app `version`, and `submit.production.ios.ascAppId` in `eas.json`.

## Implications
- A tooling-only PR that adds an npm script costs a production build.
- Bumping `version` alone ships as an update, so that version never reaches TestFlight without a manual build.
- Correcting the `origin` after `fly launch` takes the build path, which is what it needs.
- Local and EAS hashes matched for the simulator build. Whether the workflow's Linux `fingerprint` job matches a macOS build is unmeasured, and a mismatch would make every merge build.

## Related
- [[2026-10-31-decision-ios-deploys-run-on-a-fingerprint-gated-eas-workflow]] — the workflow that branches on this
