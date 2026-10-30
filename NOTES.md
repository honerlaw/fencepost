# Notes for whoever runs this next

## The API origin (one place)

Native builds resolve relative `fetch('/api/...')` calls against the `origin` of the `expo-router` plugin in **`app.json`**:

```json
["expo-router", { "origin": "https://fencepost.fly.dev" }]
```

`https://fencepost.fly.dev` is a guess until `fly launch` assigns the app name. If Fly gives a different hostname, change it here and rebuild the native app; a wrong value silently breaks generated cards on native, though web is unaffected. In development the dev server serves the API, so nothing needs changing.

## React Compiler

On (`experiments.reactCompiler` in `app.json`). It works with Tamagui 2.7.7 and Reanimated 4, on web and in Expo Go. Its lint rules shaped some code: shared values use `.get()`/`.set()`, there is no `Date.now()` during render (see the `useNow` hook), and there is no `setState` in effects (the web mount check uses `useSyncExternalStore`).

## Where the handoff, the docs and AGENTS.md disagreed

| Topic | Handoff said | What was done, and why |
|---|---|---|
| Route folder | root `app/` | `src/app/` (AGENTS.md wins). |
| Tamagui | latest + `@tamagui/config/v6` | **Pinned to tamagui 2.7.7 with `@tamagui/config/v5`.** tamagui 3.1.7 (npm latest at the time) put atomic class names on web elements but never injected their CSS, so the web export rendered unstyled. 3.x also drops the `$` token prefix. 2.7.7 has no v6 config. |
| Web rendering | server-rendered | The app renders after mount on web. The server can't know the color scheme or saved progress, and React hydration doesn't patch mismatched styles (dark mode kept the light board). |
| Stop after each milestone | stop and summarize | Each milestone's checks ran in sequence without stopping (autonomous run). |
| Milestone 1 / iOS check | dev build (`npx expo run:ios`) | **Verified in Expo Go instead.** Expo SDK 58 needs Xcode 26.4+, and this machine has 26.2. See "iOS development build" below and `.minerva/work/2026-10-29-fencepost-v1/replan.md`. |
| `Output.array({ element: RawCard })` | validate each element with the schema | The model still gets the strict RawCard JSON schema, but elements pass through unvalidated and `normalize` validates them. The AI SDK's `elementStream` silently drops schema-invalid elements, which would shift the boss slot and hide the drop count. |
| Express example | no compression | The Expo docs' example adds `compression()`; it is left out because it buffers the NDJSON stream (as the handoff says). |
| `/api/flag` body | `{ deviceId, card, reason }` | As specified. The client strips its own serve-time flags (`double`, `rematch`, `starter`) before sending. |
| JetBrains Mono ligatures | not mentioned | The font draws `<=` as `≤` and `==` as one bar, which breaks comparison puzzles. Web uses CSS `font-variant-ligatures: none`. On iOS the new-architecture text renderer ignores the ligature `fontVariant` values, so code lines get an invisible word joiner (U+2060) between neighbouring symbols. Screen-reader labels keep the original text. |
| Lint | — | `npx expo lint` installs ESLint 9 + `eslint-config-expo` and writes `eslint.config.js`. |
| Rate-limit state | one in-memory limiter | Each `+api.ts` route is bundled separately, so `/api/cards` and `/api/flag` each keep their own limiter state. Both are still per machine; move them to Redis before running more than one machine. |

## Not done by this run: user-run steps

These were left undone on purpose. Most need your accounts, money or hardware, or are outward-facing.

1. **Choose the model and check card correctness. This is the most important step.** Create an OpenRouter key, then run
   `OPENROUTER_API_KEY=... npm run cards:eval -- --model <id> --batches 5` for a strong reasoning model and a cheaper one. Read every card, set `CARD_MODEL` (and optionally `CARD_MODEL_FALLBACK`), and tune the prompt if needed. **Until then, the correctness of generated cards is unverified.** Only the plumbing, validation and streaming are tested, using a mock model and a local fake OpenRouter.
2. **OpenRouter key and credit limit.** Set a hard credit limit on the key in the OpenRouter dashboard as the cost backstop.
3. **Fly.io.** Nothing was deployed. When you're ready: `fly launch --no-deploy` (accept the Dockerfile, no database) → `fly secrets set OPENROUTER_API_KEY=... CARD_MODEL=... CARD_MODEL_FALLBACK=...` → `fly deploy --ha=false` → check `https://<app>.fly.dev/api/health` → `fly logs` to watch the `{"event":"batch",...}` lines. If the app name isn't `fencepost`, update the `origin` above.
   - **Run exactly one machine** until the rate limits move to Redis (see the "Rate-limit state" row above). `fly.toml` can't enforce this: `min_machines_running = 1` is a floor, and without `--ha=false` the first `fly deploy` starts two machines. Later `fly deploy` runs keep the current count, so the flag matters only on the first deploy or after scaling to zero. If two machines already exist, run `fly scale count 1`.
4. **A production native build against Fly.** Play a generated batch in a release build pointed at the deployed server.
5. **iOS development build.** This was not verified: the dev-build compile, config-plugin effects (expo-sqlite, expo-splash-screen, the router origin) and the custom binary are all untested.
   - `npx expo run:ios` needs **Xcode 26.4+** (SDK 58's requirement). With Xcode 26.2 it fails inside Expo's own native code, not app code:
     `node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift:946:36: error: sending 'slot' risks causing data races`.
     Xcode 26.4+ is the documented fix, but it hasn't been tested here.
   - The cloud alternative needs setup first because `eas.json` doesn't exist yet. Run `npx eas-cli@latest build:configure` or add a `development` profile with `"ios": { "simulator": true }`. Add `expo-dev-client` if the profile sets `"developmentClient": true`. Log in to an Expo account, then run `npx eas-cli@latest build --profile development --platform ios`.
   - From now on, adding a native module that Expo Go doesn't bundle, or a config plugin whose effect only a native build exercises, means a dev build is required to verify it.
6. **Android.** No emulator pass was done (no Android SDK on this machine).
7. **Manual simulator passes.** Airplane mode mid-batch, reduce motion, large text / Dynamic Type, native swipe feel, and physical haptic feel.
8. **Native streaming against a live server.** The client reads `/api/cards` with `expo/fetch`. Incremental reads are verified on web, and the server's streaming is verified with `curl -N` (`.minerva/work/2026-10-29-fencepost-v1/evidence/curl-stream.txt`). The native read path is only bundled and unit-tested.

## Small known follow-ups

- The Docker image is about 1.26 GB because Expo/React Native are runtime `dependencies`. A slimmer runtime stage (only `express`, `expo-server` and the export) would cut that.
