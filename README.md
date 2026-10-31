# Fencepost

A doomscroll feed of tap-to-answer logic puzzles for senior engineers, on a whiteboard (light) or chalkboard (dark). Five card types: spot the flaw, break it, trace it, pick the design, and order the steps. It ships with a 6-card starter deck. After that, a small stateless server writes cards live with an AI model and streams them to the app as NDJSON.

> **Not production-ready yet.** The server deploys on merge to `main`, but no release build has been tested against it. Generated cards use `anthropic/claude-sonnet-5.5`, chosen after a hand-checked eval of 50 cards found no wrong answers, but that sample is small, so keep spot-checking cards. Cards also take about 40 s to start arriving. See [NOTES.md](NOTES.md).

## Run the app

```bash
npm install
npx expo start          # press i for the iOS simulator (Expo Go), w for web
```

The starter deck plays fully offline. Generated cards need the card server, and in development `npx expo start` serves the API routes too.

Secrets live in [Doppler](https://www.doppler.com/) (project `fencepost`, config `prd`), never in `.env` files or shell history. Install the CLI, run `doppler login` once, then use the npm scripts that inject them:

```bash
npm run dev     # expo start with the Doppler secrets; use this for generated cards
npm run serve   # node server.js with the Doppler secrets (after an export)
```

`/api/cards` also needs `CARD_MODEL` (an OpenRouter model id), and `CARD_MODEL_FALLBACK` is an optional second model, tried only if the first fails before sending a card. Both are set in Doppler (see "Card model" in [NOTES.md](NOTES.md)). To change them:

```bash
doppler secrets set CARD_MODEL=<model-id> CARD_MODEL_FALLBACK=<model-id> --project fencepost --config prd
```

Restart the server afterwards, because it reads these values at startup.

Without `OPENROUTER_API_KEY` and `CARD_MODEL`, `/api/cards` answers 503. The app then shows an error card, and the starter deck and rematches stay playable.

## Run the production server locally

```bash
npx expo export --platform web            # builds dist/client and dist/server (with the API routes)
PORT=8080 npm run serve                   # Express + expo-server; open http://localhost:8080
curl localhost:8080/api/health            # {"ok":true}
```

To see real streaming without an OpenRouter key, run the fake OpenRouter in `scripts/`. The inline values below are throwaway stubs, not secrets:

```bash
npm run stub:openrouter &                 # listens on 8790, streams scripts/stub-cards.json slowly
OPENROUTER_BASE_URL=http://127.0.0.1:8790/api/v1 OPENROUTER_API_KEY=stub CARD_MODEL=stub/model PORT=8080 node server.js
curl -N -X POST localhost:8080/api/cards -H 'content-type: application/json' -d '{"deviceId":"local-device-1"}'
```

Docker (the same image Fly runs):

```bash
docker build -t fencepost .
doppler run --project fencepost --config prd -- docker run --rm -p 8080:8080 -e OPENROUTER_API_KEY -e CARD_MODEL -e CARD_MODEL_FALLBACK fencepost
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
npm test                                  # Vitest: game rules, normalize, store, server handlers (mock model)
npm run e2e                               # builds the web export, then Playwright against server.js
npm run cards:eval -- --model <id> --batches 5   # real model, spends OpenRouter credit; key comes from Doppler
```

## Layout

- `src/app/` holds the routes: the feed (`index.tsx`), the root layout, and `api/{health,cards,flag}+api.ts`.
- `src/game/` and `src/cards/` are pure TypeScript: the rules, serve order, rematches, streaks, scoring and `normalize`, plus the starter deck.
- `src/server/` is server-only: the prompt, plan, rate limits, validation, card source and handlers. It is imported only by `+api.ts` files.
- `src/components/`, `src/store/` and `src/lib/` are the UI, the persisted zustand store, and the NDJSON client.
- `server.js`, `Dockerfile` and `fly.toml` are the server's deploy files. `.github/workflows/deploy-server.yml` deploys the server to Fly on each merge to `main`, once the one-time setup in NOTES.md is done.
- `.eas/workflows/deploy-ios.yml` ships iOS to TestFlight or over the air on each merge to `main`, once the one-time setup in NOTES.md is done.

## Theme and brand

The app is a whiteboard in light mode and a chalkboard in dark mode. The tokens live in `src/theme/colors.ts`, feed `tamagui.config.ts`, and are the only colors the brand assets and `app.json` use; `scripts/brand/palette.test.ts` fails if this table or `app.json` drifts from that file.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `board` | `#eef1ef` | `#16211d` | The board behind everything, the splash and the icon tile |
| `dot` | `#d2d9d5` | `#26352f` | The 1 px dot grid on the board |
| `card` | `#ffffff` | `#1d2b26` | Card and sheet surfaces |
| `ink` | `#17202a` | `#eaf0ec` | Text, the mark, and marker or chalk strokes |
| `muted` | `#5b6570` | `#9caea6` | Secondary text |
| `rule` | `#d4dad7` | `#33453e` | Borders and dividers |
| `wash` | `#e7ecea` | `#26362f` | Quiet fills: stat tiles, pills, progress tracks |
| `blue` | `#1c56c4` | `#8ab6ff` | The accent: progress, selected chips, the mark's lower rail |
| `blueWash` | `#e3eafa` | `#213248` | Selected-chip fill |
| `red` | `#cc3224` | `#ff8a7c` | Wrong answers |
| `redWash` | `#fbe6e3` | `#3e2522` | Wrong-answer fill |
| `green` | `#157a45` | `#72d9a0` | Right answers |
| `greenWash` | `#e0f2e7` | `#1d3a2b` | Right-answer fill |
| `gold` | `#c08a12` | `#e9bb4f` | Combo and streak highlights |
| `goldInk` | `#7d5506` | `#f2cb6c` | Text on a gold wash |
| `goldWash` | `#fbf0d2` | `#373020` | Combo-pill fill |

Type: Bricolage Grotesque for display text (titles, the wordmark), Atkinson Hyperlegible for body text, JetBrains Mono for code lines (with ligatures off, see NOTES.md), and Kalam for marker-style notes. Behind everything sits the dot grid from `src/components/feed/dot-grid.tsx`.

The mark is a capital F built from one pointed picket and two rails: the fencepost error as a letter. The lower rail carries the accent. Its shapes live once, in `src/theme/brand-mark.ts`; the in-app `BrandMark` component draws them from the theme, and `scripts/brand/` renders every asset from them and the palette:

| File | Size | Used by |
|---|---|---|
| `assets/fencepost.icon/` | Icon Composer bundle, 1024 pt | `ios.icon`: the iOS app icon, chalk on the chalkboard; iOS derives dark and tinted looks |
| `assets/images/icon.png` | 1024 x 1024, opaque | `icon`: the Android legacy icon, and iOS if the bundle is dropped |
| `assets/images/android-icon-foreground.png` | 512 x 512 | `android.adaptiveIcon.foregroundImage`, inside the 66% safe zone, over `backgroundColor` = dark `board` |
| `assets/images/android-icon-monochrome.png` | 512 x 512, white | `android.adaptiveIcon.monochromeImage`, for themed icons |
| `assets/images/splash-icon.png`, `splash-icon-dark.png` | 512 x 512 | The `expo-splash-screen` plugin, 120 pt wide on the light or dark `board`; the splash follows the system scheme so it fades into the board the app paints |
| `assets/images/favicon.png` | 96 x 96 | `web.favicon` |
| `assets/brand/*.svg` | 1024 viewBox | The mark and the icon as vectors, for designers; outputs, not masters |

To change the mark or the palette, edit `src/theme/brand-mark.ts` or `src/theme/colors.ts`, then run:

```bash
npm run brand:render     # needs Playwright's Chromium, like npm run e2e
```

It is a local, manual step: the rasters are Chromium screenshots at 1x with no text, so a second run on the same machine and Playwright version rewrites identical bytes, but another machine can differ by a few pixels. Review the image diff and commit. Nothing in CI regenerates them. Icon, splash and adaptive-icon changes are native changes, so the merge takes the TestFlight build path (NOTES.md).
