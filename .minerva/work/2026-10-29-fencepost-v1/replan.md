# Replan log: fencepost-v1

## 2026-10-29 — iOS is verified in Expo Go because a local dev build needs Xcode 26.4+

**Original plan**: Milestone 1's Tamagui gate (b) and success criterion 10 required the app to launch and render the first starter card, in light and dark mode, in an iOS simulator development build made with `npx expo run:ios`.

**What changed**: That build cannot be made here. Expo SDK 58's versioned docs state "Xcode version: 26.4+", and the only installed Xcode is 26.2 (Swift 6.2.3). `npx expo run:ios` fails with exit 65 inside Expo's own native code, not app code:

```
node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift:946:36: error: sending 'slot' risks causing data races
```

`npx expo install --check` reports "Dependencies are up to date", so this is not a version mismatch inside the project. Xcode 26.4+ is the fix the docs prescribe. It is expected to work but has not been shown to resolve this error, because upgrading Xcode is a multi-GB action on the user's machine and out of scope for an autonomous run. Every native module the app uses (reanimated/worklets, gesture-handler, react-native-svg, expo-sqlite, expo-haptics, expo-crypto, expo-font) is bundled in Expo Go, and Tamagui is JS-only. `npx expo start --ios` ran the app in Expo Go (SDK 58) on the iPhone 17 Pro iOS 26.3 simulator, and the milestone-1 themed screen rendered correctly in light and dark mode: `evidence/m1-ios-light.png`, `evidence/m1-ios-dark.png` (web export: `evidence/m1-web-light.png`, `evidence/m1-web-dark.png`).

**New plan**: Criterion 10 is **weakened** from a development build to Expo Go, because SDK 58 needs Xcode 26.4+ and this machine has 26.2.

New criterion 10 (verbatim):
> 10. The app launches in Expo Go (SDK 58) on the iOS simulator (`npx expo start --ios`) and renders the first starter card in light mode and in dark mode (`xcrun simctl ui booted appearance dark`), with screenshots saved under `.minerva/work/2026-10-29-fencepost-v1/evidence/`. (Weakened from a development build: SDK 58 needs Xcode 26.4+, and only 26.2 is installed; see replan.md.)

`proposal.md` edits:
- criterion 10 rewritten as above;
- Approach gate (b) changed to Expo Go on the iOS simulator, with the gate recorded as passed on the web export plus Expo Go, React Compiler on (the compiler-off branch was not exercised and did not need to be);
- "Not done" gains "iOS development-build compile and run";
- "Not done" drops the stale "the iOS build's pod install need network access" clause.

What Expo Go does and does not prove: it proves the JS bundle and Tamagui styling (the gate's purpose, which is catching a Tamagui failure that would force option B). It does not exercise the app's own native configuration: config-plugin effects (expo-sqlite, expo-splash-screen, the expo-router origin), the custom binary, or `app.json` native settings. That the Tamagui compiler behaves the same in a dev build is reasoned (it runs in Metro/Babel on the JS side), not tested. **Dev-build compile and run is unverified** and stays in "Not done" until a dev build actually succeeds; a later successful dev build or a later replan can retire this weakening.

NOTES.md user-run item (dev build):
- needs Xcode 26.4+ (`npx expo run:ios`);
- the exact error above, so it is not mistaken for an app regression;
- cloud alternative: `eas.json` does not exist yet. Run `bunx`/`npx eas-cli@latest build:configure` (or add a `development` profile with `"ios": { "simulator": true }`), add `expo-dev-client` if the profile sets `"developmentClient": true`, log in to an Expo account, then `npx eas-cli@latest build --profile development --platform ios`.

Standing trigger: the config plugins already present (`expo-router`, `expo-splash-screen`, `expo-sqlite`) are covered by the Not-done dev-build item and do not trip it. A later change that adds a native module Expo Go does not bundle, or a config plugin whose effect only a native build exercises, re-opens criterion 10: it then needs a dev build or an explicit re-waiver in a new replan entry. The trigger applies to later work units too; promote records it as a knowledge entry alongside the Tamagui 2.7.7 pin.

## 2026-10-29 — Completion verification: "single machine" made true for Fly, and e2e evidence must come from the final tree

**Original plan**: Criterion 12 required `fly.toml` to describe a "single machine" with a `/api/health` check. `fly.toml` sets `min_machines_running = 1` and has the comment "One machine". NOTES.md user-run step 3 said `fly launch --no-deploy` → `fly secrets set …` → `fly deploy` and claimed "Keep one machine (`fly.toml` already does)". Criterion 9 required `npm run e2e` to pass. It last passed at 23:15:02, against a `dist/client` exported at 23:14.

**What changed**: The completion Verifier returned `revise` on two criteria.

- **Criterion 12 is not met as written.** `min_machines_running` is a floor, not a cap. Fly's docs (docs.fly.io/apps/app-availability) say `fly launch` and `fly deploy` "creates and starts two Machines for process groups with services". `fly launch --no-deploy` creates no machines, so that two-machine default takes effect at the first `fly deploy`. The rate limiters are in memory and per machine (NOTES.md, "Rate-limit state"), so two machines would double every limit. The docs' fixes are `--ha=false` ("`fly deploy --ha=false` on first deploy or after scaling to zero") and `fly scale count 1` ("Scale down an app to one Machine"). No `fly.toml` key caps the machine count. This matches handoff §15 ("Keep one machine until rate limiting moves to Redis"), which treats one machine as an operations step, not a config setting.
- **Criterion 9 has no evidence for HEAD.** The last passing e2e run predates the final commit 31fbe1d, which changed `src/store/lifecycle.ts` and `src/components/feed/use-app-lifecycle.ts`. Those files drive the page-hide save that the reload scenario exercises.

**New plan**:

New criterion 12 (verbatim):
> 12. `Dockerfile`, `server.js`, `fly.toml` (`min_machines_running = 1`, `/api/health` check) exist, and NOTES.md's Fly steps keep the app on exactly one machine: `fly deploy --ha=false` on the first deploy, plus `fly scale count 1` if two machines already exist. `app.json` sets the `expo-router` plugin `origin` and `web.output: "server"`; `express` and `expo-server` are in `dependencies`.

Edits:

- NOTES.md step 3 uses `fly deploy --ha=false` and gives `fly scale count 1` as the recovery step. It notes that later `fly deploy` runs keep the current machine count, and refers to the "Rate-limit state" row instead of restating it. "(`fly.toml` already does)" is dropped.
- The `fly.toml` comment is corrected: the setting is a floor, and NOTES.md holds the deploy flags.
- README: no change. README:40 ("the same image Fly would run") and README:63 ("Deploying is a manual step (see NOTES.md)") make no machine-count claim and already defer to NOTES.md.
- All of these are documentation only. No Fly command is run (standing user directive: local development only).

Criterion 9 is clarified, not weakened, and its text is unchanged. The completion evidence is a passing `npm run e2e` (the script runs `expo export --platform web` first, and the Playwright webServers use `reuseExistingServer: false`) on the commit where the app, server, test and build-config inputs are final. Changes that touch only docs or comments (NOTES.md, README.md, `fly.toml` comments, `.minerva/`) do not require a re-run. Any later code change, including Phase 3 FIX items, re-runs it before ship.

The evidence record is a line in `scratchpad.md` with the commit SHA tested, the result (13 passed, 0 failed) and a timestamp, plus the Playwright list output saved as `evidence/e2e-<sha>.txt`.

The Verifier's optional test tightenings are not criterion changes. They go to the review triage with the code-review findings: a starter-path no-2x test, a discriminating flagWrong-recent assertion, and a marker-circle-on-the-buggy-line assertion.
