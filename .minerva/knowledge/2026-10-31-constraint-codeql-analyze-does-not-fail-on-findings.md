# CodeQL's analyze step does not fail a job on findings

**Date**: 2026-10-31
**Type**: constraint
**Theme**: guardrails
**Summary**: CodeQL analyze only uploads results, so a separate SARIF check must fail the job.
**Context**: .minerva/work/2026-10-31-repo-guardrails (see git history if the worktree has been cleaned up)

## Context
The first version of the `codeql` job was in `ci-required` and looked like a gate. The Verifier found it could never fail: `github/codeql-action/analyze` uploads SARIF and exits 0 whatever it found.

GitHub's own way to block on code scanning results is a separate ruleset rule, which reads alert state rather than this run's output.

## Finding
The job writes SARIF with `output: sarif-results`, then `.github/scripts/check-codeql.sh` fails on any result whose rule has a `security-severity` of 4.0 or more. Results with a non-empty `suppressions` array are skipped.

## Implications
- Any tool that only uploads results needs its own failing step. Check with a planted finding, not by reading the workflow.
- Dismissing an alert in the GitHub UI does not change the gate, because the script reads the SARIF from the current run.
- Quality-only results have no `security-severity` and do not block.

## Related
- [[2026-10-31-decision-blocking-gates-depend-only-on-the-commit]] — CodeQL blocks because its packs are fixed by the pinned action
