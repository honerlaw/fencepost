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
- [reviewed — clean] completion verification: Verifier reproduced criteria 1, 2, 4-7 and read criterion 3 from the built binary; criterion 8 re-measurement not repeated by the Verifier, rests on the author's before/after hash, later corroborated by the code reviewer's local hash (tier: reviewer floor)
- [solo] review triage: 8 FIX / 2 SUGGEST / 0 IGNORE (tier: default-solo row — no item had two defensible dispositions; independent findings from the local-diff code review)
- [panel — 3/3 accept, 3 with fixes] replan-vs-FIX: Expo GitHub link is org-to-org only and honerlaw/fencepost is a personal repo; FIX, owner chooses the move at the push point; option (c) would need a replan (tier: panel — floor, core-assumption finding)
    - fix (arbiter): "stands under every resolution" reworded to (a) and (b); (c) changes the trigger and needs a replan
    - fix (arbiter): runbook step 4 starts by confirming the account types; ownership is an explicit gate
    - fix (arbiter): trigger stated unverified until the first post-setup merge, named as the end-to-end test
    - fix (arbiter): (b) marked unverified in the docs; (a)'s side effects listed
    - fix (arbiter): the wrong assumption recorded as a knowledge constraint at promote

## Review triage 2026-10-31
Code review ran in local-diff mode (fresh-context subagent; no PR exists yet).
1. FIX critical NOTES runbook step 4: repo link impossible as written. Panel: FIX, owner decides.
2. FIX medium deploy-ios.yml: queued runs could publish updates out of order. Added `concurrency` per docs.
3. FIX medium NOTES: merge between steps 4 and 6 strands the first upload. Warning added.
4. FIX medium NOTES: rebuild triggers wrong. Measured: scripts, .gitignore and origin change the hash; version doesn't.
5. FIX low NOTES: `submit --latest` could pick the simulator build. Now `--id`.
6. FIX low deploy-ios.yml: comment overpromised. Reworded for the concurrency setup.
7. FIX low NOTES item 5: stale "untested" status updated with build 8cd5fd36.
8. FIX: panel fixes above.
9. SUGGEST low AGENTS.md: names a `development` profile that doesn't exist, and says all secrets live in Doppler. Guarded path; left for the owner.
10. SUGGEST low: no CI check validates `.eas/` or `eas.json`. Standing fact for the guardrail-limits record.

## Work notes
- cwd slip early in the run landed in another session's worktree; nothing there was touched.
- EAS simulator build took about 8 minutes; the build reports channel simulator via update:configure.
