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
