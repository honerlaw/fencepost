# Proposal: repo-guardrails

**Date**: 2026-10-31
**Status**: Shipped (2026-10-31)

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
One work unit, one PR. A strict type and lint baseline, standalone quality tools, security scanners, a build gate and repository rules together form one required check. Existing violations were fixed, not baselined.

### Layer 1: compiler
tsconfig adds noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noImplicitReturns, noFallthroughCasesInSwitch, noUnusedLocals, noUnusedParameters, noPropertyAccessFromIndexSignature, allowUnreachableCode=false and allowUnusedLabels=false. `scripts/` has its own tsconfig with Node types, because TS 6 defaults `types` to none and the app must keep React Native's globals.

### Layer 2: ESLint (`--max-warnings 0`, unused disable directives are errors)
- eslint-config-expo/flat stays the base.
- `@onerlaw/agentic-eslint-plugin`, one block per rule: no-credential-in-url and no-biome-ignore everywhere, one-export-per-file in `src` except routes and tests, tamagui-native-id in `src` TSX, responsive-two-pane-flex in components and routes. The other rules do not apply here and are documented in the config and `negative-controls.md`.
- typescript-eslint strictTypeChecked and stylisticTypeChecked, sonarjs, security, no-unsanitized, regexp, unicorn 65, import-x (cycles and unresolved imports are covered by dependency-cruiser and `import/no-unresolved`, not import-x), promise, eslint-comments, @vitest/eslint-plugin, eslint-plugin-playwright, react-you-might-not-need-an-effect.
- eslint-plugin-vibe-proof 1.10.0, exact pin, after a source review (MIT, no install scripts, no network, exec or eval), with a curated rule list.
- Project bans in `no-restricted-imports` and `no-restricted-syntax`: the pure core has no framework imports, clock or randomness; client code cannot import server code; `process.env` only in `src/server/from-env/`; no cast `JSON.parse`; no relative `fetch`.

### Layer 3: standalone quality tools
prettier (repo reformatted once), knip, dependency-cruiser, jscpd (threshold 0, measured 0.00%, which reliably catches whole-file copies only), type-coverage (99%), vitest coverage floors (statements 90, branches 84, functions 87, lines 93), lockfile-lint, and `expo install --check`. See replan.md: the blocking form runs offline against the lockfile-pinned map, and the online form is advisory. `scripts/guardrails/` holds:
- check-suppressions: a token walk budgets disable comments, `as` casts, non-null `!` and focused or skipped tests against `suppressions.json` (12 entries). Casts and `!` in test files are exempt.
- check-pins: Tamagui stays exactly 2.7.7, and `expo.install.exclude` is rejected.
- check-bundle-secrets: scans web and native exports for key names and key shapes.
- check-guardrail-changes (CI only): a PR touching a path in `.github/guardrail-paths.txt` needs the `guardrails-approved` label. It passes when the base has no path list, so this PR is exempt, and it fails on an unknown base. Renames are seen as a delete plus an add.

`npm run guard` runs Layers 1-3 and the build exports to the end. `npm run guard:security` runs gitleaks and semgrep.

### Layer 4: security tooling
Blocking: gitleaks (checksum-pinned binary, full history), semgrep with `.semgrep/` rules, CodeQL with a SARIF gate (the analyze step cannot fail on a finding by itself; rules are read from driver and extensions, and a SARIF with no rules fails), dependency-review failing on moderate or higher in runtime and development scopes, zizmor, actionlint, hadolint.
Advisory, in one job with `continue-on-error`, on PRs and weekly: osv-scanner, npm audit, expo-doctor, online `expo install --check`, semgrep registry packs.

### Layer 5: build gate
Every PR runs web and native exports, the bundle-secret check, `vitest run --coverage`, Playwright e2e against the stub, and a docker build with a run of `/api/health`. There is no native compile and no deploy.

### Layer 6: enforcement
- `.github/workflows/ci.yml` runs on pull_request (including label events), push to main and weekly. The aggregate job `ci-required` needs every blocking job, runs with `if: always()`, and fails unless every result is `success`.
- CI policy: `contents: read` by default, SHA-pinned actions, checksum-pinned binaries, no `pull_request_target`, no secrets, a timeout on every job, cancel-in-progress for PRs only, concurrency grouped by PR number or SHA. Tools are called directly, not through package.json scripts, because `package.json` is not a guarded path.
- `main` is guarded by a repository ruleset, not classic branch protection, at the owner's request. It has no bypass list and blocks deletion and force pushes. The owner adds the pull request rule (0 approvals) and required status check `ci-required` from GitHub Actions (integration id 15368). Break-glass is the ruleset's Enforcement status, documented in AGENTS.md.
- lefthook: pre-commit (format, eslint on staged files, gitleaks), commit-msg (commitlint), pre-push (types, tests). Installed by a guarded `prepare`, so Docker and EAS installs skip it.
- `.claude/` hooks: `block-bypass.mjs` refuses `--no-verify`, `git commit -n`, `core.hooksPath`, `LEFTHOOK` settings and adding the approval label. `lint-edited-file.mjs` lints each edited file in this repository.
- Dependabot: github-actions updates weekly; npm security updates only. These need the repository's Dependabot security updates setting, which is off unless the owner turns it on. The dependency graph was turned on for dependency-review, which also turned on Dependabot alerts.
- expo, expo-router and expo-sqlite were bumped to current patches so the online check starts green. The Dockerfile uses `USER 1000:1000` for hadolint.
- Stryker was not added. It is a recommendation in the PR body.

### Fixing existing violations
Everything started at error, and existing violations were fixed in this PR with no baseline or bulk suppression. Rules that were wrong for this codebase are off or narrowed in `eslint.config.mjs` with a reason, and correct exceptions have budget entries.

### Out of scope
ESLint 10, Fly and EAS deploy steps, merging the PR, and writing new custom plugin rules (recommendations only).

## Success criteria
1. `npm run guard` exits 0 on the branch and runs every local check in Layers 1-3. check-guardrail-changes is CI-only, because it needs the PR's labels and base branch, and is listed as such.
2. `@onerlaw/agentic-eslint-plugin` is a devDependency, and each applicable rule is enabled at error in its own block. The evidence file lists every rule the plugin exports with an applicability decision and reason. For each enabled rule, a deliberately violating temp file makes lint fail, also recorded there.
3. `npx tsc --noEmit` and `npx expo lint` pass with zero errors and zero warnings under the new config; eslint-config-expo remains the base.
4. Each blocking gate has a negative control: a deliberate violation demonstrably fails it, recorded in the evidence file, so no tool is wired but inert. A control that cannot run locally is proven in CI on the PR.
5. `vitest run` passes with at least as many tests as main (count recorded before and after), with no existing assertion removed or weakened. `npm run e2e`, web + native export, bundle-secret check and docker build all pass.
6. `.github/workflows/ci.yml` runs on every pull_request to main, a green `ci-required` run exists on the PR, and actionlint + zizmor pass on it.
7. A real run on the PR shows a deliberately failing blocking job turning `ci-required` red. The commit is reverted before the PR is finished.
8. The `main` ruleset requires a pull request and `ci-required` from GitHub Actions (integration id 15368), verified with `gh api`. The owner adds these rules; until then this is reported as unmet, with the steps in the PR body.
9. The PR body lists everything added besides the plugin, lists custom-rule recommendations for the user to decide on, and lists every rule turned off or narrowed, and every allowlist entry, with its reason and a total count.
10. AGENTS.md documents `npm run guard`, the required check, the no-weakening rule and break-glass. No secret is added to CI.

## Open Questions
None. Dependabot security updates and the custom-rule recommendations are the owner's to decide, and are listed in the PR body.
