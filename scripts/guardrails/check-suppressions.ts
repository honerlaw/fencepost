// Every way of silencing a gate has to be on a checked-in list with a reason, so turning a check
// off shows up in the diff. The budget is exact: an entry that outlives its code fails too.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';

const BudgetsSchema = z.array(
  z.strictObject({ file: z.string(), kind: z.string(), count: z.number().int().positive(), reason: z.string() }),
);
export type Budget = z.infer<typeof BudgetsSchema>[number];

const COMMENT_KINDS: [string, RegExp][] = [
  ['eslint-disable', /eslint-(?:disable|enable)/],
  ['eslint-config', /^[/*\s]*eslint\s+["']?[\w@/-]+["']?\s*:/],
  ['ts-ignore', /@ts-(ignore|expect-error|nocheck)/],
  ['coverage-ignore', /(istanbul|v8|c8) ignore/],
  ['prettier-ignore', /prettier-ignore/],
  ['scanner-ignore', /nosemgrep|gitleaks:allow|lgtm\[|codeql\[/],
];

const isTest = (file: string) => /\.(?:test|spec)\.tsx?$/.test(file) || file.startsWith('e2e/');
const isAstScanned = (file: string) => /\.(?:ts|tsx|mts|cts)$/.test(file);

const FOCUS_OR_SKIP = new Set(['only', 'skip', 'skipIf', 'runIf', 'todo', 'fixme']);

/** Only a plain dotted callee counts: `it.skip.each([1])('a', f)` has two calls, and the outer one is not new. */
function isFocusOrSkip(callee: string): boolean {
  if (!/^[\w.]+$/.test(callee)) return false;
  const [root, ...rest] = callee.split('.');
  return ['it', 'test', 'describe'].includes(root ?? '') && rest.some((name) => FOCUS_OR_SKIP.has(name));
}

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  return isAstScanned(file) ? ts.ScriptKind.TS : ts.ScriptKind.JSX;
}

const parse = (file: string, text: string) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));

/** Walks real tokens, because a bare scanner loses its place at the first `${}` and misses what follows. */
function commentHits(source: ts.SourceFile): string[] {
  const text = source.getFullText();
  const comments = new Map<number, number>();
  const jsxText: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJSDoc(node)) return;
    if (node.kind === ts.SyntaxKind.JsxText) jsxText.push(node);
    const ranges = [
      ...(ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []),
      ...(ts.getTrailingCommentRanges(text, node.getEnd()) ?? []),
    ];
    for (const { pos, end } of ranges) comments.set(pos, end);
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  const isJsxText = (pos: number) => jsxText.some((node) => pos >= node.getFullStart() && pos < node.getEnd());
  return [...comments]
    .filter(([pos]) => !isJsxText(pos))
    .flatMap(([pos, end]) =>
      COMMENT_KINDS.filter(([, pattern]) => pattern.test(text.slice(pos, end))).map(([kind]) => kind),
    );
}

function astHits(source: ts.SourceFile): string[] {
  const hits: string[] = [];
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
  const source = parse(file, text);
  const hits = commentHits(source);
  if (isAstScanned(file)) {
    const fromAst = astHits(source);
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
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter((file) => /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(file) && existsSync(file));
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
