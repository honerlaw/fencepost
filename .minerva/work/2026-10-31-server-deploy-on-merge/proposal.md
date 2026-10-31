# Proposal: server-deploy-on-merge

**Date**: 2026-10-31
**Status**: Shipped (2026-10-31)

## Goal

After this unit merges, each merge to `main` deploys the card server to the Fly app `fencepost` with no manual step, and the repo's docs and knowledge describe how that works and how to recover.

## Why

The owner asked: "Do we have it setup to deploy on merge? Can we set it up to deploy on merge?" and then "you will probably need to use the flyctl command line tool or whatever to create the app and stuff though". The server has never been deployed, so generated cards fail in release builds. `app.json`'s router `origin` already points at `https://fencepost.fly.dev`.

## Approach

A new GitHub Actions workflow, `.github/workflows/deploy-server.yml`, triggers on push to `main` and on `workflow_dispatch`, the documented way to redeploy after a failure. A `deploy-server` concurrency group with no cancel-in-progress runs one deploy at a time, so superseded pending runs show as cancelled and the newest commit wins.

The job runs in the `production` GitHub environment. Its main-only deployment branch policy is what stops a workflow edited on a branch from reading the token. It has no required reviewers, so that policy is the only gate on branches, and the human-only `guardrails-approved` label is the gate on workflow changes reaching `main`.

The job installs pinned flyctl 0.4.114 through a SHA-pinned action and runs `flyctl deploy --remote-only --ha=false` with the commit SHA in the image label, so `fly releases --image` shows which commit is live. The deploy fails if the new machine doesn't pass its checks. It then fails unless `flyctl machine list --app fencepost --json | jq length` is exactly 1, counting stopped machines, and `https://fencepost.fly.dev/api/health` answers, using `curl --fail` with retries so a restart can't turn a good deploy red. That check proves the server is up, not which commit it runs. The check step names `shell: bash` so a flyctl failure can't read as a machine count. `--ha=false` doesn't shrink an existing app, so the count check detects drift, and `fly scale count 1` repairs it. No path filter.

Accepted risks:

- A failed deploy shows only on the Actions tab and in GitHub's default failure email, and the server stays on the older commit until a redeploy or the next merge.
- A single-machine deploy has brief downtime on every merge.
- Nothing reminds anyone before the token expires. The date is in `NOTES.md`, and after it every merge's deploy fails visibly on the Actions tab.
- The token is limited to this app, but it can deploy any image there, and a malicious image could read `OPENROUTER_API_KEY` from the machine. So the hard OpenRouter credit limit is a pre-merge item.

Rollback is a revert PR, or `fly deploy --image` with an earlier image from `fly releases --image`.

`NOTES.md`, `README.md` and the `fly.toml` comments describe the pipeline, including the token lifecycle. The token expires on 2027-10-31 and the owner rotates it: create the token, update Doppler `prd_ci`, update the GitHub environment secret, verify with a dispatch. Moving the app to another org needs the same check, because whether the token survives a move is unverified. The GitHub copy is a manual mirror and a documented exception to "all secrets live in Doppler", alongside the EAS signing credentials. Dependabot covers the SHA pins, and the flyctl version is bumped by hand.

A knowledge decision entry records why. It reconciles this with the iOS entry that rejected GitHub Actions: that decision stays in force for iOS and isn't superseded. Fly has no EAS-style native credential, EAS Hosting was rejected separately, and the branch policy, app scope, expiry and guarded path mitigate the token. The personal-org placement is temporary, pending the overdue invoices on `onerlaw-llc`.

`fly.toml` sets a 512 MB `shared-cpu-1x` machine, because the default 256 MB leaves little room above the server's idle memory.

Already done outside the repo at the owner's instruction: the Fly app was created in the personal org and given a shared IPv4 and an IPv6; `CARD_MODEL`, `CARD_MODEL_FALLBACK` and `OPENROUTER_API_KEY` are staged on Fly; an app-scoped deploy token is in Doppler `prd_ci` and the GitHub `production` environment secret; two build-only remote builds succeeded, one with the deploy token. Verified: the token can't list apps or read another app, it can list machines on `fencepost`, and `production` allows only branch `main`.

## Success criteria

- `.github/workflows/deploy-server.yml` triggers only on push to `main` and `workflow_dispatch`, has top-level `contents: read`, has concurrency group `deploy-server` with no cancel-in-progress, SHA-pins both actions, pins flyctl, runs in environment `production`, and runs `flyctl deploy --remote-only --ha=false`.
- The workflow fails after the deploy step unless `flyctl machine list --app fencepost --json | jq length` is exactly 1 and `/api/health` returns success, with `curl --fail` and retries.
- `actionlint` and `zizmor==1.31.1 --offline --min-severity medium` pass on `.github/workflows`.
- `.github/workflows/ci.yml` is unchanged, and no job in it depends on the deploy.
- The iOS fingerprint inputs `app.json`, `package.json` and `.gitignore` are unchanged, so this PR doesn't force a native build.
- `fly config validate` passes and `fly.toml`'s app name matches the `app.json` origin host.
- `NOTES.md` documents setup, the environment-policy check command, day-to-day, rollback, failure recovery, accepted risks, token rotation with the 2027-10-31 expiry, the org-move token check, and the secret exception, and no longer says Fly deploys are a manual user step. `README.md` matches.
- A knowledge entry records the decision and states that the iOS decision stays in force for iOS.
- `npm run guard` passes on the branch.

## Open Questions

- The first production deploy happens at merge, so the deploy, the machine check and `/api/health` can only be verified after merge. This run checks them after merge and reports the result.
- The hard OpenRouter credit limit is a pre-merge item the owner hasn't confirmed. The PR needs the `guardrails-approved` label, which only a person adds, so adding the label is the point to confirm it.
- The iOS merge trigger never fired: PR #6 produced no `deploy-ios` run. That is out of scope, because EAS CLI has no GitHub link command, so the owner has to check it on expo.dev.
