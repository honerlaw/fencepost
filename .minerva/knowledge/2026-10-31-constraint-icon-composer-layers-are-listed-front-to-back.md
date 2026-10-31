# Icon Composer bundles list layers front to back, and only a compiled PNG proves the order

**Date**: 2026-10-31
**Type**: constraint
**Theme**: expo-platform
**Summary**: Icon Composer layers list front to back; view the `xcrun actool` output, CI cannot.
**Context**: .minerva/work/2026-10-31-brand-assets (see git history if the worktree has been cleaned up)

## Context
Expo SDK 54+ accepts `ios.icon` as an Icon Composer `.icon` directory. The format is Apple-private, with no public schema, and this repo writes the bundle from a script (`scripts/brand/icon-composer.ts`) instead of the Icon Composer app. CI has no native compile, so nothing in a PR run opens the bundle.

## Finding
- The bundle that Xcode 26.2 accepts: `icon.json` with `fill: { "solid": "srgb:r,g,b,a" }` (five decimals), one group whose `layers` name SVG files under `Assets/`, `shadow: neutral 0.5`, translucency off, and the `supported-platforms` block copied from Expo's default bundle.
- **Layers are listed front to back.** The first layer draws on top. The first committed bundle listed the accent rail first, and the compiled icon showed the blue rail over the picket stem while every other surface drew the picket in front. The code reviewer caught it; no test or compile step did.
- `xcrun actool` compiled both layer orders with zero errors and zero warnings, so a clean compile says nothing about what the icon looks like.
- The check that works: a throwaway `npx expo prebuild --platform ios --no-install`, copy the bundle into `ios/fencepost/fencepost.icon`, then `xcrun actool ios/fencepost/Images.xcassets ios/fencepost/fencepost.icon --compile <tmp> --platform iphoneos --minimum-deployment-target 16.0 --target-device iphone --target-device ipad --app-icon fencepost --include-all-app-icons --output-partial-info-plist <tmp>/partial.plist`, and look at the emitted `fencepost60x60@2x.png`.

## Implications
- Any change to the bundle gets its compiled PNG viewed before merge; `scripts/brand/golden.test.ts` then pins the committed bundle to the renderer so it cannot drift afterwards.
- Local actool is Xcode 26.2 and EAS builds with Xcode 27.1, so a bundle that passes here can still fail there, visible only as a red run on expo.dev after merge. Recovery is removing `ios.icon` so the flattened PNG `icon` takes over (NOTES.md).

## Related
- [[2026-10-29-constraint-sdk-58-ios-dev-build-needs-xcode-26-4]] — Expo Go cannot verify native config either; actool is the local stand-in for a build
- [[2026-10-31-reference-guardrail-limits]] — the "no native compile in CI" gap this check covers by hand
- [[2026-10-31-decision-ios-deploys-run-on-a-fingerprint-gated-eas-workflow]] — a bundle change takes the TestFlight build path on merge
