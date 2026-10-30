# The web build renders the app only after mount, because server-rendered styles can't match the client

**Date**: 2026-10-29
**Type**: decision
**Theme**: expo-platform
**Summary**: Web renders the feed after mount; SSR can't know color scheme or saved progress.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
The app uses `web.output: "server"`, so Expo Router server-renders the HTML. The server doesn't know the visitor's color scheme or their saved progress, which lives in localStorage. It therefore rendered the light whiteboard. React hydration does not patch mismatched inline styles, so a dark-mode visitor kept the light board.

## Finding
`src/app/_layout.tsx` renders only a plain board `View` until it is mounted on the client, and the real app after that. The mount check is `useSyncExternalStore(noSubscribe, () => true, () => false)`. The React Compiler lint rules forbid `setState` in an effect, which rules out the usual `useEffect` + `useState` mount flag. Persisted state is read only on the client.

## Implications
- Server-rendered HTML for `/` is an empty board. There is no SEO or first-paint content, which is accepted for a game feed.
- Anything that depends on the color scheme or on stored progress must not render on the server.

## Related
- [[2026-10-29-decision-tamagui-pinned-to-2-7-7]] — found while debugging Tamagui web styling
