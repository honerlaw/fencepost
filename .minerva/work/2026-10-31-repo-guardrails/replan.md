# Replans: repo-guardrails

## 2026-10-31: split `expo install --check` into a blocking offline check and an advisory online check

### Original plan
Layer 3 lists `expo install --check` with the other standalone quality tools, and CI's `quality` job runs it as a blocking gate. Criterion 1 requires `npm run guard` to run every local check in Layers 1-3.

### What changed
The first full guard run failed on this check with no change to the commit: expo 58.0.21 (expected ~58.0.22), expo-router 58.0.28 (expected ~58.0.29), expo-sqlite 58.0.14 (expected ~58.0.15). The online check compares installed versions with what Expo publishes today, so any release that moves a package this repo uses would turn every open PR red. A first draft moved it to advisory and accepted the loss of a blocking check. The panel rejected that: with `EXPO_OFFLINE=1` the CLI reads `expo/bundledNativeModules.json` from the installed `expo` package, which the lockfile fixes, so the result depends only on the commit.

No CI job compiles native code, so this is the only blocking gate that catches a wrong version of a direct dependency in the bundled map (22 of 69 direct dependencies, including react, react-native, reanimated, gesture-handler, expo-router and expo-sqlite).

### New plan
- Blocking: `expo install --check --json` with `EXPO_OFFLINE=1`, in the `quality` job and in `scripts/guardrails/run-guard.ts`. `--json` exits before the interactive fix prompt. The env is scoped per check, so no other command runs with network requests disabled. Its "unreliable in offline-mode" line is expected: the bundled map is the older, fixed source, which is the point.
- Advisory: the online form stays in the `advisory` job with expo-doctor, and runs weekly as well.
- Criterion 1 stands as written. Only the mode that runs in `guard` changes.
- `check-pins` fails if `expo.install.exclude` is set in package.json, since that would hide packages from the check and package.json is not a guarded path.
- expo, expo-router and expo-sqlite are bumped to the current patches in this unit, so the online check starts green.
- A Dependabot security update, or any hand edit, that moves `expo` or one mapped package alone can fail the blocking check and need `npx expo install --fix`. This is intended, and npm version-update PRs are off.

### Remaining limits
- The blocking check does not see recommendations Expo published after the installed map shipped, remote-only entries (`expo`, which supplies the map, plus `typescript` and `@types/react`), or remote overrides that differ without being newer (`react-native-web`). The advisory online check covers these.
- Direct dependencies outside the map and all transitive native modules go unchecked, and no CI job compiles native code, so a native compile failure can still merge. Layer 5 defines the build gate as exports.
- All advisory scans share one job, and it can start red: `npm audit` exits on high findings regardless of this change. The run still passes because of `continue-on-error`, so no failure notification is expected (not observed). The job is a report someone must choose to read. The PR body reports what the first run showed.
