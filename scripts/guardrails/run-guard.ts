// `npm run guard`: every local check, run to the end so one failure doesn't hide the next.
// `guard:security` (gitleaks, semgrep) is separate because it needs tools outside node_modules.
import { spawnSync } from 'node:child_process';

const CHECKS: [string, string, Record<string, string>?][] = [
  ['types', 'tsc --noEmit'],
  ['script types', 'tsc --noEmit --project scripts/tsconfig.json'],
  ['lint', 'eslint . --max-warnings 0'],
  ['format', 'prettier --check .'],
  ['dead code', 'knip'],
  ['architecture', 'depcruise src scripts e2e --config .dependency-cruiser.cjs'],
  ['duplication', 'jscpd'],
  ['type coverage', "type-coverage --strict --ignore-catch --at-least 99 --ignore-files '**/*.d.ts'"],
  ['suppressions', 'tsx scripts/guardrails/check-suppressions.ts'],
  ['pins', 'tsx scripts/guardrails/check-pins.ts'],
  [
    'lockfile',
    'lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https --validate-integrity',
  ],
  // Offline, this compares with the SDK map the lockfile pins, so the result depends only on the commit.
  ['expo versions', 'expo install --check --json', { EXPO_OFFLINE: '1' }],
  ['tests + coverage', 'vitest run --coverage'],
  ['web export', 'expo export --platform web'],
  ['native export', 'expo export --platform ios --platform android --output-dir dist-native'],
  ['bundle secrets', 'tsx scripts/guardrails/check-bundle-secrets.ts'],
];

const failed: string[] = [];
for (const [name, command, env] of CHECKS) {
  console.log(`\n=== ${name}: ${command}`);
  const { status } = spawnSync(`npx ${command}`, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  if (status !== 0) failed.push(name);
}

console.log(failed.length === 0 ? '\nguard: all checks passed' : `\nguard: FAILED ${failed.join(', ')}`);
process.exit(failed.length === 0 ? 0 : 1);
