# What the repository guardrails do not catch

**Date**: 2026-10-31
**Type**: reference
**Theme**: guardrails
**Summary**: Guardrail gaps: PR-run scripts can bypass checks, no native compile, advisory scans unread.
**Context**: .minerva/work/2026-10-31-repo-guardrails (see git history if the worktree has been cleaned up)

## Context
The guardrails are strict, and it is easy to read a green `ci-required` as proof of more than it shows. These are the standing limits, recorded so nobody assumes otherwise.

## Finding
- **`guardrails-approved` is a speed bump.** `check-guardrail-changes.ts` and `ci.yml` run from the PR's own commit, so a PR that edits them can change what the check does. The Claude hook and AGENTS.md stop the accident, and the label leaves an audit trail. Neither is a security boundary.
- **Claude Code hooks are advisory.** `block-bypass.mjs` matches command text, and CI is what enforces the gates.
- **No native compile in CI.** The build gate is web and native JS exports. A native build failure can still merge.
- **The advisory job is a report.** It cannot block, and it passes the run through `continue-on-error`, so someone has to read it.
- **Semgrep matches by name.** `stream-text-needs-limits` catches `streamText` and `$AI.streamText`, but not a named import under an alias.
- **`package.json` is not a guarded path.** CI calls tools directly for this reason, so gutting an npm script cannot weaken a gate.
- **No mutation testing.** Stryker was not added, so coverage shows lines ran, not that tests would fail if the code broke.
- **Dependabot npm PRs need a repo setting.** `.github/dependabot.yml` allows only security updates, and none open unless Dependabot security updates are on.

## Implications
Treat `ci-required` as proof that these checks passed on this commit, not that the change is right. Review changes to `.github/` and `scripts/guardrails/` by hand even when green.

## Related
- [[2026-10-31-decision-main-is-guarded-by-a-ruleset]] — the gate these limits apply to
