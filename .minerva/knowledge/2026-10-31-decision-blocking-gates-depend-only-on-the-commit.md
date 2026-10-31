# Blocking CI gates depend only on the commit; anything that reads the outside world is advisory

**Date**: 2026-10-31
**Type**: decision
**Theme**: guardrails
**Summary**: Blocking gates depend only on the commit; online scans run advisory; Expo checks offline.
**Context**: .minerva/work/2026-10-31-repo-guardrails (see git history if the worktree has been cleaned up)

## Context
`ci-required` blocks every merge to `main`. The first full guard run failed on `expo install --check` with no change to the commit, because Expo had published new patches of expo, expo-router and expo-sqlite. Any gate that compares with something published today can turn every open PR red for a reason no PR caused.

A first draft moved the check to advisory. The panel rejected that: no CI job compiles native code, so this is the only blocking gate that catches a wrong native version.

## Finding
A gate blocks only if its result is fixed by the commit. Scanners that read live data stay out of `ci-required`.

- **Blocking:** `expo install --check --json` with `EXPO_OFFLINE=1`. Offline, the CLI reads `expo/bundledNativeModules.json` from the installed `expo` package, and the lockfile fixes that file. `--json` exits before the interactive fix prompt.
- **Also blocking:** tools pinned by version or SHA, such as semgrep with repo-local rules, gitleaks, and CodeQL with packs fixed by the pinned action.
- **Advisory:** osv-scanner, `npm audit`, expo-doctor, the online `expo install --check` and semgrep registry packs, in the `advisory` job with `continue-on-error`, on PRs and weekly.

`dependency-review` is the one deliberate exception. Its advisory data changes over time, but it reports only on dependencies the PR adds, so a new advisory cannot freeze an unrelated PR.

## Implications
- Before adding a gate, ask what changes its result with no commit. If the answer is anything, it goes in `advisory`.
- `EXPO_OFFLINE` is scoped to the one step, so no other command loses network access.
- Moving `expo` or one mapped package alone can fail the offline check. Fix it with `npx expo install --fix`.
- The offline check does not see recommendations published after the installed map shipped, remote-only entries (`expo`, `typescript`, `@types/react`), or packages outside the map. The advisory check covers the first two groups.
- `check-pins` rejects `expo.install.exclude`, which would hide packages from the check.

## Related
- [[2026-10-31-reference-guardrail-limits]] — what these gates do not catch
