// Every way of silencing a gate has to be on a checked-in list with a reason, so turning a check
// off shows up in the diff. The budget is exact: an entry that outlives its code fails too.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';

const BudgetsSchema = z.array(
  z.strictObject({ file: z.string(), kind: z.string(), count: z.number().int().positive(), reason: z.string() }),
);
export type Budget = z.infer<typeof BudgetsSchema>[number];

const COMMENT_KINDS: [string, RegExp][] = [
  ['eslint-disable', /eslint-(disable|enable)/],
  ['ts-ignore', /@ts-(ignore|expect-error|nocheck)/],
  ['coverage-ignore', /(istanbul|v8|c8) ignore/],
  ['prettier-ignore', /prettier-ignore/],
  ['scanner-ignore', /nosemgrep|gitleaks:allow|lgtm\[/],
];

const isTest = (file: string) => /\.(?:test|spec)\.tsx?$/.test(file) || file.startsWith('e2e/');
const isAstScanned = (file: string) => /\.(?:ts|tsx|mts)$/.test(file);

function isFocusOrSkip(callee: string): boolean {
  const parts = callee.split('.');
  return (
    ['it', 'test', 'describe'].includes(parts[0] ?? '') &&
    ['only', 'skip', 'todo', 'fixme'].includes(parts.at(-1) ?? '')
  );
}

function commentHits(text: string): string[] {
  const hits: string[] = [];
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, text);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.SingleLineCommentTrivia && token !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    const comment = scanner.getTokenText();
    for (const [kind, pattern] of COMMENT_KINDS) if (pattern.test(comment)) hits.push(kind);
  }
  return hits;
}

function astHits(file: string, text: string): string[] {
  const hits: string[] = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node): void => {
    if (ts.isNonNullExpression(node)) hits.push('non-null');
    if (ts.isAsExpression(node) && node.type.getText(source) !== 'const') {
      hits.push(node.type.kind === ts.SyntaxKind.AnyKeyword ? 'as-any' : 'as-cast');
    }
    if (ts.isCallExpression(node) && isFocusOrSkip(node.expression.getText(source))) {
      hits.push('test-focus-or-skip');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

/** The suppressions in one file, as `kind -> count`. Casts in tests are fine: a bad one fails the test. */
export function scan(file: string, text: string): Map<string, number> {
  const hits = commentHits(text);
  if (isAstScanned(file)) {
    const fromAst = astHits(file, text);
    hits.push(...(isTest(file) ? fromAst.filter((kind) => kind === 'test-focus-or-skip') : fromAst));
  }
  const counts = new Map<string, number>();
  for (const kind of hits) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return counts;
}

/** Compares what is in the code with the budget. Returns one message per mismatch. */
export function compare(found: Map<string, Map<string, number>>, budgets: Budget[]): string[] {
  const problems: string[] = [];
  const budgeted = new Map(budgets.map((b) => [`${b.file}|${b.kind}`, b]));
  for (const budget of budgets) {
    if (budget.reason.trim().length < 10) problems.push(`${budget.file} ${budget.kind}: give a real reason`);
  }
  for (const [file, kinds] of found) {
    for (const [kind, count] of kinds) {
      const allowed = budgeted.get(`${file}|${kind}`)?.count ?? 0;
      if (count > allowed) problems.push(`${file}: ${count} ${kind}, budget ${allowed}`);
    }
  }
  for (const { file, kind, count } of budgets) {
    const actual = found.get(file)?.get(kind) ?? 0;
    if (actual < count) problems.push(`${file}: budget of ${count} ${kind} is stale, actual ${actual}. Lower it.`);
  }
  return problems;
}

function main(): void {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter((file) => /\.(?:ts|tsx|mts|js|mjs|cjs)$/.test(file) && !file.startsWith('scripts/guardrails/'));
  const found = new Map<string, Map<string, number>>();
  for (const file of files) {
    const counts = scan(file, readFileSync(file, 'utf8'));
    if (counts.size > 0) found.set(file, counts);
  }
  const budgets = BudgetsSchema.parse(JSON.parse(readFileSync('scripts/guardrails/suppressions.json', 'utf8')));
  const problems = compare(found, budgets);
  if (problems.length > 0) {
    console.error(`Suppressions out of budget (scripts/guardrails/suppressions.json):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`suppressions: ${files.length} files within budget`);
}

if (process.argv[1]?.endsWith('check-suppressions.ts') === true) main();
