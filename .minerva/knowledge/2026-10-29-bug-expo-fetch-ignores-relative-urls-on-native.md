# expo/fetch does not resolve relative URLs on native; only the global fetch is origin-wrapped

**Date**: 2026-10-29
**Type**: bug
**Theme**: expo-platform
**Summary**: Native expo/fetch needs absolute URLs; apiUrl() resolves API paths against window.location.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
The client streams `/api/cards` with the named `fetch` export from `expo/fetch`, which is the one with streamed response bodies. It called `fetch('/api/cards')`, assuming the expo-router `origin` resolves relative paths on native, as the Expo docs describe for API routes. Web e2e passed, because web uses the browser's fetch. The second code review traced the native path. In Expo Go on iOS, a raw relative `expo/fetch('/api/health')` got a 404 instead of the route's 200.

## Finding
`@expo/metro-runtime/src/location/install.native.ts` installs `window.location` from the dev-server origin (development) or `extra.router.origin` (release). It wraps **only the global `fetch`** to resolve paths that start with `/`. `expo/src/winter/fetch/fetch.ts` passes its URL straight to the native module. `src/lib/api-url.ts` now builds the absolute URL from `window.location.origin`. With that fix, `fetchBatch` streamed a full batch incrementally in Expo Go on iOS (`evidence/ios-expo-go-native-stream.txt`). Android and release builds are still unverified.

## Implications
- Every `expo/fetch` call must go through `apiUrl()`, or use the global `fetch` when streaming isn't needed.
- Web-only tests cannot catch native URL handling. A native path needs a device or simulator run.
- A wrong `origin` in app.json still breaks release builds, which NOTES.md calls out.

## Related
- [[2026-10-29-constraint-sdk-58-ios-dev-build-needs-xcode-26-4]] — the native check ran in Expo Go under this constraint
- [[2026-10-29-pattern-batch-lifecycle-invariants]] — the client fetch flow this URL feeds
