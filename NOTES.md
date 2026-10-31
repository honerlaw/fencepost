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
| Rate-limit state | one in-memory limiter | Each `+api.ts` route is bundled separately, so `/api/cards` and `/api/flag` each keep their own limiter state. Both are still per machine; move them to Redis before running more than one machine. The IP limit trusts `Fly-Client-IP` only when `FLY_APP_NAME` is set (on Fly); elsewhere it uses the last `X-Forwarded-For` hop, which a client can forge if no proxy sits in front. The app starts batches at least 20 s apart (the device refill, shared as `MIN_FETCH_GAP_MS`) so normal play never hits a 429, and gives up on a batch still open after 100 s. |
| `expo/fetch` and relative URLs | `fetch('/api/cards')` | Only the global `fetch` is wrapped to resolve relative paths against the router origin; `expo/fetch` (needed for streamed bodies) passes the path straight to native, where it fails. `src/lib/api-url.ts` builds the absolute URL from `window.location`, which expo-router sets from the dev-server origin or the `origin` above. |

## Card model

`CARD_MODEL` is `anthropic/claude-sonnet-5.5` and `CARD_MODEL_FALLBACK` is `anthropic/claude-opus-5.5`, both in Doppler. They were chosen from `npm run cards:eval -- --model <id> --batches 5` on 2026-10-31, with the two runs going in parallel:

| | Sonnet 5.5 | Opus 5.5 |
|---|---|---|
| Cards kept / dropped | 25 / 0 | 25 / 0 |
| Wrong answers (checked by hand) | 0 | 0 |
| Failed batches | 0 | 0 |
| Average first card | 39.1 s | 46.3 s |
| Average batch | 45.2 s | 58.8 s |
| Slowest batch (limit 90 s) | 48.7 s | 66.7 s |
| Estimated cost per batch | $0.06 | $0.10 |

Costs are calculated from token counts and OpenRouter's list prices at the time. Accuracy matched, so Sonnet won on speed and cost. The cards were worked through by hand, not executed, and 25 clean cards per model can't rule out a low error rate.

## Not done by this run: user-run steps

These were left undone on purpose. Most need your accounts, money or hardware, or are outward-facing.

1. **Keep checking card correctness. This is the most important step.** The model is chosen (see "Card model" above), but correctness rests on 50 hand-checked cards. Spot-check generated cards during real play, and rerun `npm run cards:eval -- --model <id> --batches 5` and read every card after changing the prompt or the model. The automated tests cover only the plumbing, validation and streaming, using a mock model and a local fake OpenRouter.
2. **OpenRouter key and credit limit.** Set a hard credit limit on the key in the OpenRouter dashboard as the cost backstop.
3. **Fly.io.** Nothing was deployed. When you're ready: `fly launch --no-deploy` (accept the Dockerfile, no database) → connect the Doppler project to the Fly app under **Syncs → Fly.io** in the Doppler dashboard, which keeps the secrets in step (or copy them once with `doppler secrets download --project fencepost --config prd --no-file --format docker | grep -v '^DOPPLER_' | fly secrets import`; the `docker` format matters because `env` wraps values in quotes) → `fly deploy --ha=false` → check `https://<app>.fly.dev/api/health` → `fly logs` to watch the `{"event":"batch",...}` lines. If the app name isn't `fencepost`, update the `origin` above.
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
8. **Native streaming against the deployed server.** The client reads `/api/cards` with `expo/fetch`. Incremental reads are verified on web, the server's streaming with `curl -N` (`evidence/curl-stream.txt`), and the native read path in Expo Go on the iOS simulator against the dev server and the fake OpenRouter (`evidence/ios-expo-go-native-stream.txt`: 5 cards arriving about 1 s apart). Not verified: Android, a release build (which resolves against the `origin` above instead of the dev server), and a real network between the phone and Fly.

## Small known follow-ups

- Cards take about 40 s to start arriving, but the app only fetches more once 2 or fewer are queued (`LOW_WATER` in `src/game/fetch-policy.ts`), so players will likely reach the loading card between batches. Raising `LOW_WATER` to 3 is the cheapest first step; if that isn't enough, reduce reasoning (the code doesn't set it today) and rerun the eval.
- The Docker image is about 1.26 GB because Expo/React Native are runtime `dependencies`. A slimmer runtime stage (only `express`, `expo-server` and the export) would cut that.
