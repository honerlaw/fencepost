// CI only. A PR that edits a guardrail needs the `guardrails-approved` label, which a person adds.
// The list comes from the base branch, so dropping a path from it does not help. This script and
// ci.yml still run from the PR, so a PR that edits them can get around the check: it is a speed bump
// that makes an edit visible, and review is what stops it.
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

/** Undefined only when the base really lacks the list. An unknown base throws, so this cannot fail open. */
function baseList(base: string): string | undefined {
  return git('ls-tree', '--name-only', base, '--', LIST).trim() === '' ? undefined : git('show', `${base}:${LIST}`);
}

function main(): void {
  const { BASE_SHA: base, HEAD_SHA: head, PR_LABELS: prLabels } = process.env;
  if (base === undefined || base === '' || head === undefined || head === '') {
    console.log('guardrail changes: not a pull request');
    return;
  }
  const list = baseList(base);
  if (list === undefined) {
    console.log(`guardrail changes: ${LIST} is not on the base branch yet, so this is the PR that adds it`);
    return;
  }
  const hits = touched(
    git('diff', '--name-only', '--no-renames', '-z', `${base}...${head}`).split('\0').filter(Boolean),
    parseList(list),
  );
  const labels: unknown = JSON.parse(prLabels ?? '[]');
  const approved = Array.isArray(labels) && labels.includes(LABEL);
  if (hits.length > 0 && !approved) {
    console.error(`These files are guardrails, and this PR has no ${LABEL} label:\n  ${hits.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`guardrail changes: ${hits.length} guarded files, label ${approved ? 'present' : 'not needed'}`);
}

if (process.argv[1]?.endsWith('check-guardrail-changes.ts') === true) main();
