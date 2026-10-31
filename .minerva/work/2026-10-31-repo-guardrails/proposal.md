# Proposal: repo-guardrails

**Date**: 2026-10-31
**Status**: Draft

## Goal
Every PR runs a required check covering types, lint, tests, build and deterministic security analysis, and that check is what stands between a branch and main: a failing PR cannot be merged through the normal path, and the only way around it is a deliberate, visible settings change by the owner. The checks are strict enough to catch the specific ways AI-written code goes wrong. Adopt @onerlaw/agentic-eslint-plugin.

## Why
Fencepost was written almost entirely by agents and has no CI at all, so nothing stops a broken build from merging. Agents' typical failures (loose types, `any`, swallowed errors, suppressions, invented dependencies, dead code, weakened tests, leaked secrets, boundary violations) are detectable statically.

The request, verbatim:

> "lets go ahead and add extremely strict guardrails across the entire repository as well as add my custom https://github.com/onerlaw/agentic-eslint-plugin, also lets add any additional static code analysis security anyalsis / etc tooling to try and add as many guardrails against AI generated code going off the rails, summarize in the PR everything you added outside of my explicit plugin, if yo have recommendations for custom plugins also tell me and we can decide if we should do it."
> Mid-run addition: "also we should add this so it runs on every PR that we create, same for build to make sure we dont erge a broken build"

Facts verified at intake:

- Expo SDK 58 / RN 0.88 / TS 6.0.3 / ESLint 9.39.5 / Vitest 5 / Playwright. ~5.4k lines in src, scripts, e2e. npm (package-lock.json).
- No CI exists (.github/ absent). main is unprotected, public repo, allow_auto_merge=false. Solo developer.
- ESLint today: eslint-config-expo/flat only. tsconfig: strict only. No formatter. No hooks.
- The plugin: npm @onerlaw/agentic-eslint-plugin@0.2.0, maintainer is the user, repo authored by the user, peer eslint>=9, flat config. No preset by design: each rule gets its own config block; rules with required options error if unconfigured.
- Compatibility: typescript-eslint 8.72 supports TS <6.1. eslint-plugin-unicorn >=66 needs ESLint >=10.4, so 65 is the newest usable on ESLint 9. An ESLint 10 bump is out of scope.
- Secrets: Doppler only (AGENTS.md). CI needs no secrets: e2e uses a local stub OpenRouter with a fake key.
- Project memory: no Fly commands; ask before pushing. The user's request this run names a PR, which authorizes push + PR. It does not authorize merging.

## Approach
One work unit, one PR (the seed says "the PR"; phasing would need merges that are not authorized). Commit order keeps review and bisect workable: tooling and config, Prettier reformat alone, ESLint autofix alone, manual fixes grouped by rule family, CI last.

### Layer 1: compiler
tsconfig adds noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noImplicitReturns, noFallthroughCasesInSwitch, noUnusedLocals, noUnusedParameters, noPropertyAccessFromIndexSignature, allowUnreachableCode=false, allowUnusedLabels=false.

### Layer 2: ESLint (--max-warnings 0, --report-unused-disable-directives)
- eslint-config-expo/flat stays as the base (React, hooks, compiler rules). It already registers `import`, `react`, `react-hooks` and `@typescript-eslint`, so the first work step proves the combined config loads, reusing its registrations rather than redefining a plugin name (ESLint throws on a redefined plugin, and a second typescript-eslint copy would split versions).
- @onerlaw/agentic-eslint-plugin, each rule in its own block: no-credential-in-url (all files), no-biome-ignore (all files), one-export-per-file (src, excluding src/app and tests), tamagui-native-id (src TSX), responsive-two-pane-flex and workspace-chrome-flex (src/components, if they match this layout), quality-model-token-floor only if a real tier function exists here. workspace-runtime-imports, rpc-error-standard, markdown-map-code-styles do not apply (no workspaces, no Connect-RPC, no markdown lib) and are left off, documented in the config.
- typescript-eslint strictTypeChecked + stylisticTypeChecked.
- sonarjs, security, regexp, unicorn@65, import-x (cycles, extraneous, unresolved), promise, no-unsanitized, eslint-comments (descriptions required, no unlimited disables), @vitest/eslint-plugin (no focused/disabled tests, expect-expect), eslint-plugin-playwright, react-you-might-not-need-an-effect.
- eslint-plugin-vibe-proof is third-party and optional: adopted only if its source review passes, pinned to an exact version, with the review recorded. Dropped with a note otherwise.
- Project-specific rules via no-restricted-imports / no-restricted-syntax, each citing its source: pure core (src/game, src/cards) cannot import react/expo/tamagui/zustand and cannot call Date.now / Math.random (proposal v1 criterion 5); client code cannot import src/server; process.env only in src/server/from-env.ts + scripts, and no EXPO_PUBLIC_ reads (AGENTS.md Secrets); no bare fetch of '/api', apiUrl required (2026-10-29-bug-expo-fetch-ignores-relative-urls-on-native).

### Layer 3: standalone quality tools
prettier (repo reformatted once), knip (dead code, unused deps), dependency-cruiser (layer rules, no cycles), jscpd (duplication threshold), type-coverage, vitest coverage thresholds, lockfile-lint (registry + https only), `expo install --check`, plus scripts/guardrails/:
- check-suppressions: any eslint-disable / @ts-ignore / @ts-expect-error / `as X` / non-null `!` / .skip must be on a checked-in allowlist with a reason. The allowlist starts as whatever is genuinely needed, with no blanket entries.
- check-pins: Tamagui stays exactly 2.7.7 (2026-10-29-decision-tamagui-pinned-to-2-7-7).
- check-bundle-secrets: v1 criterion 7's grep over web and native exports.
- check-guardrail-changes: fails on a PR that touches a guardrail file (list in .github/guardrail-paths.txt: eslint config, tsconfig, knip, dep-cruiser, jscpd, thresholds, suppression allowlist, workflows and the dependency-review config, scripts/guardrails, .claude/settings.json, lefthook) unless the PR carries the `guardrails-approved` label. Bootstraps: passes when the base branch has no path list, so this PR is exempt. Limit stated plainly: an agent with repo write could add the label; AGENTS.md forbids it, the Claude hook blocks the command, and the label is visible on the PR. It is a speed bump plus an audit trail, not a security boundary.
Coverage, type-coverage and jscpd thresholds are set from measurements and only ever ratchet upward.

### Layer 4: security tooling
Blocking (deterministic for a given commit): gitleaks binary with checksum and fetch-depth 0 (not the action, which needs a licence for orgs); semgrep with repo-local rules in .semgrep/ run anonymously; CodeQL as an advanced workflow job with default setup off, query packs fixed by the pinned action; dependency-review-action (only newly added vulnerable deps; relies on the dependency graph, on by default for public repos, verified on the PR's first run). If a new dev dependency brings a vulnerable transitive package, it is upgraded, overridden or removed. It only gets an allowlist entry in the action's config, with a reason, if it is dev-only and no fix exists, and that entry is listed in the PR body; zizmor + actionlint; hadolint.
Advisory, time-varying, reported but not in ci-required: osv-scanner, npm audit, semgrep registry packs, expo-doctor. They also run weekly. A newly published advisory must never freeze unrelated PRs; Dependabot security updates handle those.
Overlaps are deliberate: sonarjs + security + semgrep + CodeQL work at different depths; osv/audit look at the whole tree while dependency-review looks at the diff; knip finds unused code while depcruise polices edges.

### Layer 5: build gate
Every PR: web export, native export (ios + android), bundle-secret check, `vitest run --coverage`, Playwright e2e with the same stub as today, docker build with no push. No Fly, no deploy.

### Layer 6: enforcement
- One workflow, `.github/workflows/ci.yml`, triggered by pull_request (opened, synchronize, reopened, labeled, unlabeled) and push to main. Label events rerun the workflow, which is accepted, since a rerun is the only way the label check can update and repo labels are rare, with no paths filters and no skipping job-level `if:` on required jobs. Aggregate job `ci-required` lives in that workflow, `needs` every blocking job, runs with `if: always()`, and fails unless every needs result is `success` (failure, cancelled and skipped all fail).
- CI policy: `permissions: contents: read` by default, every action SHA-pinned, binaries pinned by version + checksum, never pull_request_target, no secrets, `timeout-minutes` on every job, concurrency per ref with cancel-in-progress only for pull_request events, so push-to-main runs always finish, npm cache, retries 0 (a flaky test is a bug, not something to mask).
- Branch protection is the last step, after a green run, and needs the user's confirmation at that moment because it is a repo-settings change outside the PR: require a PR, require `ci-required` bound to the GitHub Actions app (app_id 15368) so nothing else can post that name, block force-push and deletion, no required reviews (a solo dev cannot self-approve). The confirmation also decides enforce_admins. If declined, the exact command is left in the PR body and criterion 8 is reported unmet, not silently dropped.
- Break-glass documented in AGENTS.md: if CI itself breaks and a repair PR cannot pass, the owner runs `gh api -X DELETE repos/honerlaw/fencepost/branches/main/protection/enforce_admins` (or removes the required check), merges the repair, and restores it. Renaming the `ci-required` job needs the protection updated in the same step.
- lefthook: pre-commit (format, eslint on staged, gitleaks), commit-msg (commitlint), pre-push (typecheck, tests). Convenience only; CI is the gate. Installed by a guarded `prepare` that exits 0 when there is no .git, or CI is set, so npm ci in Docker (.git is dockerignored) and EAS cannot break; the docker build gate proves it.
- `.claude/settings.json` hooks: PreToolUse blocks `git commit --no-verify`, `git push --no-verify`, and adding the `guardrails-approved` label; PostToolUse lints the edited file. Hooks live alongside the existing enabledPlugins key.
- `npm run guard` runs every local check. AGENTS.md documents it, the required check, the no-weakening rule and break-glass.
- Dependabot: github-actions and npm security updates.
- Optional, non-blocking, outside the success criteria: weekly Stryker on src/game + src/cards, only if it works with Vitest 5. Otherwise a recommendation in the PR body.

### Fixing existing violations
Everything starts at error; existing violations are fixed here, no baseline or bulk suppression. No `!` or `as X` added just to silence an error: narrow or validate instead. Volume fallback: a rule that is wrong for this codebase, or that produces mass violations with no signal, is turned off or narrowed in eslint.config with a one-line reason. A genuinely correct exception gets a scoped disable with a description plus an allowlist entry. Read 2026-10-29-decision-web-renders-after-mount before touching the mount gating, so a rule cannot "fix" that behaviour away.

### Out of scope
ESLint 10 upgrade. Fly/EAS deploy steps. Merging the PR: auto-merge stays off, the user decides. Writing new custom rules for the plugin (recommendations only, per the seed).

## Success criteria
1. `npm run guard` exits 0 on the branch and runs every local check in Layers 1-3. check-guardrail-changes is CI-only, because it needs the PR's labels and base branch, and is listed as such.
2. `@onerlaw/agentic-eslint-plugin` is a devDependency, and each applicable rule is enabled at error in its own block. The evidence file lists every rule the plugin exports with an applicability decision and reason. For each enabled rule, a deliberately violating temp file makes lint fail, also recorded there.
3. `npx tsc --noEmit` and `npx expo lint` pass with zero errors and zero warnings under the new config; eslint-config-expo remains the base.
4. Each blocking gate has a negative control: a deliberate violation demonstrably fails it, recorded in the evidence file, so no tool is wired but inert. A control that cannot run locally is proven in CI on the PR.
5. `vitest run` passes with at least as many tests as main (count recorded before and after), with no existing assertion removed or weakened. `npm run e2e`, web + native export, bundle-secret check and docker build all pass.
6. `.github/workflows/ci.yml` runs on every pull_request to main, a green `ci-required` run exists on the PR, and actionlint + zizmor pass on it.
7. A real run on the PR shows a deliberately failing blocking job turning `ci-required` red. The commit is reverted before the PR is finished.
8. Branch protection on main requires `ci-required` (app_id 15368), verified with `gh api`. If the user declines, this is reported as unmet with the command in the PR body.
9. The PR body lists everything added besides the plugin, lists custom-rule recommendations for the user to decide on, and lists every rule turned off or narrowed, and every allowlist entry, with its reason and a total count.
10. AGENTS.md documents `npm run guard`, the required check, the no-weakening rule and break-glass. No secret is added to CI.

## Open Questions
One deliberate user gate at the end of the run: confirm branch protection and choose enforce_admins (criterion 8). Everything else is decided during work and recorded: plugin rule applicability; measured coverage, type-coverage and jscpd thresholds; vibe-proof adoption; expo-doctor stability.
