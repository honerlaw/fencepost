# Fencepost

A doomscroll feed of tap-to-answer logic puzzles for senior engineers, on a whiteboard (light) or chalkboard (dark). Five card types: spot the flaw, break it, trace it, pick the design, and order the steps. It ships with a 6-card starter deck. After that, a small stateless server writes cards live with an AI model and streams them to the app as NDJSON.

> **Not production-ready yet.** The card server's plumbing, validation, rate limits and streaming are tested, but whether generated puzzles are *correct* depends on the model. That is unverified until someone runs `npm run cards:eval` against real models, reads the cards, and picks `CARD_MODEL`. See [NOTES.md](NOTES.md).

## Run the app

```bash
npm install
npx expo start          # press i for the iOS simulator (Expo Go), w for web
```

The starter deck plays fully offline. Generated cards need the card server. In development, `npx expo start` serves the API routes too, so set the environment first:

```bash
export OPENROUTER_API_KEY=...   # never commit this; it is read only on the server
export CARD_MODEL=...           # an OpenRouter model id
npx expo start
```

Without those variables, `/api/cards` answers 503. The app then shows an error card, and the starter deck and rematches stay playable.

## Run the production server locally

```bash
npx expo export --platform web            # builds dist/client and dist/server (with the API routes)
PORT=8080 node server.js                  # Express + expo-server; open http://localhost:8080
curl localhost:8080/api/health            # {"ok":true}
```

To see real streaming without an OpenRouter key, run the fake OpenRouter in `scripts/`:

```bash
npm run stub:openrouter &                 # listens on 8790, streams scripts/stub-cards.json slowly
OPENROUTER_BASE_URL=http://127.0.0.1:8790/api/v1 OPENROUTER_API_KEY=stub CARD_MODEL=stub/model PORT=8080 node server.js
curl -N -X POST localhost:8080/api/cards -H 'content-type: application/json' -d '{"deviceId":"local-device-1"}'
```

Docker (the same image Fly would run):

```bash
docker build -t fencepost .
docker run --rm -p 8080:8080 -e OPENROUTER_API_KEY=... -e CARD_MODEL=... fencepost
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
npm test                                  # Vitest: game rules, normalize, store, server handlers (mock model)
npm run e2e                               # builds the web export, then Playwright against server.js
npm run cards:eval -- --model <id> --batches 5   # real model; needs OPENROUTER_API_KEY
```

## Layout

- `src/app/` holds the routes: the feed (`index.tsx`), the root layout, and `api/{health,cards,flag}+api.ts`.
- `src/game/` and `src/cards/` are pure TypeScript: the rules, serve order, rematches, streaks, scoring and `normalize`, plus the starter deck.
- `src/server/` is server-only: the prompt, plan, rate limits, validation, card source and handlers. It is imported only by `+api.ts` files.
- `src/components/`, `src/store/` and `src/lib/` are the UI, the persisted zustand store, and the NDJSON client.
- `server.js`, `Dockerfile` and `fly.toml` are the deploy files. Deploying is a manual step (see NOTES.md).
