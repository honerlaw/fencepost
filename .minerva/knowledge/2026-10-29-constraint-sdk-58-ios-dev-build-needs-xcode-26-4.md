# Expo SDK 58 iOS development builds need Xcode 26.4+; v1 was verified in Expo Go only

**Date**: 2026-10-29
**Type**: constraint
**Theme**: expo-platform
**Summary**: SDK 58 dev builds need Xcode 26.4+; Expo Go verifies JS only, not native config.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
SDK 58's versioned docs require Xcode 26.4+. With Xcode 26.2, `npx expo run:ios` fails inside Expo's own native code: `expo-modules-jsi/.../JavaScriptObject.swift:946:36: error: sending 'slot' risks causing data races`. Every native module v1 uses is bundled in Expo Go: reanimated/worklets, gesture-handler, svg, expo-sqlite, expo-haptics, expo-crypto and expo-font. Tamagui is JS-only.

## Finding
v1's iOS check ran in Expo Go (SDK 58) on the simulator, in light and dark mode (replan entry 1 in the unit). Expo Go proves the JS bundle and the styling. It does **not** exercise config-plugin effects (expo-sqlite, expo-splash-screen, the expo-router `origin`), the custom binary, or native settings in `app.json`. Upgrading to Xcode 26.4 is the documented fix but has not been tested here. `eas.json` does not exist yet, so a cloud dev build needs `eas build:configure` and an Expo login first (NOTES.md).

## Implications
- **Standing trigger:** a change that adds a native module Expo Go doesn't bundle, or a config plugin whose effect only a native build exercises, needs a dev build to verify it, or an explicit re-waiver in a replan.
- The plugins already present (expo-router, expo-splash-screen, expo-sqlite) are covered by the open "iOS development build" item in NOTES.md.
- The first successful dev build should re-check the router `origin` and the SQLite storage.

## Related
- [[2026-10-29-bug-code-font-ligatures-break-comparison-puzzles]] — the iOS ligature fix verified in Expo Go under this constraint
