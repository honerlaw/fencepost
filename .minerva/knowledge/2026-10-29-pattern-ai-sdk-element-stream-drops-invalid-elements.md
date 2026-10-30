# The AI SDK's elementStream silently drops schema-invalid elements, so validation happens in normalize

**Date**: 2026-10-29
**Type**: pattern
**Theme**: card-pipeline
**Summary**: elementStream drops invalid elements silently; validate pass-through and normalize every element ourselves.
**Context**: .minerva/work/2026-10-29-fencepost-v1 (see git history if the worktree has been cleaned up)

## Context
`/api/cards` streams cards with AI SDK 7 `streamText` + `Output.array({ element })` + `elementStream`. The plan assigns each element index a slot (type, and which slot is the boss), and the batch log line reports `sent` and `dropped`.

## Finding
- **Silent drops.** When the element schema validates, `elementStream` silently skips elements that fail it. Every later element then shifts onto the wrong plan slot, and the drop count can't be seen.
- **Pass-through schema.** `src/server/card-source.ts` sends the model the strict RawCard JSON schema through `jsonSchema(() => zodSchema(RawCardSchema).jsonSchema, { validate: pass-through })`. Each element is then validated by `normalize`, which counts drops and keeps slots aligned by index.
- **Errors arrive through `onError`.** Model errors don't throw out of `elementStream`. They arrive through `onError` and are rethrown after the loop. They become `ModelFailedError` only when no card has been sent yet, which is what triggers the `CARD_MODEL_FALLBACK` retry.

## Implications
- Don't switch `Output.array` back to a validating element schema.
- Don't assume a `for await` over `elementStream` throws on failure. Check `onError`.
- Tests use `MockLanguageModelV4` + `simulateReadableStream` from `ai/test` to cover malformed elements and fallback.

## Related
- [[2026-10-29-constraint-card-server-rate-limits-are-per-machine]] — the other server-side constraint on /api/cards
