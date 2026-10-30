# Fencepost — Build Handoff

> **For Claude Code:** Read this whole file before writing code. Build in the milestone order in §14 and stop at the end of each milestone to run its checks. Library versions move fast: before installing anything, read the current docs linked in §16 and use the latest stable versions. Do not rely on remembered APIs. When this doc and current official docs disagree on an API, follow the docs and leave a short note in `NOTES.md`.

---

## 1. What we're building

Fencepost is a mobile game for experienced software engineers. It's a doomscroll-style feed of quick logic puzzles about how real systems behave, like the logic behind a restaurant reservation, a rate limiter, or a refund. It's the kind of thing asked in low-level design interviews ("write the logic for creating a reservation"), but nothing is typed. Every card is answered with one to a few taps.

A "fencepost error" is the classic off-by-one bug, which sets the tone: sharp, insider, a little playful.

**The loop:** a card appears → the player taps an answer → instant verdict with points and a one-line explanation → swipe up → next card. Cards are written on demand by an LLM, so the feed never runs out.

**Audience:** developers with 5–20 years of experience who want to keep their reasoning sharp in spare minutes. They don't want lessons. They want puzzles that feel like real bugs.

A working web prototype called "Edge Case" exists and defines the behavior. This doc captures everything from it you need: rules, prompt, design tokens, and starter cards.

## 2. Scope

### v1 (build this)
- iOS and Android app (Expo), with the web build as a free extra from the same codebase.
- Five card types (§6), a bundled starter deck (§12), and endless LLM-generated cards after that.
- Scoring, combos, random 2x cards, boss cards, daily streak, ranks, rematches of missed cards, skip, and "card was wrong" (§7).
- Topic picker and a stats panel.
- Progress stored on the device. **No database and no accounts in v1** (see §11).
- One small server, deployed on Fly.io, that holds the OpenRouter key and generates cards.

### Not in v1
Accounts, cloud sync, leaderboards, payments, push notifications, a shared card bank. §11 covers how these come later.

## 3. Stack and key decisions

| Area | Choice | Why |
|---|---|---|
| App framework | **Expo** (latest SDK; SDK 58 at time of writing), TypeScript, **Expo Router** | One codebase for iOS, Android, and web. |
| UI | **Tamagui** (follow the current Expo guide; config imported from `@tamagui/config/v6` at time of writing) | Themed tokens for light and dark, fast styling. |
| Animation and gestures | `react-native-reanimated`, `react-native-gesture-handler` | Card transitions and swipe-up. |
| Drawing | `react-native-svg` | The hand-drawn marker circle (§9). |
| Haptics | `expo-haptics` | Feedback on right and wrong answers. |
| Fonts | `@expo-google-fonts/*` via `expo-font` | §9 lists the faces. |
| Client state | `zustand` with `persist` | Small and simple. |
| Client storage | `expo-sqlite/kv-store` (AsyncStorage-compatible) | On-device progress. Swap for MMKV later if needed. |
| Server | **Expo Router API routes** (`+api.ts`) built with `npx expo export`, served by **`expo-server`**'s Express adapter | Keeps API code in the same repo with shared types. |
| Hosting | **Fly.io** (Docker) | As requested. |
| LLM gateway | **OpenRouter** | Swap models with an env var. |
| LLM library | **Vercel AI SDK** (`ai`, v7 at time of writing) with **`@openrouter/ai-sdk-provider`**, and **`zod`** for schemas | Typed structured output. `Output.array` with `elementStream` hands over each card as soon as it's complete and validated, so the first card appears quickly. |
| Streaming to the app | NDJSON over HTTP, read on the client with `expo/fetch` | `expo/fetch` supports streamed response bodies in React Native. |
| Tests | Vitest (or Jest if it fits Expo tooling better) for pure logic | The game engine and card validation are pure TypeScript and easy to test. |

## 4. Architecture

```
┌──────────────── Expo app (iOS / Android / web) ────────────────┐
│  Feed screen ── game engine (pure TS) ── zustand store ── kv   │
│        │                                                       │
│        └─ POST /api/cards  (expo/fetch, reads NDJSON stream)   │
└────────────────────────────┬───────────────────────────────────┘
                             │ HTTPS
┌────────────── Fly.io machine (Docker, Node LTS) ───────────────┐
│  Express + expo-server adapter → dist/server (API routes)      │
│    /api/health   /api/cards   /api/flag                        │
│        │                                                       │
│        └─ AI SDK streamText + Output.array ── OpenRouter       │
│           validate + normalize each card → write NDJSON line   │
└────────────────────────────────────────────────────────────────┘
```

**Rules for this split:**
- The client never sends prompt text. It sends topic preferences and recent card titles. The server builds the prompt, picks the model, and decides the batch plan. This blocks people from using the endpoint as a free LLM proxy.
- The server validates every card before sending it. Bad cards are dropped, never patched.
- The app works offline with the starter deck and any queued cards.

### Suggested layout
```
app/
  _layout.tsx            # providers, fonts, theme, polyfills
  index.tsx              # the feed
  api/
    health+api.ts
    cards+api.ts
    flag+api.ts
src/
  game/                  # pure TS, no React: types, scoring, streak, levels, queue, rematch
  cards/                 # zod schemas, normalize/validate, starter deck JSON, domains
  server/                # prompt builder, plan maker, rate limiter, openrouter client
  components/            # CardView, CodeBlock, OptionList, OrderPicker, VerdictPanel, MarkerCircle, TopBar, TopicsSheet
  store/                 # zustand store + persistence
  lib/                   # api url helper, ndjson reader, haptics
server.js                # Express entry for production
Dockerfile
fly.toml
```
Server-only code in `src/server/` must be imported only from `+api.ts` files so secrets never reach the client bundle. Use `expo/metro-config` in `metro.config.js` (required for secret stripping) and wrap it with Tamagui's `withTamagui`.

## 5. Data model

### Card (what the app plays)
```ts
type CardType = "flaw" | "break" | "trace" | "model" | "order";
type DomainId = "reservations" | "meetings" | "parking" | "payments" | "checkout" | "ratelimit"
  | "rides" | "cache" | "jobs" | "chat" | "elevator" | "library";

interface CardBase {
  id: string;          // uuid, assigned by the server (or fixed for starter cards)
  type: CardType;
  domain: DomainId;
  title: string;       // ≤ 70 chars
  prompt: string;      // ≤ 280 chars
  why: string;         // ≤ 420 chars, shown after answering
  boss: boolean;
}
type FlawCard  = CardBase & { type: "flaw";  code: string[]; answer: number };   // answer = index of the bad line
type BreakCard = CardBase & { type: "break"; code: string[]; options: string[]; answer: number };
type TraceCard = CardBase & { type: "trace"; code: string[]; input?: string; options: string[]; answer: number };
type ModelCard = CardBase & { type: "model"; options: string[]; answer: number };
type OrderCard = CardBase & { type: "order"; steps: string[] };                  // steps in the CORRECT order; the client shuffles
type Card = FlawCard | BreakCard | TraceCard | ModelCard | OrderCard;

// Added on the client at serve time, never sent by the server:
type PlayedCard = Card & { double?: boolean; rematch?: boolean; starter?: boolean };
```

### Raw card (what the model returns)
Use one **flat** schema with nullable fields rather than a discriminated union. Structured-output modes on many providers handle flat, all-required objects far more reliably than `oneOf` or `anyOf`.
```ts
const RawCard = z.object({
  type: z.enum(["flaw", "break", "trace", "model", "order"]),
  title: z.string(),
  prompt: z.string(),
  code: z.array(z.string()).nullable(),
  input: z.string().nullable(),
  options: z.array(z.string()).nullable(),
  correct: z.string().nullable(),   // exact text of the right option
  bad_line: z.string().nullable(),  // exact text of the wrong line (flaw only)
  steps: z.array(z.string()).nullable(),
  why: z.string(),
});
```
The model names the answer by **text**, not by index. Models get indexes wrong often (an off-by-one, fittingly). The server converts text to an index (§8.4).

### Progress (persisted on device)
```ts
interface Progress {
  v: 1;
  xp: number;
  answered: number;
  correct: number;
  bestCombo: number;
  streak: number;
  lastDay: string;        // local date "YYYY-MM-DD" of the last answer
  missed: Card[];         // rematch queue, max 30, oldest first
  recent: string[];       // recent card titles, max 30, sent to the server to avoid repeats
  domains: DomainId[];    // empty = all topics
  starterDone: boolean;
  deviceId: string;       // random uuid created on first launch, used for rate limiting
}
```
Session-only state (not persisted): `combo`, the card queue, the current card, and fetch status.

## 6. Card types

| Type | Label shown | What the player does | Notes |
|---|---|---|---|
| `flaw` | Spot the flaw | Taps the one wrong line of pseudocode | Each code line is a tap target (min 36pt tall). Optional keyboard: 1–9. |
| `break` | Break it | Picks which of 4 scenarios makes the code misbehave | Code is shown read-only. |
| `trace` | Trace it | Picks what the code actually does with a given input | Shows an "Input" box above the code. |
| `model` | Pick the design | Picks the best design choice of 4 | No code. |
| `order` | Order the steps | Taps steps in sequence; a tapped step moves into a numbered list; tapping a placed step sends it back; placing the last step grades the card | Right only if the whole order matches exactly. Shuffle so the starting order is never already correct. |

Every card shows: an eyebrow with the type label, the topic name, and badges for **Boss · 3x**, **2x points**, or **Rematch**; then a title, the prompt, and the type-specific body. A quiet **Skip this card** link sits at the bottom until the card is answered.

## 7. Game rules

Port these exactly. Keep them in `src/game/` as pure functions with unit tests.

- **Points:** base 100, or 300 for a boss card. `multiplier = min(3, 1 + 0.5 × floor(combo / 3))`, where `combo` counts this answer. A 2x card doubles the total. A wrong answer scores 0 and resets the combo.
- **2x cards:** each generated card has a 12% chance of being marked 2x when it's served. Never boss, rematch, or starter cards. (Starter card 3 is 2x on purpose, to show the mechanic.)
- **Boss cards:** in each batch of 5, each slot has an 18% chance to be a boss, at most one per batch. The server decides and tells the model.
- **Daily streak:** on the first answer of a local calendar day, the streak goes up by 1 if the last answer was yesterday, otherwise it resets to 1. Show the streak as 0 if the last answer was before yesterday.
- **Ranks:** Intern 0 · Junior 800 · Mid-level 2,500 · Senior 6,000 · Staff 12,000 · Principal 25,000 · Distinguished 50,000 · Fellow 100,000 XP. The top bar shows the rank name, a progress bar, and "xp / next XP".
- **Rematches:** a wrong answer saves the card to `missed` (max 30, drop the oldest). After at least 5 non-rematch cards, the next card is the oldest missed card that isn't the one just answered. Missed cards are also served whenever the generated queue is empty. A right answer removes it; a wrong one moves it to the back.
- **Skip:** no points, no combo change. A skipped rematch moves to the back of the queue.
- **"Card was wrong"** (shown only after a wrong answer): restores the previous combo, takes 1 off `answered`, removes the card from `missed`, and adds its title to `recent`. Also POST the card to `/api/flag` (§8.6).
- **Starter deck:** first-time players get the 6 starter cards (§12) first. After the last one, `starterDone = true`. Returning players see a "Welcome back" card with their streak, rank, XP, rematch count, and a **Deal me in** button.
- **Celebrations:** a toast for a promotion ("Promoted to Senior"), for every 5th answer in a row ("10 in a row"), and for a streak going up on the first answer of the day ("4-day streak"). Haptics: a light tap when right, a double buzz when wrong.
- **Verdict words:** right: "Nice catch." "Clean." "LGTM." "Ship it." "Exactly." "Sharp."; boss right: "Boss down."; wrong: "Not quite." "Bug escaped." "Rolled back." "Close, but no."

### Feed and prefetch
- Order of what's served next: starter cards (until done) → a rematch if one is due → the generated queue → a rematch while waiting → a status card ("Shuffling the deck", or an error).
- Fetch a new batch of 5 when the queue has 2 or fewer cards left, but only after the player's first answer in a session (so nothing is spent just by opening the app). One fetch at a time.
- While a batch is loading and nothing else is playable, show a loading card with the topic name and elapsed seconds ("A batch usually takes 20 to 60 seconds"). Swap it for the first card the moment it arrives.
- On an error, don't retry automatically for rate limits. For other errors, allow one automatic retry after 3 more answers. Otherwise show a **Try again** button. Never retry in a loop.

## 8. Card generation (server)

### 8.1 `POST /api/cards`
Request body:
```json
{ "deviceId": "uuid", "domains": ["payments"], "recent": ["Overlapping bookings", "..."] }
```
- `domains`: optional; an empty array means all topics. Ignore unknown ids.
- `recent`: at most 20 strings; trim each to 60 chars and strip newlines before using them in the prompt.

Response: `200`, `Content-Type: application/x-ndjson`, streamed. One JSON object per line:
```
{"event":"start","domain":"payments","count":5}
{"event":"card","card":{...Card}}
{"event":"ping"}
{"event":"card","card":{...Card}}
{"event":"done","sent":4}
```
On failure mid-stream: `{"event":"error","code":"upstream_error"}` and then close. Before any streaming starts, use HTTP status codes (`400` bad input, `429` rate limited with `Retry-After`, `503` model unavailable).

Send `{"event":"ping"}` every 10 seconds until the first card. Reasoning models can think for a while before writing, and the ping keeps the connection alive through proxies.

### 8.2 Domain and plan
The server picks one domain per batch: random from the requested list (or all), avoiding the domain of this device's previous batch when there's a choice. The plan is 5 slots, with types weighted `flaw 30, break 25, trace 15, model 15, order 15`, and the boss rule from §7.

**Domains:**
| id | name | blurb (goes in the prompt) |
|---|---|---|
| reservations | Restaurant reservations | tables with seat counts, time slots, party sizes, holds, cancellations, no-shows and walk-ins |
| meetings | Meeting rooms | room capacity and equipment, overlapping bookings, weekly recurring meetings, time zones |
| parking | Parking garage | spot sizes, entry and exit gates, hourly billing, grace periods, lost tickets, a full lot |
| payments | Payments and refunds | authorize and capture, partial refunds, retries, idempotency keys, rounding cents |
| checkout | Inventory and checkout | stock counts, carts, holding stock during checkout, overselling, expiring holds |
| ratelimit | Rate limiter | fixed and sliding windows, token buckets, per-user keys, bursts, window edges |
| rides | Ride matching | drivers and riders, nearest available driver, cancellations, double assignment, surge pricing |
| cache | Cache with expiry | TTLs, LRU eviction, stale reads, cache stampedes, invalidation |
| jobs | Job scheduler | cron-style schedules, retries with backoff, at-least-once delivery, deduplication, missed runs |
| chat | Chat delivery | message ordering, read receipts, offline delivery, edits and deletes, unread counts |
| elevator | Elevator controller | call requests, travel direction, stop scheduling, capacity, doors |
| library | Library holds | copies, hold queues, due dates, renewals, late fines |

**Scenario flavors** (pick one at random per batch): a Friday dinner rush · a holiday weekend · the night the clocks change · a flash sale · the last day of the month · a launch in a new city · a flaky mobile network · a customer who taps twice · a server restart mid-request · a leap day · a VIP customer · a completely full house · two data centers · a slow downstream service.

### 8.3 Prompt
This prompt is tuned from the prototype. Keep the wording. Fill in `{N}`, `{DOMAIN_NAME}`, `{DOMAIN_BLURB}`, `{PLAN}`, `{FLAVOR}`, and `{RECENT}` (omit the "Do not repeat" line when there are no recent titles). `{PLAN}` is a numbered list like `1. flaw` / `2. break (BOSS: harder)`.

```text
You write puzzle cards for Fencepost, a fast tap-to-answer game. The player is a senior software engineer (15+ years) who wants to stay sharp on the logic behind real-world systems: the kind of thing asked in low-level design interviews, like "write the logic for creating a restaurant reservation". Nothing is typed; every card is answered with one or a few taps on a phone.

Write {N} cards about this system: {DOMAIN_NAME} ({DOMAIN_BLURB}).
Write them in this order, with these types:
{PLAN}

Card types:
- flaw: pseudocode of 4 to 10 lines in which exactly ONE line is wrong. The player taps that line. The prompt says what the code is meant to do. The bug is a realistic logic flaw (wrong comparison, wrong boundary, missing state check, wrong variable, wrong order of operations), never a syntax error or typo, and fixing that one line fixes the code. Put the exact text of the wrong line in bad_line.
- break: pseudocode of 3 to 9 lines plus 4 short scenarios in options. Exactly one scenario makes the code do the wrong thing; the code handles the other three correctly as written.
- trace: pseudocode of 3 to 10 lines plus a concrete input. 4 possible outcomes in options; exactly one is what the code actually does with that input.
- model: a design decision for this system (data model, check, lock, index, state machine, algorithm, data structure) under a constraint stated in the prompt. 4 options; exactly one is clearly the best.
- order: 4 to 6 steps of a procedure in this system that has one correct order. List the steps in the CORRECT order; the game shuffles them.
For break, trace and model cards, put the exact text of the right option in correct.
BOSS cards are noticeably harder: subtler bugs (races, idempotency, partial failure, boundaries, time zones and daylight saving, rounding money) and up to 12 lines of code.

Pseudocode rules: Python-like and easy to read. Each line at most 34 characters, including indentation. Indent with 2 spaces. Realistic names. No comments that hint at the answer.
Quality rules: senior level, never trivia or definitions. Each card stands alone, so state any rule the answer depends on (for example "end times are exclusive" or "slots are 30 minutes") in the prompt. Exactly one defensible answer per card. Before writing each card, trace the code yourself to confirm the answer.
Vary the ideas across cards: inclusive vs exclusive ranges, off-by-one, check-then-act races, double submits and idempotency, capacity math, state transitions, cancellations, retries, ordering, empty and missing values, expiry, time zones, rounding.
Scenario flavor for this batch: {FLAVOR}.
Do not repeat these recent cards: {RECENT}.

Field rules: title is 2 to 5 words naming the situation, like "Overlapping bookings". prompt is one sentence of at most 25 words. Each option and step is at most 12 words. bad_line matches one code line exactly and appears only once in the code. why is one or two plain sentences, at most 35 words, explaining the answer. Set fields a card type doesn't use to null.
```

### 8.4 Calling the model
```ts
import { streamText, Output } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const result = streamText({
  model: openrouter.chat(process.env.CARD_MODEL!),
  output: Output.array({ element: RawCard }),
  prompt,
  abortSignal,                 // abort after 90 s, or when the client disconnects
});

let sent = 0;
for await (const raw of result.elementStream) {
  const card = normalize(raw, domainId, plan[sent]?.boss ?? false);
  if (!card) continue;          // count drops for the batch log line
  writeLine({ event: "card", card });
  sent++;
}
```
Confirm the exact `streamText` / `Output.array` / `elementStream` API against the current AI SDK docs before writing this.

**Model choice:** read the model from `CARD_MODEL` (and `CARD_MODEL_FALLBACK`). Puzzle correctness matters more than speed, so start with a strong reasoning model that supports structured outputs on OpenRouter (check the model's supported parameters on its OpenRouter page). Compare it against a cheaper model with the eval script in §13. If the first model fails before any card is sent, retry once with the fallback model.

If the chosen model can't do structured output, fall back to plain `streamText` asking for one JSON object per line, and parse lines as they arrive. The prototype worked this way. Keep this path behind a flag; don't build both unless needed.

**`normalize(raw, domain, boss)`** returns a `Card` or `null`:
1. `type` must be one of the five. `title`, `prompt`, and `why` must be non-empty after collapsing whitespace. Truncate to the limits in §5.
2. `flaw`, `break`, `trace` need `code` with at least 2 non-blank lines (max 16). Convert tabs to 2 spaces and strip trailing spaces. Keep leading indentation.
3. `flaw`: compare `bad_line` to each code line with whitespace collapsed and trimmed. Exactly one match is required (zero or two-plus → drop). Its index becomes `answer`.
4. `break`, `trace`, `model`: 3–5 options, all distinct after cleaning. `correct` must exactly match one. Shuffle the options and set `answer` to the right one's new index.
5. `order`: 3–7 distinct steps, kept in correct order.
6. Assign a new uuid `id`, plus `domain` and `boss` from the plan.

### 8.5 Abuse and cost controls (no database needed)
- The key lives only in Fly secrets. Never ship it in the app.
- Rate limit `/api/cards` per `deviceId` and per IP with an in-memory token bucket (for example 1 batch per 20 s and 60 batches per day per device). In-memory limits are per machine, so run a single Fly machine to start. §11 explains when to move this to Redis.
- Cap the request body at 4 KB. Reject unknown fields.
- Set a credit limit on the OpenRouter API key in the OpenRouter dashboard as a hard backstop.
- Cap output tokens and set a 90-second timeout per batch.
- Log one JSON line per batch: device hash, domain, model, cards sent, cards dropped, latency, token usage. Never log the API key.

### 8.6 `POST /api/flag` and `GET /api/health`
- `/api/flag` takes `{ deviceId, card, reason: "wrong" }` and writes it as one JSON log line. No storage in v1. Fly logs are enough to spot bad prompts. Rate limit it too.
- `/api/health` returns `{ ok: true }` for Fly health checks.

## 9. Visual design

The look is a **whiteboard in light mode and a chalkboard in dark mode**, as if you're at an interview whiteboard. A faint dot grid fills the background, with one card at a time on top of it.

### Color tokens (map these into Tamagui themes)
| Token | Light (whiteboard) | Dark (chalkboard) | Use |
|---|---|---|---|
| board | `#eef1ef` | `#16211d` | App background |
| dot | `#d2d9d5` | `#26352f` | Dot grid (1px dots every 22px) |
| card | `#ffffff` | `#1d2b26` | Card surface |
| ink | `#17202a` | `#eaf0ec` | Main text, primary button fill |
| muted | `#5b6570` | `#9caea6` | Secondary text |
| rule | `#d4dad7` | `#33453e` | Borders |
| wash | `#e7ecea` | `#26362f` | Subtle fills |
| blue / blueWash | `#1c56c4` / `#e3eafa` | `#8ab6ff` / `#213248` | Accent, eyebrows, XP bar, placed steps |
| red / redWash | `#cc3224` / `#fbe6e3` | `#ff8a7c` / `#3e2522` | Wrong answers, marker circle |
| green / greenWash | `#157a45` / `#e0f2e7` | `#72d9a0` / `#1d3a2b` | Right answers |
| gold / goldInk / goldWash | `#c08a12` / `#7d5506` / `#fbf0d2` | `#e9bb4f` / `#f2cb6c` / `#373020` | Boss, 2x, combo, promotions |

### Type
- **Display:** Bricolage Grotesque, 750–800 weight. Rank name, card titles, points, buttons.
- **Body:** Atkinson Hyperlegible, 400/700. Prompts, options, explanations.
- **Code:** JetBrains Mono. Code lines (12.5px), line numbers, XP figures.
- **Marker:** Kalam 700. Only for the verdict word ("Nice catch."), rotated about −2°.

### Signature details
- **Marker circle:** when a flaw card is answered, draw a hand-drawn red loop around the buggy line with `react-native-svg`, animating the stroke over about 0.55 s. A wrongly tapped line gets a red tint and a strikethrough. A correctly tapped line gets a green tint. Size the loop from the measured text box (`onLayout`), not the full row.
- **Card transitions:** the answered card slides up and fades out; the next card rises in from below. Respect the OS reduce-motion setting.
- **Verdict panel:** rises from the bottom after answering. Contains the marker-font verdict word, `+points`, gold multiplier tags, the explanation, a full-width **Next card** button, and the hint "Swipe up for the next card". Swiping up anywhere goes to the next card once it's answered, but only if the card isn't mid-scroll.
- **Boss cards:** gold border plus a soft gold outer ring.
- **Top bar:** rank name and XP bar on the left, streak pill and combo pill ("6 in a row · 2x", only when the combo is 2 or more) on the right, then a menu button that opens the Topics sheet.
- **Topics sheet:** wordmark, topic chips (All topics plus the 12 domains, multi-select), stats (cards answered, accuracy, best run, rematches waiting), and a line saying puzzles are written live by an AI model.
- Code blocks scroll sideways on narrow screens instead of wrapping.

## 10. Client details

- **API base URL:** with Expo Router, relative `fetch("/api/cards")` resolves to the dev server in development. For production native builds, set the `expo-router` plugin's `origin` in `app.json` to the Fly URL (for example `https://fencepost.fly.dev`). Check the current API routes docs for how this works in your SDK.
- **Streaming:** use `fetch` from `expo/fetch` and read `response.body` with a reader. Split on newlines and handle each event. Add the structured-clone and text-encoding polyfills from the AI SDK Expo guide only if errors show they're needed.
- **Cancel** the in-flight request when the app goes to the background for more than a minute. Keep cards that already arrived.
- **Persistence:** save progress after each answer, debounced by about 1 s, and when the app goes to the background.
- **Accessibility:** every tap target has a label (for example "Line 5: if r.start <= s and e <= r.end:"). Support Dynamic Type for body text. Color is never the only signal: use strikethrough, the marker circle, and the verdict word.

## 11. Does v1 need a database? No.

Everything the game needs fits on the device: progress, the rematch list, recent titles, and topic choices. The server is stateless: it receives a request, calls OpenRouter, streams cards back, and forgets them.

Add a database later when one of these becomes true:
1. **More than one Fly machine:** rate limits need shared state. Use Redis (Upstash Redis on Fly).
2. **Cost or quality:** store generated cards in a **shared card bank** (Postgres) and serve pooled cards to many players instead of generating fresh ones for each. Track right-rates and "card was wrong" flags per card, and retire bad ones. This is the biggest cost lever once there are real users.
3. **Accounts, cross-device sync, or leaderboards.**

Keep the server's card source behind an interface (`CardSource.getBatch(params)`) so swapping "generate live" for "card bank, topped up by generation" later is a contained change.

## 12. Starter deck (bundle as JSON)

These are hand-checked. Run them through the same `normalize` as generated cards (they use the raw format), then mark `starter: true`. Card 3 is `double: true`.

```json
[
  {"domain":"reservations","type":"flaw","title":"Overlapping bookings",
   "prompt":"can_book should reject any booking that overlaps a live reservation. Tap the line that lets double bookings through.",
   "code":["def can_book(table, s, e):","  for r in table.reservations:","    if r.status == \"cancelled\":","      continue","    if r.start <= s and e <= r.end:","      return False","  return True"],
   "bad_line":"if r.start <= s and e <= r.end:","input":null,"options":null,"correct":null,"steps":null,
   "why":"That only catches bookings sitting entirely inside an existing one. Two ranges overlap when s < r.end and e > r.start."},
  {"domain":"reservations","type":"model","title":"Two hosts, one table",
   "prompt":"Slots are fixed 30-minute blocks. Two hosts book the last 7:00 table at the same moment. What prevents a double booking?",
   "options":["A unique constraint on (table_id, slot)","Check availability, then insert the booking","Refresh the host screen every few seconds","Retry the insert if the first attempt fails"],
   "correct":"A unique constraint on (table_id, slot)","code":null,"input":null,"bad_line":null,"steps":null,
   "why":"Check-then-insert races: both checks pass before either insert lands. A unique constraint makes the database reject the second booking."},
  {"domain":"payments","type":"break","title":"Splitting the bill","double":true,
   "prompt":"split_bill should return shares that add up to the total. Which bill breaks it?",
   "code":["def split_bill(total_cents, n):","  share = total_cents // n","  return [share] * n"],
   "options":["$90.00 split 3 ways","$100.00 split 4 ways","$100.00 split 3 ways","$50.00 split 2 ways"],
   "correct":"$100.00 split 3 ways","input":null,"bad_line":null,"steps":null,
   "why":"10000 // 3 is 3333, so the shares add up to 9999 and a cent disappears. Hand the remainder to the first shares."},
  {"domain":"ratelimit","type":"trace","title":"Three per minute",
   "prompt":"allow() should permit at most 3 calls per user in any 60 seconds. What happens to the call at t=30?",
   "code":["LIMIT = 3","def allow(user, now):","  hits = [t for t in log[user]","          if t > now - 60]","  if len(hits) > LIMIT:","    return False","  hits.append(now)","  log[user] = hits","  return True"],
   "input":"log[user] starts as []. The user calls at t = 0, 10, 20 and 30 seconds.",
   "options":["Allowed, as the 4th call in a minute","Rejected, because the limit of 3 is reached","Allowed, because the t=0 call has expired","Rejected, because t=0 is counted twice"],
   "correct":"Allowed, as the 4th call in a minute","bad_line":null,"steps":null,
   "why":"At t=30 there are 3 earlier hits, and 3 > 3 is false, so a 4th call gets through. The check should be len(hits) >= LIMIT."},
  {"domain":"checkout","type":"order","title":"Placing an order",
   "prompt":"Put the checkout steps in the order that never charges for stock you can't ship.",
   "steps":["Validate the cart and prices","Reserve stock for every item","Charge the card with an idempotency key","Mark the order confirmed","Send the confirmation email"],
   "code":null,"input":null,"options":null,"correct":null,"bad_line":null,
   "why":"Reserve stock before charging so a sold-out item is never billed, and only email once the order is confirmed."},
  {"domain":"parking","type":"flaw","title":"Billing by the hour",
   "prompt":"The garage bills every started hour in full after a 15-minute grace period. Tap the wrong line.",
   "code":["RATE = 400  # cents per hour","def fee(entered, exited):","  mins = minutes(exited - entered)","  if mins <= 15:","    return 0","  hours = mins // 60","  return hours * RATE"],
   "bad_line":"hours = mins // 60","input":null,"options":null,"correct":null,"steps":null,
   "why":"Floor division bills 61 minutes as one hour and 50 minutes as nothing. A started hour counts, so round up: ceil(mins / 60)."}
]
```
Use stable ids for starter cards (`starter-1` … `starter-6`) so rematches of them work across launches.

## 13. Testing

- **Unit tests** (`src/game`, `src/cards`): scoring and multipliers, streak across days (including the gap of 2+ days), rank thresholds, rematch scheduling, skip and flag behavior, `normalize` (duplicate `bad_line`, missing `correct`, duplicate options, tabs, over-long fields), and that all 6 starter cards pass `normalize`.
- **Stream tests:** NDJSON reader with chunk boundaries that split lines and JSON objects.
- **Card eval script** (`npm run cards:eval -- --model <id> --batches 5`): calls the generation function directly, prints each card readably, and reports the drop rate and latency. Use it to choose `CARD_MODEL` and to check prompt changes. Read the cards yourself; a puzzle with a wrong answer is the worst bug this app can have.
- **Manual pass** on an iOS simulator and an Android emulator: starter deck end to end, a generated batch, airplane mode mid-batch, dark mode, reduce motion, large text.

## 14. Build order

Stop after each milestone, run its checks, and summarize what changed.

1. **Scaffold.** Expo (latest SDK) + Expo Router + TypeScript + Tamagui per the current Expo guide. Light and dark themes from §9. Fonts load before hiding the splash screen. `metro.config.js` uses `expo/metro-config` wrapped with `withTamagui`. *Check:* the app runs on iOS, Android, and web, and follows the system theme.
2. **Game engine.** `src/game` and `src/cards`: types, zod schemas, `normalize`, scoring, streak, ranks, queue and rematch logic, the starter deck. *Check:* all unit tests pass.
3. **Card UI.** All five card types, the verdict panel, the marker circle, skip, and "card was wrong", playing the starter deck offline. *Check:* every starter card is answerable right and wrong, and the reveal is correct.
4. **Feed.** Swipe-up navigation, transitions, top bar, toasts, haptics, persistence with the zustand store. *Check:* progress survives an app restart, and the streak increments on a new day (fake the clock in a test).
5. **Server.** `/api/health`, `/api/cards`, and `/api/flag`: prompt builder, plan, OpenRouter via the AI SDK, normalize, NDJSON with pings, rate limits, logging. *Check:* `curl -N` against the local server streams valid cards, and the eval script runs.
6. **Client fetching.** Prefetch policy, `expo/fetch` streaming, loading, error, and welcome-back cards. *Check:* the first generated card appears as soon as it streams, and errors show the right card with no retry loops.
7. **Topics and stats sheet.** *Check:* topic choices change the next batch's domain.
8. **Deploy.** Dockerfile, `server.js`, `fly.toml`, secrets, and the `origin` setting for native builds (§15 below has the details). *Check:* `/api/health` is green on Fly, and a production-like native build plays generated cards from Fly.
9. **Hardening.** Timeouts, body caps, rate-limit tests, and the abort on backgrounding. *Check:* a burst of requests gets `429`s, and nothing crashes on malformed model output.

## 15. Deployment on Fly.io

### `server.js`
Follow the custom-server example in the Expo API routes docs. At time of writing it looks like:
```js
const path = require("path");
const express = require("express");
const { createRequestHandler } = require("expo-server/adapter/express");

const app = express();
app.disable("x-powered-by");
app.use(express.static(path.join(process.cwd(), "dist/client")));
app.all("/{*all}", createRequestHandler({ build: path.join(process.cwd(), "dist/server") })); // Express 5 route syntax
app.listen(process.env.PORT || 8080);
```
Don't add compression middleware in front of `/api/cards`. It buffers the stream.

### `app.json` essentials
- `"web": { "output": "server" }` so the export includes the server bundle.
- `expo-router` plugin `origin` set to the production server URL.

### `Dockerfile`
Two stages on the current Node LTS image: install and `npx expo export --platform web` in the first; copy `dist/`, `server.js`, and production dependencies into the second; `CMD ["node", "server.js"]`. Make sure `express` and `expo-server` are regular dependencies, not dev dependencies. `expo-server` does not load `.env` files, so all config comes from the environment.

### `fly.toml`
```toml
app = "fencepost"
primary_region = "iad"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/api/health"
    timeout = "5s"
```
Keep one machine until rate limiting moves to Redis (§11).

### Secrets and env
```
fly secrets set OPENROUTER_API_KEY=... CARD_MODEL=... CARD_MODEL_FALLBACK=...
```
Optional: `RATE_LIMIT_PER_DAY`, `BATCH_SIZE` (default 5).

### Commands
`fly launch --no-deploy` (accept the Dockerfile, don't add a database) → set secrets → `fly deploy` → `fly logs` to watch batches.

## 16. Docs to read before coding

- Expo API routes: https://docs.expo.dev/router/web/api-routes
- `expo-server` and its adapters: https://docs.expo.dev/versions/latest/sdk/server/
- Tamagui with Expo: https://tamagui.dev/docs/guides/expo
- AI SDK structured data (`Output.array`, `elementStream`): https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- AI SDK with Expo (`expo/fetch`, polyfills): https://ai-sdk.dev/docs/getting-started/expo
- OpenRouter provider for the AI SDK: https://ai-sdk.dev/providers/community-providers/openrouter
- OpenRouter docs (models, structured outputs, key limits): https://openrouter.ai/docs/quickstart
- Fly.io Node deployment: https://fly.io/docs/
