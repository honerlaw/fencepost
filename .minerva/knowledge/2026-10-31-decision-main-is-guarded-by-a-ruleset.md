# main is guarded by a repository ruleset that requires one aggregate check

**Date**: 2026-10-31
**Type**: decision
**Theme**: guardrails
**Summary**: A `main` ruleset with no bypass requires `ci-required`, which fails unless every blocking job succeeds.
**Context**: .minerva/work/2026-10-31-repo-guardrails (see git history if the worktree has been cleaned up)

## Context
The plan was classic branch protection. The owner asked for repository rulesets instead and configures them directly.

GitHub treats a skipped job as passing for a required check. Requiring each job by name would also mean a ruleset edit every time a job changes.

## Finding
- The ruleset `main` (id 26272396) targets the default branch, has an empty bypass list, and blocks deletion and force pushes.
- It requires a pull request with 0 approvals, because a solo developer cannot approve their own PR.
- It requires `ci-required` from GitHub Actions (integration id 15368), so nothing else can post that name.
- `ci-required` lives in `.github/workflows/ci.yml`, `needs` every blocking job, runs with `if: always()`, and fails unless every result is `success`. Failed, cancelled and skipped all fail.

## Implications
- An empty bypass list binds admins too, so classic protection's `enforce_admins` question no longer exists.
- Break-glass is setting the ruleset to Disabled and back: **Settings > Rules > Rulesets > main > Enforcement status**. This is the only way around the check.
- Renaming `ci-required`, or adding a path filter or job-level `if:` that skips it, leaves PRs hanging on a check that never reports.
- A new blocking job must be added to `needs`, or it blocks nothing.

## Related
- [[2026-10-31-decision-blocking-gates-depend-only-on-the-commit]] — what may join `needs`
- [[2026-10-31-reference-guardrail-limits]] — what a PR can still do
