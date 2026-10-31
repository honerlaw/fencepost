# A throwaway Android prebuild writes `android.package` into app.json

**Date**: 2026-10-31
**Type**: pattern
**Theme**: expo-platform
**Summary**: `expo prebuild --platform android` silently adds `android.package` to app.json when it is unset.
**Context**: .minerva/work/2026-10-31-brand-assets (see git history if the worktree has been cleaned up)

## Context
`ios/` and `android/` are gitignored and generated on demand. A throwaway `npx expo prebuild --platform android --no-install` is the only local way to see what the adaptive icon and splash config produce, so it runs during verification and its output is thrown away.

## Finding
When `android.package` is unset, the Android prebuild writes one into `app.json` (here `com.derek.honerlaw.fencepost`, derived from the owner and slug) and prints only "Updated package.json | no changes". The key was committed with the brand assets and found by the minerva audit, not by the author. The deploy unit had left the package unset on purpose, because nothing ships to Android.

## Implications
- After any throwaway prebuild, read `git diff app.json` before committing; prebuild edits the tracked config, not only the ignored directories.
- The Android package id is a product decision, taken when there is an Android release, not a side effect of a verification step.

## Related
- [[2026-10-31-constraint-icon-composer-layers-are-listed-front-to-back]] — the iOS half of the same throwaway-prebuild verification
