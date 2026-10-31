# The card server deploys to Fly on merge through GitHub Actions

**Date**: 2026-10-31
**Type**: decision
**Theme**: deployment
**Summary**: Each merge runs flyctl from GitHub Actions, with an app-scoped token kept out of Doppler `prd`.
**Context**: `.github/workflows/deploy-server.yml`

## Context
The server had deploy files but no deploy path, and nothing had ever reached Fly. The iOS pipeline runs on EAS and doesn't touch the server. The owner asked for deploy on merge.

## Finding
- GitHub Actions keeps the deploy in a reviewed, pinned workflow. It needs the token and the privileged workflow that the iOS decision avoided, so the token sits in a `production` GitHub environment restricted to `main`.
- `FLY_API_TOKEN` belongs in the `prd_ci` Doppler branch config, not `prd`. Everything in `prd` is copied to the Fly app, so a token there would become a runtime secret on the server it deploys.
- The workflow passes `--ha=false` on every deploy, so the one-machine constraint can't be lost by scaling to zero and redeploying.
- There's no path filter. Every merge deploys, matching the iOS workflow, because a missed path would leave the server stale without any signal. The cost is a dropped stream and reset rate limits on each merge.
- The app sits in the `personal` Fly org because `onerlaw-llc` has overdue invoices and Fly refused the create.
- When this was written, PR #6 had merged and EAS had no `deploy-ios` run, so the iOS merge trigger had never fired.

## Implications
- Server and client deploys race, and older clients persist, so `/api/cards` has to stay compatible.
- Merging is the first production deploy, so the OpenRouter credit limit has to be in place first.
- The token expires after a year, and the failure shows only on `main`'s Actions tab.

## Related
- [[2026-10-31-decision-ios-deploys-run-on-a-fingerprint-gated-eas-workflow]] — the client pipeline, on EAS
- [[2026-10-29-constraint-card-server-rate-limits-are-per-machine]] — why `--ha=false` is passed
- [[2026-10-31-reference-deployment-limits]] — the same gaps apply to this workflow
