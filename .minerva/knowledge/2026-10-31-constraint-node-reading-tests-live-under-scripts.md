# Tests that read files with `node:fs` live under `scripts/`, not `src/`

**Date**: 2026-10-31
**Type**: constraint
**Theme**: guardrails
**Summary**: A test needing `node:fs` goes under `scripts/`; a triple-slash node reference fails dependency-cruiser.
**Context**: .minerva/work/2026-10-31-brand-assets (see git history if the worktree has been cleaned up)

## Finding
The palette sync test was first written as `src/theme/colors.test.ts`, reading `app.json` and `README.md` with `node:fs`. Under the root tsconfig that is TS2591 (no Node types). A `/// <reference types="node" />` line typechecks, but dependency-cruiser reports it as `not-to-unresolvable: … → node`, and `npm run guard` fails at the architecture step. The test lives at `scripts/brand/palette.test.ts` instead: Vitest includes `scripts/**/*.test.ts`, `scripts/tsconfig.json` has Node types, and nothing forbids `scripts/` importing `@/theme/colors`.

Two smaller things from the same test:
- `sonarjs/unused-named-groups` does not see a named group read through destructuring, so a regex whose groups are destructured uses positional groups.
- `npm run guard | tail` reports `tail`'s exit code. Capture the guard's own status (`npm run guard > log; echo $?`) before calling a change done.

## Implications
- Repository-reading tests belong beside the scripts, under `scripts/`, which keeps Node globals out of client code.
- A triple-slash types reference is a dependency to dependency-cruiser; do not use one to borrow Node types in `src/`.

## Related
- [[2026-10-31-constraint-typescript-6-types-default-to-none]] — the tsconfig split this follows from
