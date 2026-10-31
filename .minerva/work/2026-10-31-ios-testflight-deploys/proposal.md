# Proposal: ios-testflight-deploys

**Date**: 2026-10-31
**Status**: Draft

## Goal

After a one-time owner setup, each merge to `main` delivers the app to the owner's iPhone with no further step on the normal path: a new TestFlight build when native code changed, an over-the-air update otherwise.

"Delivers" means: a TestFlight build becomes available to the internal group (TestFlight installs it, or auto-update does). An OTA update downloads on app launch and applies on the following launch. Failure paths need a person; see the runbook.

## Why

The request, verbatim:

> "There is another PR that should merge shortly around guardrails, can build on top of that to go ahead and implement expo deployments on merge to main so we can start testing in testflight / on my physical device"

The app has only ever run in Expo Go on a simulator and on the web. No native build has ever been compiled (`eas.json` does not exist, EAS has zero builds) and CI has no native compile. The owner wants to test on a physical device.

### Facts established

- Guardrails PR #3 is merged. `origin/main` is 47cc990. Local `main` is stale, so branch from `origin/main`.
- Expo SDK 58, RN 0.88. EAS project `@onerlawllc/fencepost` exists; projectId and owner are in `app.json`; eas-cli 27.2.0 is logged in as an owner. `ios.bundleIdentifier` is set; `android.package` is NOT set.
- EAS `sdk-58` macOS image is Xcode 27.1 RC, above SDK 58's 26.4 floor (infrastructure docs). `auto` is the default image and picks the SDK's image. The SDK 58 Ubuntu image has Node 22.23.2; no production dependency declares a Node floor above 22.
- `get-build` with `wait_for_in_progress: true` is documented: it prefers a successful build, waits for an in-progress one, and returns empty outputs if that build fails. `testflight` with only `build_id` is documented. Groups are optional; a group with automatic distribution receives builds without being named.
- No GitHub Actions secrets or variables exist. Doppler `fencepost/prd` holds only OPENROUTER_API_KEY, CARD_MODEL, CARD_MODEL_FALLBACK.
- `.github/` and `AGENTS.md` are guarded paths: a PR touching them needs the `guardrails-approved` label, which only a person adds. `package.json`, `app.json`, `eas.json`, `.eas/`, `NOTES.md` are not guarded. `knip.json` already ignores `expo-updates`.
- `https://fencepost.fly.dev/api/health` does not answer: the card server is NOT deployed. The owner has said never to run Fly commands; Fly remains a user-run step in NOTES.md. App `origin` in `app.json` points at that host, so a release build shows the bundled starter deck, and generated cards fail until the server exists.
- Apple work (signing credentials, App Store Connect API key, app record) needs the owner's Apple login and cannot be done by the agent.
- Owner memory: each git push needs the owner's own yes.

## Approach

1. `npx expo install expo-updates`.
2. `eas.json`: `cli.appVersionSource: remote`; `build.production`: `channel: production`, `autoIncrement: true`, default `auto` image; `build.simulator`: `ios.simulator: true`; `submit.production: {}`. No Node pin: the SDK 58 image's Node 22 runs the install.
3. `app.json`: `runtimeVersion: { policy: "fingerprint" }`, `updates.url: https://u.expo.dev/<projectId>`, `ios.config.usesNonExemptEncryption: false`.
4. `.eas/workflows/deploy-ios.yml` as above.
5. Run `eas build --platform ios --profile simulator --non-interactive` from the worktree. This uploads the working copy to EAS and uses one build from the account's quota. Install the result on a local simulator and launch it. Fix what it surfaces.
6. Check that adding `ascAppId` to `eas.json` leaves the iOS fingerprint unchanged (`eas fingerprint:generate` or `npx @expo/fingerprint`, before and after), and record the answer in the runbook.
7. NOTES.md "Deploying to TestFlight" runbook, in order:
   1. Merge this PR. Nothing runs, because the repo isn't linked.
   2. Confirm a paid Apple Developer membership, then `npx eas-cli@latest credentials --platform ios`: production profile, signing, and the App Store Connect API key.
   3. Create the app record in App Store Connect, and put its Apple ID in `eas.json` as `submit.production.ios.ascAppId` on a small PR.
   4. Install the Expo GitHub App and link the repo to the Expo project.
   5. Create an internal TestFlight group with automatic distribution, add yourself, and install TestFlight.
   6. Merge the `ascAppId` PR: that push is the first real deploy.
   7. On the first build, check the router `origin` and SQLite storage.
   Plus: check the expo.dev run after the first deploy and after any native change; what forces a new build (native dependency bumps and `app.json` edits change the fingerprint, each costing one build from the plan quota, visible on the account usage page); which path a run took and where to look, how OTA reaches a device (launch twice), rollback (`eas update:republish`), the stuck-build symptom and fix, TestFlight's 90-day expiry with a manual rebuild, and that `workflow:run` and `eas fingerprint` exist for checking. Update the existing NOTES.md items that say `eas.json` doesn't exist, and state that generated cards need the Fly server.

The merge of this PR is safe: until the repo is linked nothing runs, and a failing EAS run stays on expo.dev without touching `ci-required`. A failing first deploy is possible and costs a retry.

### Scope

One work unit, one PR, unphased. iOS only.

In: `eas.json`, `.eas/workflows/deploy-ios.yml`, `expo-updates` dependency, `app.json` update/runtime/encryption config, NOTES.md runbook, a pre-merge EAS simulator build as verification.

Out:
- Android (no package id, no Play account known, the user named TestFlight).
- Deploying the card server; Fly stays user-run. The final report says plainly that device testing covers the starter deck and native config only until then.
- EAS Hosting as a Fly replacement (see Approach).
- `expo-dev-client`: TestFlight satisfies "physical device".
- Any change to `.github/` or `AGENTS.md`.

The knowledge constraint `2026-10-29-constraint-sdk-58-ios-dev-build-needs-xcode-26-4` says a change adding a native module Expo Go doesn't bundle needs a dev build to verify it, or an explicit re-waiver. This unit does not waive it. It satisfies it with a cloud simulator build (Release configuration, `ios.simulator: true`, no Apple credentials needed) on the branch before merge, which is also the app's first native compile. The constraint's follow-up (re-check router `origin` and SQLite storage on the first build) goes in the runbook for the first TestFlight build, because the origin host doesn't exist yet.

### Candidates considered

Criteria: (1) no EAS/CI token and no new GitHub secret; (2) bounded build spend; (3) fast delivery to device; (4) a deployment-config PR needs no extra machinery; (5) only merged code deploys (merged means passed `ci-required` on the PR through the `main` ruleset, not that `main`'s own CI run has finished).

**A (recommended). EAS Workflow, fingerprint-gated.** `.eas/workflows/deploy-ios.yml`, on push to `main`, adapted from Expo's "Deploy to production" example, iOS only, with no `internal_groups` so an automatic-distribution group receives builds:
`fingerprint` -> `get-build` (platform ios, profile production, fingerprint hash, `wait_for_in_progress: true`) -> if no build: `build` (ios, production) -> `testflight` (build_id) | if build exists: `update` (branch production, platform ios). Triggered by the Expo GitHub App linked to the repo, so no token exists anywhere. Requires `expo-updates` with `runtimeVersion: { policy: fingerprint }` and `updates.url`, and `channel: production` in `eas.json`.

**B. GitHub Actions.** A new workflow gated on CI success via `workflow_run`, with an `EXPO_TOKEN` secret, running `eas build --auto-submit --non-interactive`. Gates deploy on main's CI run, but adds a GitHub secret (outside Doppler unless a sync is set up), touches `.github/` (needs the label), and adds a privileged workflow to a public repo.

**C. EAS Workflow, full build every merge.** Docs' `submit-ios.yml`: `build` -> `testflight` on each push. No `expo-updates`, simplest config. Each merge costs a build from a limited monthly quota and 30+ minutes to reach the device. A `paths` filter variant is cheaper but guesses at what fingerprints measure.

Why A over C: JS-only merges reach the device in minutes for free. Native merges still get a build. Cost: one new native dependency, verified by the pre-merge simulator build.

EAS Hosting (`deploy` job) was considered as a way to also get a server, and rejected for this unit: the server relies on in-memory per-machine rate limits (knowledge: card-server-rate-limits-are-per-machine), the OpenRouter key would have to live in EAS rather than Doppler, and the user asked about app delivery.

**Accepted trade-offs, stated rather than scored as wins:**
- `.eas/` and `eas.json` are deployment config outside `.github/guardrail-paths.txt`, so an unlabelled PR can change what ships. The unit leaves this as is: adding them means editing a guarded file, which needs the owner's label on this PR. It holds no secret and only reaches the owner's own TestFlight group. Recorded in a knowledge entry and the final report, with the one-line fix.
- Apple signing credentials and the App Store Connect API key live on EAS, not Doppler. EAS must hold them to sign and submit, under any option here. This is an exception to AGENTS.md's "all secrets live in Doppler": no value enters the repo, a command line or a GitHub secret. Recorded in a knowledge entry and the final report.
- Deploy does not wait for `main`'s own CI run. It relies on `ci-required` on the PR via the ruleset. There is one channel and no staging; rollback is `eas update:republish`.
- `get-build` matches a build whether or not it reached TestFlight. If `testflight` fails, the workflow run is red on expo.dev, but later JS-only merges take the OTA path and no new binary appears. Pre-packaged jobs offer no filter for this, so the runbook gives the symptom and the fix (`eas submit -p ios --latest`, or a re-run from failed jobs).


## Success criteria

1. `eas workflow:validate .eas/workflows/deploy-ios.yml` exits 0.
2. `eas config --platform ios --profile production --non-interactive` resolves with `channel: production` and `autoIncrement: true`, and `eas.json` has `cli.appVersionSource: remote`.
3. A throwaway `expo prebuild --platform ios --no-install` output has `EXUpdatesURL` set to `https://u.expo.dev/2d512298-ea90-4d66-bec3-ff6b9ad8d318` and a set `EXUpdatesRuntimeVersion` in `Expo.plist`, and `ITSAppUsesNonExemptEncryption` false in `Info.plist`. Nothing generated is committed.
4. Every blocking CI command that can run locally passes on the branch (tsc both projects, eslint, prettier, knip, depcruise, jscpd, type-coverage, check-suppressions, check-pins, offline `expo install --check --json`, lockfile-lint, vitest with coverage, web + native export, check-bundle-secrets).
5. The diff touches no path in `.github/guardrail-paths.txt`.
6. NOTES.md has the runbook above, and states that generated cards need the Fly server.
7. An EAS iOS simulator build of the branch finishes successfully, and the built app launches on a local simulator to the starter deck. If the local runtime (iOS 26.3) refuses the binary, inspect `minos` in the built binary and record why instead; the build result alone then stands.
8. The effect of `ascAppId` on the iOS fingerprint has been measured and the runbook reflects the result.

This unit delivers deploy-ready config and a verified native compile; the first real delivery is the merge of the `ascAppId` PR. `dependency-review` runs only in CI. Not verifiable by this unit, and stated in the final report: a device-signed build, a TestFlight upload, or an OTA delivery. These need the owner's Apple login and repo link first.

## Open Questions

- None block the work. The owner supplies `ascAppId` after creating the app record, in one small PR that doubles as the first deploy trigger.
</content>
