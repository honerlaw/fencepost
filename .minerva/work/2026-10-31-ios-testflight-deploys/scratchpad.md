# Scratchpad: ios-testflight-deploys

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Decisions 2026-10-31
- [reviewed — folded] scope check: one unit, one PR, iOS only; constraint xcode-26-4 satisfied by a pre-merge EAS simulator build instead of waived; ASC key and link order added to runbook (tier: reviewer — multi-surface, new deploy contract; parallel wave)
- [rechecked — residual folded] scope check: items addressed; local-simulator launch concern ruled out by fact (iOS 26.3 runtime installed; launch keys on deployment target), fallback added to criterion 7
- [reviewed — folded] approach: option A, fingerprint-gated EAS Workflow; rejected B (GitHub Actions + EXPO_TOKEN) and C (full build each merge); guardrail-path gap, Apple creds outside Doppler and get-build skip recorded as accepted trade-offs (tier: reviewer — new deploy surface; parallel wave)
- [rechecked — residual folded] approach: items 3, 4, 7 partial with non-load-bearing residuals; runbook gained rebuild triggers and quota note; dependency-review named as CI-only
- [reviewed — clean] whole-proposal (restart): stale because the scope fold added success criteria 7 and 8; re-reviewed v2, wording and runbook notes only (tier: reviewer; parallel wave restart)
