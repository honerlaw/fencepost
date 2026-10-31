# TypeScript 6 includes no ambient @types by default

**Date**: 2026-10-31
**Type**: constraint
**Theme**: guardrails
**Summary**: TS 6 defaults `types` to none, so `scripts/` has its own tsconfig with Node types.
**Context**: .minerva/work/2026-10-31-repo-guardrails (see git history if the worktree has been cleaned up)

## Context
Typechecking `scripts/` failed on `process` and `node:` imports even though `@types/node` was installed. In TS 6, `types` defaults to an empty list rather than every package under `@types`.

## Finding
`scripts/tsconfig.json` sets `types: ["node"]`, and the root `tsconfig.json` excludes `scripts`, so app code keeps React Native's globals and never sees Node's. `npm run typecheck` and CI run both projects. `@types/node` is a dev dependency.

## Implications
- Adding Node types to the root config would make Node globals typecheck in client code, which removes a check.
- A new top-level Node directory has to join a tsconfig, or it goes unchecked.

## Related
- [[2026-10-31-reference-guardrail-limits]] — other limits of the checks
