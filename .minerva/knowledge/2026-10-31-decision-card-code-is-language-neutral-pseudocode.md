# Card code is language-neutral pseudocode, backed by a denylist gate in normalize

**Date**: 2026-10-31
**Type**: decision
**Theme**: card-pipeline
**Summary**: Cards use a short pseudocode dialect and explain their data; `findLanguageSyntax` drops code that leans on a real language.
**Context**: .minerva/work/2026-10-31-readable-pseudocode-cards (see git history if the worktree has been cleaned up)

## Context
The prompt asked for "Python-like" code, so cards were real Python. A list comprehension on the starter card "Three per minute" was unreadable to a player, and `log[user]` was never explained. Two starter answers depended on `//`, which reads as a comment outside Python.

## Finding
- **The dialect lives in the prompt.** It lists allowed forms and operators, and tells the model to say anything else in words or with a plainly named helper.
- **The gate lives in `cleanCode`.** `findLanguageSyntax` strips double-quoted strings and names the first banned construct on a line. Flaw, break and trace cards that trip it are dropped, not patched.
- **The prompt no longer lists banned constructs.** The long list added reasoning time, so the gate enforces them alone. See [[2026-10-31-constraint-card-prompt-rules-cost-reasoning-time]].
- **`prompt` and `input` allow 40 words and 320 characters,** because 25 words left no room to explain data.

## Implications
- It's a denylist, so it can't prove a card is readable. An independent read of 55 cards found `range(` (now gated), a list literal and `key in cache` (readable, left alone), and unstated rules that no gate can see.
- `model` and `order` cards and prose fields aren't gated. Symbols such as `%` are normal in prose.
- `loadStarterDeck` throws on a card that fails `normalize`, so a starter card that trips the gate breaks launch. A unit test runs the real loader.
- A new gate rule can drop real dialect. Add the near miss to the allow list in `src/cards/language-syntax.test.ts` with it.

## Related
- [[2026-10-29-pattern-ai-sdk-element-stream-drops-invalid-elements]] — why a gate drop keeps plan slots aligned
- [[2026-10-29-bug-code-font-ligatures-break-comparison-puzzles]] — `==` and `<=` stay in the dialect, so they still render through `codeText()`
