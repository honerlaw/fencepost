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
