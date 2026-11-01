# A commit in a fresh worktree runs no hooks

**Date**: 2026-10-31
**Type**: reference
**Theme**: guardrails
**Summary**: Before `npm ci`, lefthook is missing in a new worktree and commits pass unchecked.
**Context**: .minerva/work/2026-10-31-review-answered-cards (see git history if the worktree has been cleaned up)

## Context
A minerva unit's first commit happens right after `git worktree add`, before any dependencies exist there.

## Finding
With no `node_modules`, the hook prints "Can't find lefthook in PATH" and the commit succeeds without running any check. After `npm ci` in the worktree the hooks run normally. `.claude/hooks/block-bypass.mjs` also blocks any command that mentions the git hooks setting, even a read of it.

## Implications
Run `npm ci` in a new worktree before committing code. CI still runs the blocking gates, so this affects local feedback only.

## Related
- [[2026-10-31-reference-guardrail-limits]] — other gaps in local and CI checks
