# The card server deploys to Fly on merge through GitHub Actions

**Date**: 2026-10-31
**Type**: decision
**Theme**: deployment
**Summary**: Each merge runs flyctl from GitHub Actions, with an app-scoped token kept out of Doppler `prd`.
**Context**: .minerva/work/2026-10-31-server-deploy-on-merge (see git history if the worktree has been cleaned up)

## Context
The server had deploy files but no deploy path, and nothing had ever reached Fly. The iOS pipeline runs on EAS and doesn't touch the server. The owner asked for deploy on merge.

## Finding
`.github/workflows/deploy-server.yml` runs `flyctl deploy --remote-only --ha=false` on each push to `main`, with the commit SHA in the image label, then checks for one machine and a healthy server. `workflow_dispatch` is the redeploy.

- An EAS job lost because `.eas/` isn't a guarded path and the EAS merge trigger had never fired. Fly's dashboard integration lost because it can't be reviewed or pinned in the repo. A job in `ci.yml` lost because it puts a deploy credential in the required workflow.
- The iOS decision rejected GitHub Actions for needing a token, a `.github/` change and a privileged workflow on a public repo. That decision stays in force for iOS. It doesn't carry over here because Fly has no EAS-style native credential and EAS Hosting was already rejected. The main-only branch policy, app scope and one-year expiry mitigate the token, and the guarded path adds an audit trail.
- `FLY_API_TOKEN` belongs in the `prd_ci` Doppler branch config, not `prd`. Everything in `prd` is copied to the Fly app, so a token there would become a runtime secret on the server it deploys. The GitHub environment secret is a manual copy and an exception to "all secrets live in Doppler".
- `--ha=false` doesn't shrink an app that already has two machines, so the workflow counts machines after deploying and fails on anything but one. It detects drift and doesn't repair it.
- There's no path filter. Every merge deploys, matching the iOS workflow, because a missed path would leave the server stale without any signal.
- `fly.toml` sets 512 MB, because the default 256 MB leaves little above the roughly 160 MB the server uses at idle. Memory under a real card batch on Fly is unmeasured.
- The app sits in the `personal` Fly org because `onerlaw-llc` has overdue invoices and Fly refused the create.
- When this was written, PR #6 had merged and EAS had no `deploy-ios` run, so the iOS merge trigger had never fired.

## Implications
- Each merge drops in-flight card streams and resets the rate limits.
- Server and client deploys race, and older clients persist, so `/api/cards` has to stay compatible.
- The token can deploy any image to the app, so it can reach `OPENROUTER_API_KEY`. The credit limit is the backstop.
- A failed deploy leaves the server behind `main`, and only the Actions tab and GitHub's failure email show it. The token expires on 2027-10-31 with no reminder.
- Whether the token survives `fly apps move` is unverified.

## Related
- [[2026-10-31-decision-ios-deploys-run-on-a-fingerprint-gated-eas-workflow]] — the client pipeline, on EAS
- [[2026-10-29-constraint-card-server-rate-limits-are-per-machine]] — why the machine count is checked
- [[2026-10-31-reference-deployment-limits]] — this workflow shares the gap that deploys don't wait for `main`'s CI
- [[2026-10-31-reference-guardrail-limits]] — why the guarded path is an audit trail, not a boundary
