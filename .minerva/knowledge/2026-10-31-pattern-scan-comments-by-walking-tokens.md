# Find comments by walking parsed tokens, not with a TypeScript scanner or a regex

**Date**: 2026-10-31
**Type**: pattern
**Theme**: guardrails
**Summary**: Comment scans must walk parsed tokens; bare scanners lose sync at template literals.
**Context**: .minerva/work/2026-10-31-repo-guardrails (see git history if the worktree has been cleaned up)

## Context
`scripts/guardrails/check-suppressions.ts` budgets every suppression comment. Its first version used `ts.createScanner`. Any `eslint-disable` after a template literal with a `${}` passed unseen, because a bare scanner cannot find the end of the substitution without the parser's help and loses its place for the rest of the file.

Parsing `.ts` files as TSX caused a second miss: a generic arrow such as `<T>(a: T) => a` broke the parse.

## Finding
`commentHits` parses the file with the script kind for its extension, walks `node.getChildren`, and collects the leading and trailing comment ranges of each token. Three details matter:

- The walk stops at JSDoc nodes, which are also comment ranges of the node they document. Otherwise a directive in JSDoc counts twice.
- Ranges inside `JsxText` are dropped, because `//` in JSX text is text.
- A range can be reported by two tokens, so ranges are keyed by start position.

## Implications
- Any future tool that reads comments or syntax should reuse this walk.
- File lists from git use `-z`. Without it, git C-quotes non-ASCII paths and the file is silently skipped or missed.
- The same walk in `isFocusOrSkip` means `.skip` and `.only` in code are counted, and the words in a string are not.

## Related
- [[2026-10-31-reference-guardrail-limits]] — what the budget does not see
