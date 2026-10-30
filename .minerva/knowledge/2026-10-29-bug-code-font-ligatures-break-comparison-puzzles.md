# JetBrains Mono ligatures rewrote `<=` and `==` in puzzles; web and iOS need different fixes

**Date**: 2026-10-29
**Type**: bug
**Theme**: expo-platform
**Summary**: Code ligatures are disabled with CSS on web and U+2060 word joiners on iOS.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
Code lines in puzzle cards use JetBrains Mono, which draws `<=` as `≤` and `==` as one bar. That breaks puzzles that turn on comparisons and off-by-one errors.

## Finding
- **Web:** Tamagui joins a `fontVariant` array with commas, which is not valid CSS, so the browser drops it. `src/components/card/no-ligatures.web.ts` sets `fontVariantLigatures: 'none'` through `style` instead.
- **iOS (new architecture / Fabric):** `RCTFontUtils.mm` maps only the caps and number `fontVariant` values, so `no-contextual` and `no-common-ligatures` are silently ignored. Expo Go still showed `≤` and `═`. The native `codeText()` in `src/components/card/no-ligatures.ts` inserts U+2060 (word joiner) between adjacent symbol characters. That breaks the font's `calt` match without any visible change. Screen-reader labels keep the original text.
- Verified on web in Playwright and in Expo Go on iOS (`evidence/ios-expo-go-*.png`). Android is unverified.

## Implications
- Any new place that renders code must go through `codeText()` and spread `noLigatures`.
- Text containing U+2060 must not be copied into answers, ids or comparisons. Grade on indexes, never on rendered strings.
- If the font or the RN text renderer changes, re-check ligatures on each platform.

## Related
- [[2026-10-29-decision-tamagui-pinned-to-2-7-7]] — the Tamagui web style handling that drops array-valued `fontVariant`
