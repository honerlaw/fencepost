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

## Deploying to TestFlight

`.eas/workflows/deploy-ios.yml` runs on every push to `main`. It hashes the native side of the app. If no production build has that hash, it builds and uploads to TestFlight. If one does, it publishes an over-the-air update to the `production` branch, which only builds with that same hash download.

**Generated cards need the Fly server.** `https://fencepost.fly.dev` isn't deployed, so until step 3 of "Not done by this run" is finished, a TestFlight build shows the bundled starter deck and generated batches fail. Device testing covers native config, gestures, haptics and storage until then.

### One-time setup

Nothing runs until step 4, so these can wait until you're ready.

1. Check that you have a paid Apple Developer membership.
2. Run `npx eas-cli@latest credentials --platform ios`, choose the `production` profile, and log in to Apple. Set up the distribution certificate and provisioning profile, then **App Store Connect: Manage your API Key** > **Set up your project to use an API Key for EAS Submit**.
3. Create the app in [App Store Connect](https://appstoreconnect.apple.com/apps) with the bundle ID `com.derek.honerlaw.fencepost`. Copy its **Apple ID** from **App Information**, and open a PR that adds it to `eas.json`, but don't merge it yet:
   ```json
   "submit": { "production": { "ios": { "ascAppId": "<Apple ID>" } } }
   ```
4. Connect your GitHub user under **User settings > Connections** on expo.dev, install the Expo GitHub App, and link `honerlaw/fencepost` to the `@onerlawllc/fencepost` project: **Project settings > GitHub**.
5. In App Store Connect, go to **TestFlight** and create an internal group with automatic distribution. Add yourself, and install the TestFlight app on your phone.
6. Merge the `ascAppId` PR. That push is the first deploy, and the first real test of the trigger, which nothing has exercised yet. It takes a build plus Apple's processing, usually 30 to 45 minutes in total. Merge nothing else between steps 4 and 6, and that includes Dependabot PRs: without `ascAppId` the upload fails, and the build it leaves behind makes the next merge publish an update instead of uploading a binary.
7. On that first build, check that progress survives a restart (SQLite). Once the Fly server exists, check that a generated batch arrives, which proves the router `origin`.

Signing credentials and the App Store Connect API key live on EAS, not in Doppler, because EAS has to hold them to sign and upload. They're the one exception to "all secrets live in Doppler". None of them reach this repo or GitHub, and the workflow uses no token.

### Day to day

- **Which path a run took:** see **Workflows** on the [project page](https://expo.dev/accounts/onerlawllc/projects/fencepost/workflows). Either `Build iOS` and `Upload to TestFlight` ran, or `Publish iOS update` did. The others show as skipped.
- **Getting an update on the phone:** updates download when the app launches and apply on the next launch, so close and reopen it twice.
- **What forces a new build:** a native dependency bump, most `app.json` edits (including the `origin`), and any edit to `package.json` scripts or `.gitignore`. Each one uses a build from the plan's monthly quota (see **Usage** on expo.dev). Adding `ascAppId` doesn't change the hash, because `eas.json` isn't part of it. Bumping `version` doesn't change it either, so a merge that only bumps the version ships as an update; to get that version into TestFlight, run the manual build under "When something goes wrong".
- **Roll back an update:** `npx eas-cli@latest update:republish --branch production`, then pick the last good update.
- **Compile without signing:** `npx eas-cli@latest build --platform ios --profile simulator` needs no Apple login.

### When something goes wrong

- **A failed deploy never blocks merging.** The workflow reports on expo.dev, and `ci-required` doesn't depend on it, so check the run after the first deploy and after any native change. It also doesn't wait for `main`'s own CI run: the gate is `ci-required` on the PR.
- **The build worked but the upload failed.** This one is easy to miss: later merges find the build and publish updates, while TestFlight never gets the binary. Copy the build ID from the failed run and run `npx eas-cli@latest submit --platform ios --id <build id>` from a checkout that has `ascAppId`. Don't use `--latest`, which can pick a simulator build.
- **The build expired.** TestFlight builds last 90 days, and JavaScript-only merges don't renew them. Run `npx eas-cli@latest build --platform ios --profile production --auto-submit`.

## Not done by this run: user-run steps

These were left undone on purpose. Most need your accounts, money or hardware, or are outward-facing.

1. **Keep checking card correctness. This is the most important step.** The model is chosen (see "Card model" above), but correctness rests on 50 hand-checked cards. Spot-check generated cards during real play, and rerun `npm run cards:eval -- --model <id> --batches 5` and read every card after changing the prompt or the model. The automated tests cover only the plumbing, validation and streaming, using a mock model and a local fake OpenRouter.
2. **OpenRouter key and credit limit.** Set a hard credit limit on the key in the OpenRouter dashboard as the cost backstop.
3. **Fly.io.** Nothing was deployed. When you're ready: `fly launch --no-deploy` (accept the Dockerfile, no database) → connect the Doppler project to the Fly app under **Syncs → Fly.io** in the Doppler dashboard, which keeps the secrets in step (or copy them once with `doppler secrets download --project fencepost --config prd --no-file --format docker | grep -v '^DOPPLER_' | fly secrets import`; the `docker` format matters because `env` wraps values in quotes) → `fly deploy --ha=false` → check `https://<app>.fly.dev/api/health` → `fly logs` to watch the `{"event":"batch",...}` lines. If the app name isn't `fencepost`, update the `origin` above.
   - **Run exactly one machine** until the rate limits move to Redis (see the "Rate-limit state" row above). `fly.toml` can't enforce this: `min_machines_running = 1` is a floor, and without `--ha=false` the first `fly deploy` starts two machines. Later `fly deploy` runs keep the current count, so the flag matters only on the first deploy or after scaling to zero. If two machines already exist, run `fly scale count 1`.
4. **A production native build against Fly.** Play a generated batch in a release build pointed at the deployed server.
5. **iOS development build.** A Release simulator build compiled on EAS on 2026-10-31 (build `8cd5fd36`, Xcode 27.1) and launched on the iOS 26.3 simulator to the starter deck, with the fonts and styling intact. That proves the compile, the plugins that run at build time and the `expo-updates` config. Still untested: a device-signed build, and a debug development build.
   - `npx expo run:ios` needs **Xcode 26.4+** (SDK 58's requirement). With Xcode 26.2 it fails inside Expo's own native code, not app code:
     `node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift:946:36: error: sending 'slot' risks causing data races`.
     Xcode 26.4+ is the documented fix, but it hasn't been tested here.
   - The cloud alternative needs no Xcode at all: `npx eas-cli@latest build --platform ios --profile simulator` (see "Deploying to TestFlight"). A debug `development` profile doesn't exist yet. It would need `expo-dev-client` and `"developmentClient": true`.
   - From now on, adding a native module that Expo Go doesn't bundle, or a config plugin whose effect only a native build exercises, means a dev build is required to verify it.
6. **Android.** No emulator pass was done (no Android SDK on this machine).
7. **Manual simulator passes.** Airplane mode mid-batch, reduce motion, large text / Dynamic Type, native swipe feel, and physical haptic feel.
8. **Native streaming against the deployed server.** The client reads `/api/cards` with `expo/fetch`. Incremental reads are verified on web, the server's streaming with `curl -N` (`evidence/curl-stream.txt`), and the native read path in Expo Go on the iOS simulator against the dev server and the fake OpenRouter (`evidence/ios-expo-go-native-stream.txt`: 5 cards arriving about 1 s apart). Not verified: Android, a release build (which resolves against the `origin` above instead of the dev server), and a real network between the phone and Fly.

## Small known follow-ups

- Cards take about 40 s to start arriving, but the app only fetches more once 2 or fewer are queued (`LOW_WATER` in `src/game/fetch-policy.ts`), so players will likely reach the loading card between batches. Raising `LOW_WATER` to 3 is the cheapest first step; if that isn't enough, reduce reasoning (the code doesn't set it today) and rerun the eval.
- The Docker image is about 1.26 GB because Expo/React Native are runtime `dependencies`. A slimmer runtime stage (only `express`, `expo-server` and the export) would cut that.
