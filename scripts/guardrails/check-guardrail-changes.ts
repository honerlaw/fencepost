// CI only. A PR that edits a guardrail needs the `guardrails-approved` label, which a person adds.
// The list comes from the base branch, so a PR cannot drop a path to get past this check.
import { execFileSync } from 'node:child_process';

const LIST = '.github/guardrail-paths.txt';
const LABEL = 'guardrails-approved';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });

export function parseList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function touched(changed: string[], guarded: string[]): string[] {
  return changed.filter((file) =>
    guarded.some((entry) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry)),
  );
}

function baseList(base: string): string | undefined {
  try {
    return git('show', `${base}:${LIST}`);
  } catch {
    return undefined;
  }
}

function main(): void {
  const base = process.env['BASE_SHA'];
  const head = process.env['HEAD_SHA'];
  if (base === undefined || base === '' || head === undefined || head === '') {
    console.log('guardrail changes: not a pull request');
    return;
  }
  const list = baseList(base);
  if (list === undefined) {
    console.log(`guardrail changes: ${LIST} is not on the base branch yet, so this is the PR that adds it`);
    return;
  }
  const hits = touched(git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean), parseList(list));
  const labels: unknown = JSON.parse(process.env['PR_LABELS'] ?? '[]');
  const approved = Array.isArray(labels) && labels.includes(LABEL);
  if (hits.length > 0 && !approved) {
    console.error(`These files are guardrails, and this PR has no ${LABEL} label:\n  ${hits.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`guardrail changes: ${hits.length} guarded files, label ${approved ? 'present' : 'not needed'}`);
}

if (process.argv[1]?.endsWith('check-guardrail-changes.ts')) main();
