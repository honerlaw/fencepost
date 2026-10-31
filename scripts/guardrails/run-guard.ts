// `npm run guard`: every local check, run to the end so one failure doesn't hide the next.
import { spawnSync } from 'node:child_process';

const CHECKS: [string, string][] = [
  ['types', 'tsc --noEmit'],
  ['script types', 'tsc --noEmit --project scripts/tsconfig.json'],
  ['lint', 'eslint . --max-warnings 0'],
  ['format', 'prettier --check .'],
  ['dead code', 'knip'],
  ['architecture', 'depcruise src scripts e2e --config .dependency-cruiser.cjs'],
  ['duplication', 'jscpd'],
  ['type coverage', 'type-coverage'],
  ['suppressions', 'tsx scripts/guardrails/check-suppressions.ts'],
  ['pins', 'tsx scripts/guardrails/check-pins.ts'],
  [
    'lockfile',
    'lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https --validate-integrity',
  ],
  ['tests + coverage', 'vitest run --coverage'],
];

const failed: string[] = [];
for (const [name, command] of CHECKS) {
  console.log(`\n=== ${name}: ${command}`);
  const { status } = spawnSync(`npx ${command}`, { stdio: 'inherit', shell: true });
  if (status !== 0) failed.push(name);
}

console.log(failed.length === 0 ? '\nguard: all checks passed' : `\nguard: FAILED ${failed.join(', ')}`);
process.exit(failed.length === 0 ? 0 : 1);
