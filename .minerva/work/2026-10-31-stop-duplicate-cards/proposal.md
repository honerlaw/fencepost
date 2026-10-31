# Proposal: stop-duplicate-cards

**Date**: 2026-10-31
**Status**: Draft

## Goal

A player doesn't get a card back just because they reopened the app: a starter card they've answered, skipped or flagged stays gone. A generated card whose title matches one they've seen recently, one waiting to be played, or one in their rematch list never reaches them. Rematches of missed cards still come back on purpose.

## Why

The request, verbatim: "fix duplicate cards", following "how do we prevent duplicate questions?"

There are two separate repeat paths on `main` (e4ec117).

**Starter replay, reachable on a phone today.** `startSession` deals the whole starter deck whenever `progress.starterDone` is false, and the unplayed list isn't saved. A player who quits partway through the six starter cards gets all six again, including ones they answered, and earns XP again. The card server isn't deployed, so starter cards and their rematches are the only cards on a device.

**Generated repeats.** Prevention is one line in the model prompt, "Do not repeat these recent cards", and nothing enforces it:

- `src/store/game-store.ts` sends `progress.recent.slice(-20)`. `recent` is only written when a card is answered, skipped or flagged, so queued cards, the current card and unplayed starter cards are never sent. The next batch can repeat them.
- `src/game/engine/apply-batch-event.ts` appends every valid card to the queue with no check, so the model's repeats reach the player, including two matching cards in one batch.

### Facts established

- Server contract: `recent` is `z.array(z.string().max(200)).max(20)` (`src/server/validate/parse-cards-request.ts`), strict object, 4 KB body cap. The client must send at most 20. The shape doesn't change, and the server treats the list as an opaque do-not-repeat list.
- `src/game` and `src/cards` are pure by dependency-cruiser rule. `src/cards/normalize` imports `@/game/rng` at runtime, so a game-to-cards import risks a cycle, and `no-circular` is an error.
- `Progress` persists through zustand `partialize: (s) => ({ progress: s.progress })`, version 1. The queue, the current card and the `starter` list aren't saved. No `Progress` field changes here, so no version bump is needed.
- `answer.ts` and `skip.ts` set `starterDone` when a starter card is played with `state.starter.length === 0`. The answered or skipped title is in `recent` before the state commits, and `flagWrong` writes `recent` too. `toBack` strips `starter` from saved missed copies, so a rematch can't set `starterDone`.
- An all-rejected batch reuses the existing path: `done` with `fetch.received === 0` calls `batchFailed`, so it can't refetch in a loop (knowledge: 2026-10-29-pattern-batch-lifecycle-invariants). What the player sees depends on state: from the loading card with no rematch available, the error card with Try again; with a rematch available, the rematch; while a card is showing, only `fetch.error` is set, and one auto-retry is still allowed 3 answers later. After that, fetching stops until the error card's Try again.
- Pending titles number at most 8 at fetch time: the current card, up to 5 starters, and up to 2 queued (`decideFetch` needs `queued <= LOW_WATER`, and manual retry only comes from the error card with an empty queue).
- Fetching starts after the first answer, skip or "Deal me in", so a batch can arrive while starter cards remain. The serve order is starters, a due rematch, then the queue.
- `e2e/generated.spec.ts:29` asserts `recent: ['Overlapping bookings']` on the first request with `toMatchObject`, which needs an exact array. e2e is in `ci-required` and isn't part of `npm run guard`. `e2e/` isn't a guarded path.
- Generated cards reach no device until the Fly server is deployed, so the generated half of this fix has no visible effect on a phone until then. The starter half does, through an over-the-air update.
- Limits: 60 batches a device a day (`RATE_LIMIT_PER_DAY`), and `rate_limited` never retries on its own. About $0.06 and 45 s a batch (NOTES.md).

### Scope

One work unit, one PR, unphased. No new dependency, no native change, no script or `.gitignore` change, so the fingerprint stays `9d6c…` and this ships as an update.

Out:
- Saving the queue to disk. That's a cost saving. It means a card shown but never answered can come back in a later session, because it never reached `recent`.
- Detecting the same idea under a different title, which needs content comparison or a stored card pool.
- Raising the 30-title history, or telling the model more titles. Both are deferred with no trigger: this unit adds no measurement of how often the model repeats, so nothing will prompt the change. Raising the history alone would drop more cards the model was never told about.
- Changing how rematches repeat. A missed card alternates with other missed cards until answered right. That's deliberate.
- Server or prompt changes.

### Approaches considered

Criteria: (1) actually stops a repeat reaching the player; (2) knows everything the player has seen; (3) bounded change that keeps the batch lifecycle invariants; (4) cost of wasted cards. Starter replay is fixed the same way under every option, so it doesn't separate them.

**A (chosen). Client enforcement.** The app sends pending titles with the request and drops an incoming card that matches anything seen. Meets 1 to 3. On 4: dropped cards are already paid for, so spend per played card rises by however often the model repeats, which isn't measured.

**B. Server enforcement.** The server drops cards matching `params.recent` and earlier cards in the batch. It sees 20 titles at most and can't see `missed`. Fails 2.

**A+. A plus a higher server cap on `recent`.** Telling the model more titles would reduce wasted cards. Rejected for now: it adds prompt tokens and changes the prompt's documented limits for a benefit nobody has measured.

**C. Stored card pool.** Generate into a shared store, serve unseen cards per device, dedupe on content. Would also solve cold-start cost and reworded repeats. Needs a database and a deployed server, and it's a different system. Fails 3.

## Approach

All new files are in `src/game/engine/`, one function per file, matching the folder's convention. Nothing imports `src/cards`.

1. `title-key.ts`: `titleKey(title)`: lowercase, replace runs of anything outside `a-z0-9` with one space, trim. An empty key never matches. No Unicode property escapes, to stay safe on Hermes.
2. `pending-titles.ts`: `pendingTitles(state)`: the current card's title, unplayed starters, then the queue, in play order. An answered current card is already in `recent`, and de-duplication handles it.
3. `is-seen-title.ts`: `isSeenTitle(state, title)`: non-empty key that matches `progress.recent`, pending titles or `progress.missed`.
4. `recent-for-request.ts`: `recentForRequest(state)`: `progress.recent` then pending titles, de-duplicated by non-empty key keeping the latest position, last 20. `RECENT_SENT` moves to `constants.ts`. Pending titles are last and number at most 8, so they're never cut. Exported from `engine/index.ts`. The store calls this in `runFetch` in place of `progress.recent.slice(-RECENT_SENT)`.
5. `apply-batch-event.ts`, `card` case: after `normalizeGenerated`, return `state` if `isSeenTitle`. `received` isn't incremented. The drop is silent: there's no client reporting path, so the drop rate isn't visible, and the server's `sent` count and batch log still include dropped cards.
6. `start-session.ts`: when `starterDone` is false, deal only starter cards whose title isn't in `progress.recent`. If none remain, set `starterDone` to true and show the welcome card. That branch isn't reachable with today's deck, because card 6 sets `starterDone` in the same commit as its title. It's a guard against a deck edit shipped over the air, which would otherwise hang on the loading card. Update the function's doc comment and the `Progress.recent` comment, which now has a second job.
7. Tests in `src/game/engine.test.ts`, `src/store/game-store.test.ts` and a new reload test in `e2e/`. `manualBatches` starts recording `req`. Update `e2e/generated.spec.ts:29` for the new request.
8. NOTES.md only if it documents this behaviour.

Trade-offs:
- Title matching assumes repeats keep their title. Nothing has measured that. The prompt already tells the model not to repeat titles, so a reworded repeat is a likely way one survives, and this fix doesn't catch it.
- Title matching can drop a different card that shares a title. That costs one card from a paid batch, never a wrong answer.
- The model is told at most 20 titles, fewer when titles are pending. The app enforces up to 30 recent titles plus up to 30 missed ones. A card matching one the model wasn't told about is paid for and dropped.
- A short batch can bring the next fetch forward, so one queue fill can take more batches. Each counts toward the 60-a-day limit, and a single-topic player is the worst case.
- An all-duplicate batch uses the existing error copy, "The card writer had a problem with that batch", which is misleading here. Try again sends nearly the same request, and for a single-topic player the domain can't vary.
- A second all-duplicate batch stops fetching with nothing shown until the queue runs out.
- Generated repeats older than 30 cards can still happen.

## Success criteria

1. A generated card whose title key matches `progress.recent`, the current card, the queue, unplayed starter cards or `progress.missed` never enters the queue or the current slot (engine tests, one per source).
2. Two cards with matching keys in one batch: only the first is kept (engine test).
3. Matching ignores case, punctuation and spacing (`"Double-Booking!"` matches `"double booking"`), and a title with an empty key is never treated as a duplicate (engine test).
4. The request's `recent` includes queued, current and unplayed starter titles, has at most 20 entries, has no two entries with the same non-empty key, and keeps every pending title when history is full (store test on the captured `FetchBatch` request).
5. From the loading card with no rematch available, an all-duplicate batch ends on the error card, with `inFlight` false and no fetch started on `done`. While a card is showing, it sets `fetch.error` and leaves the current slot alone (engine or store tests).
6. Partial duplicates: the batch succeeds with the fresh cards only, and `received` counts only those (engine test).
7. A generated card matching `progress.missed` is dropped, and that missed card is still served as a rematch (engine test).
8. A player who answers, skips or flags some starter cards and restarts gets only the rest, with no XP awarded twice, and finishing them sets `starterDone`. A missed starter still comes back as a rematch. A player whose every starter title is in `recent` with `starterDone` false gets the welcome card with `starterDone` true (engine tests, a store test restarting from flushed saved progress, and an e2e test that answers two cards, reloads, and sees card 3 with XP unchanged).
9. After `npm ci`, `npm run guard` passes, the e2e suite passes, and `node_modules/.bin/fingerprint fingerprint:generate --platform ios` still gives `9d6c4336399ee7354f3678b52cfe31dbd1b9b859`.

Not verified by this unit: behaviour with the live model, which costs money and needs a throwaway harness, because `scripts/cards-eval.ts` sends `recent: []`; and behaviour on a device.

## Open Questions

- Which repeats the user saw isn't known: starter replay, generated cards, or deliberate rematches. Starter replay and generated repeats are both fixed here. If the user saw rematches, this PR won't change that, and the final report says so.
