# Card-server rate limits live in memory per route bundle and per machine, so Fly must run one machine

**Date**: 2026-10-29
**Type**: constraint
**Theme**: card-pipeline
**Summary**: In-memory per-bundle rate limits need exactly one Fly machine: deploy with --ha=false.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
Expo bundles each `+api.ts` route separately (about 1.8 MB each). So `getHandlers()` state (token buckets, last domain per device) exists once per route bundle and per process. Fly's first `fly deploy` starts two machines for a service by default. `min_machines_running = 1` in `fly.toml` is a floor, not a cap.

## Finding
- `/api/cards` and `/api/flag` each keep their own in-memory limiters. That is fine because their limits are independent.
- `takeAll` checks every bucket before charging any, the IP bucket goes first, and each limiter keeps at most `MAX_KEYS` keys (LRU).
- `clientIp` trusts `Fly-Client-IP` only when `FLY_APP_NAME` is set, which means running on Fly, where the edge sets it. Otherwise it uses the last `X-Forwarded-For` hop.
- The only client-supplied text that reaches the prompt is up to 20 recent card titles, as handoff §8.3 specifies. Each is capped at 60 chars, with newlines stripped and double quotes turned into single quotes so a title can't close its quoting. A modified client can only affect its own batch, whose output still passes `normalize`.
- NOTES.md deploys with `fly deploy --ha=false` and recovers with `fly scale count 1` (replan entry 2).

## Implications
- Running more than one machine silently multiplies every limit. Move the limiters to Redis before scaling out.
- Off Fly, the IP limit is only as trustworthy as the nearest proxy's `X-Forwarded-For`. With no proxy in front, both the IP and the device id are client-chosen.
- Evicted LRU keys get a fresh bucket, which is the accepted cost of bounded memory.

## Related
- [[2026-10-29-pattern-ai-sdk-element-stream-drops-invalid-elements]] — the same /api/cards route
- [[2026-10-29-pattern-batch-lifecycle-invariants]] — the client paces batches to match the device limit
