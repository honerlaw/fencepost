# Expo links GitHub organization repos to Expo organizations, so a personal repo can't trigger this project

**Date**: 2026-10-31
**Type**: constraint
**Theme**: deployment
**Summary**: Expo organizations link only GitHub organization repos; `honerlaw/fencepost` is personal, so deploy triggers need a move.
**Context**: .minerva/work/2026-10-31-ios-testflight-deploys (see git history if the worktree has been cleaned up)

## Context
The deploy workflow runs on `push`, which needs the Expo GitHub App linked to the repo. The proposal assumed that link was available, and three reviewers passed it. A code review caught the conflict after the work was done.

## Finding
Expo's docs say: "You can only link GitHub organization repositories to Expo organizations." `honerlaw/fencepost` is owned by a GitHub user. The EAS project sits under `onerlawllc`, which is inferred to be an Expo organization because `eas whoami` lists it beside the personal account `derek.honerlaw`. The link was not attempted. `onerlaw` is a GitHub organization the owner belongs to.

The link also needs an Expo user whose GitHub account is connected under **User settings > Connections**.

## Implications
- Until the ownership is resolved, `.eas/workflows/deploy-ios.yml` never fires, and nothing reports that.
- Moving the repo to `onerlaw` needs no code change. Moving the project to the personal account changes `owner` in `app.json`, and the docs don't confirm that a personal repo can link to a personal Expo account.
- Triggering from GitHub Actions with an `EXPO_TOKEN` changes the approach and adds a token, so it needs a replan.
- The runbook is in NOTES.md, "Deploying to TestFlight".

## Related
- [[2026-10-31-decision-ios-deploys-run-on-a-fingerprint-gated-eas-workflow]] — the workflow this blocks
