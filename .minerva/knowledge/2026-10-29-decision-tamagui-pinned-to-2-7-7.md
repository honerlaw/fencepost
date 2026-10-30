# Tamagui is pinned to 2.7.7 with @tamagui/config/v5 because 3.x renders unstyled on Expo web

**Date**: 2026-10-29
**Type**: decision
**Theme**: expo-platform
**Summary**: Tamagui pinned to 2.7.7 plus config v5; 3.1.7 never injected its CSS on web export.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
The handoff asked for the latest Tamagui with `@tamagui/config/v6`. On 2026-10-28 npm latest was tamagui 3.1.7. On the Expo SDK 58 web export, 3.1.7 put atomic class names on elements but never injected their CSS. This happened with the metro compiler on, with `disableExtraction`, and with client-only rendering alike, so cards rendered unstyled. The 3.x line also drops the `$` token prefix (`bg="board"`), and config v6 renames shorthands (`bg` becomes `background`).

## Finding
`tamagui` and `@tamagui/*` are pinned to **2.7.7**, configured with `@tamagui/config/v5`. That config is shorthands-only: `bg`, `items`, `justify`, `p`/`px`/`py`, `rounded`, `maxW`, `minH`, `self`, `text`, `select`, `z` and so on, while width and height stay longhand. Tokens use `$`. `metro.config.js` wraps `getDefaultConfig` with `withTamagui`. With the React Compiler on, 2.7.7 works on web export, in Expo Go on iOS, and with Expo Router server output. 2.7.7 has no `config/v6`.

## Implications
- Do not bump Tamagui to 3.x without re-checking that the web export ships styles. Load the exported page and confirm the cards are styled; a passing typecheck proves nothing here.
- An upgrade also means rewriting every `$token` and shorthand prop.
- Components rely on the v5 shorthand names. Mixing longhand and shorthand for the same property is a silent no-op risk.

## Related
- [[2026-10-29-decision-web-renders-after-mount]] — the other web-rendering decision taken while getting Tamagui styles right
