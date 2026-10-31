# Negative controls

Each gate was given a deliberate violation, run, and required to fail. Fixtures were temporary and none were committed.

| Gate | Violation | Result | Evidence |
| --- | --- | --- | --- |
| eslint agentic/no-credential-in-url | credential in a github.com URL | caught | agentic/no-credential-in-url. First attempt used example.com, which the rule exempts by design. |
| eslint agentic/no-biome-ignore | src/lib/neg-control.ts | caught | agentic/no-biome-ignore: inline `biome-ignore` is banned — fix the underlying issue,  |
| eslint agentic/one-export-per-file | src/lib/neg-control.ts | caught | agentic/one-export-per-file: 2 exported functions in one file — the convention asks for o |
| eslint agentic/tamagui-native-id | src/components/neg-control.tsx | caught | agentic/tamagui-native-id: <View nativeID=...> — View is not imported from "react-nativ |
| eslint agentic/responsive-two-pane-flex | src/components/neg-control.tsx | caught | agentic/responsive-two-pane-flex: <YStack flex={1}> inside a responsive two-pane screen. On th |
| eslint process.env ban | src/lib/neg-control.ts | caught | no-restricted-syntax: Read env only in src/server/from-env/, which keeps secrets o |
| eslint JSON.parse cast ban | src/lib/neg-control.ts | caught | no-restricted-syntax: JSON.parse returns unknown data. Validate it with zod instea |
| eslint relative fetch ban | src/lib/neg-control.ts | caught | no-restricted-syntax: expo/fetch ignores relative URLs on native. Wrap the path in |
| eslint pure core clock | src/game/neg-control.ts | caught | no-restricted-syntax: The pure core takes its clock from deps.now. |
| eslint pure core random | src/game/neg-control.ts | caught | no-restricted-syntax: The pure core takes an injected RNG. |
| eslint pure core imports | src/game/neg-control.ts | caught | no-restricted-imports: 'zustand' import is restricted from being used by a pattern. |
| eslint client imports server | src/components/neg-control.ts | caught | no-restricted-imports: '@/server/plan' import is restricted from being used by a pa |
| eslint unused disable directive | src/lib/neg-control.ts | caught | : Unused eslint-disable directive (no problems were reported f |
| eslint no-explicit-any | src/lib/neg-control.ts | caught | @typescript-eslint/no-explicit-any: Unexpected any. Specify a different type. |
| eslint floating promise | src/lib/neg-control.ts | caught | @typescript-eslint/no-floating-promises: Promises must be awaited, end with a call to .catch, or end  |
| tsc | wrong type | caught | TS2322 |
| prettier | unformatted file | caught | warn |
| knip | unused file | caught | Unused files |
| depcruise pure-core | src/game imports react | caught | pure-core-stays-pure |
| depcruise client-server | component imports server | caught | client-never-imports-server |
| depcruise cycle | two modules import each other | caught | no-circular |
| jscpd | whole-file copy | caught | exit 1. The first record cited only `Found 1 clones`, which alone does not prove a failure: at the old 3% threshold a smaller paste printed that and exited 0. |
| type-coverage | any-typed exports | caught | less |
| suppressions | unbudgeted cast | caught | out of budget |
| check-pins | caret on tamagui | caught | tamagui must stay exactly 2.7.7, found ^2.7.7 |
| lockfile-lint | lock entry from another host | caught | ['detected invalid host(s) for package: zod@3.25.76-2a09f61dd40424b0613a935992aa64f7aab120 |
| vitest | failing test | caught | 1 failed |
| coverage floor | untested code | caught | does not meet |
| gitleaks | token-shaped string in a file | caught | leaks found |
| check-bundle-secrets | key shape in a bundle | caught | First attempt passed: the scanner matched names, not values. Added a key-shape pattern and a test, then it failed as it should. |
| semgrep no-child-process-in-app | fixture file | caught | flagged |
| semgrep no-dangerous-html | fixture file | caught | flagged |
| semgrep no-dynamic-code | fixture file | caught | flagged |
| semgrep no-pull-request-target | fixture file | caught | flagged |
| semgrep openrouter-key-literal | fixture file | caught | flagged |
| semgrep secret-named-expo-public | fixture file | caught | flagged |
| semgrep stream-text-needs-limits | fixture file | caught | flagged |
| hadolint | unpinned base image | caught | DL3007 |
| actionlint | invalid step | caught | ../../../../../../..<tmp>/bad.yml:6:9: unexpected key "run" for step to execute action. ex |
| zizmor | unpinned action, kept credentials | caught |  |
| commitlint | non-conventional message | caught | subject/type rule failed |
| guardrail-changes | guarded file edited, no label | caught | These files are guardrails, and this PR has no guardrails-approved label: |
| guardrail-changes label | same diff, label present, must pass | caught | guardrail changes: 15 guarded files, label present |
| build (expo export) | import of a missing module | caught | Unable to resolve |

Added after review:

| Gate | Violation | Result | Evidence |
| --- | --- | --- | --- |
| e2e (Playwright) | spec expecting text that is not on the page | caught | `1 failed` |
| Docker build | `COPY` of a missing file | caught | `not found` |
| expo install --check (offline) | expo-sqlite hand-set to 57.0.1 | caught | exit 1, `expectedVersionOrRange` in the bundled map; exit 0 on the real install |
| check-pins | `expo.install.exclude` set | caught | unit test in `guardrails.test.ts` |
| check-codeql.sh | SARIF with a security-severity 8.8 result, then one with only a quality result | caught | exit 1 with the rule and location, then exit 0 |
| check-suppressions | comment after a template literal; generic arrow in `.ts`; inline `eslint` config | caught | unit tests in `guardrails.test.ts` |
| check-guardrail-changes | unknown base SHA | caught | `fatal: not a tree object`, exit 1 (it used to pass) |
| semgrep | `child_process` without `node:`; `generateText(opts)` | caught | `no-child-process-in-app`, `stream-text-needs-limits` |
| eslint env ban | `const { env } = process` | caught | `Read env only` |

Added after the second review and verification:

| Gate | Violation | Result | Evidence |
| --- | --- | --- | --- |
| check-suppressions | quoted rule name, JSDoc directive, JSX text, `it.skipIf`, `it.runIf`, `it.skip.each`, `it.only.each` | caught | unit tests in `guardrails.test.ts` |
| check-suppressions | `@ts-expect-error` and casts in `scripts/guardrails/` | caught | exit 1, `1 ts-ignore, budget 0` |
| check-codeql.sh | rule under `tool.driver`, under an extension, `rule.id` result, SARIF with no rules | caught | exit 1 for each; exit 0 for clean and suppressed fixtures |
| check-bundle-secrets | `desk-or-mobile-layout-container` must not match | passes | unit test |
| semgrep | `ai.streamText` | caught | `stream-text-needs-limits` |
| eslint env ban | `globalThis.process.env` | caught | `Read env only` |
| lint hook | `any` cast in this repo, then a foreign repo with a fake eslint | caught | exit 2 here; exit 0 and the foreign eslint did not run |
| jscpd partial paste | 12, 21, 40 and 120 lines of `game-store.ts` | **missed** | `Found 0 clones`, exit 0, also at `--mode weak` and `--min-tokens 30`. Cause not found. Recorded as a limit. |

CodeQL's real run, and `dependency-review`, have no failing control locally. A green run does not prove they can fail, so both get a planted failure on the PR.

The Claude Code hooks are covered by `scripts/guardrails/guardrails.test.ts` (block-bypass) and a pipe test of `lint-edited-file.mjs`: exit 0 on a clean file, exit 2 with the report on a dirty one.

## Plugin rule applicability

| Rule | Status | Why |
| --- | --- | --- |
| no-credential-in-url | on, everywhere | Applies to any source file. |
| no-biome-ignore | on, everywhere | Applies to any source file. |
| one-export-per-file | on, `src` except `src/app` and tests | Routes need a default export plus route options. |
| tamagui-native-id | on, `src/**/*.tsx` | The app uses Tamagui. |
| responsive-two-pane-flex | on, `src/components` and `src/app` | Cheap to keep, and it protects any future two-pane screen. |
| workspace-runtime-imports | off | This is not a workspace repo. |
| rpc-error-standard | off | There is no Connect-RPC. |
| markdown-map-code-styles | off | There is no markdown renderer. |
| quality-model-token-floor | off | There is no reasoning-tier function; the cap is one env-configured value. |
| workspace-chrome-flex | off | There is no two-pane layout, and it raised 8 false hits on correct `flex: 1` in a single column. |
