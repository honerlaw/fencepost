import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { findLeaks } from './check-bundle-secrets';
import { parseList, touched } from './check-guardrail-changes';
import { checkPins } from './check-pins';
import { compare, scan } from './check-suppressions';

const kinds = (file: string, text: string) => Object.fromEntries(scan(file, text));

describe('scan', () => {
  it('finds suppression comments', () => {
    const text = '// eslint-disable-next-line x -- why\n// @ts-expect-error\n/* v8 ignore next */\nconst a = 1;';
    expect(kinds('src/a.ts', text)).toEqual({ 'eslint-disable': 1, 'ts-ignore': 1, 'coverage-ignore': 1 });
  });

  it('finds casts and non-null assertions in production code', () => {
    expect(kinds('src/a.ts', 'const a = b as any; const c = d as Foo; const e = f!;')).toEqual({
      'as-any': 1,
      'as-cast': 1,
      'non-null': 1,
    });
  });

  it('allows as const, and casts in tests', () => {
    expect(kinds('src/a.ts', "const a = ['b'] as const;")).toEqual({});
    expect(kinds('src/a.test.ts', 'const a = b as Foo; const c = d!;')).toEqual({});
    expect(kinds('e2e/a.ts', 'const a = b as Foo;')).toEqual({});
  });

  it('finds focused and skipped tests in test files', () => {
    expect(kinds('src/a.test.ts', "it.only('a', f); it.skip('b', f); describe.todo('c');")).toEqual({
      'test-focus-or-skip': 3,
    });
  });

  it('ignores the same words in strings', () => {
    expect(kinds('src/a.ts', "const a = '// eslint-disable and @ts-ignore';")).toEqual({});
  });

  it('reads comments in plain JavaScript without parsing casts', () => {
    expect(kinds('a.mjs', '// eslint-disable-next-line x -- why\nconst a = 1;')).toEqual({ 'eslint-disable': 1 });
  });
});

describe('compare', () => {
  const found = new Map([['src/a.ts', new Map([['as-cast', 2]])]]);
  const entry = { file: 'src/a.ts', kind: 'as-cast', reason: 'zod cannot narrow this union' };

  it('passes an exact budget', () => {
    expect(compare(found, [{ ...entry, count: 2 }])).toEqual([]);
  });

  it('fails when over budget or unlisted', () => {
    expect(compare(found, [{ ...entry, count: 1 }])).toHaveLength(1);
    expect(compare(found, [])).toHaveLength(1);
  });

  it('fails a stale budget', () => {
    expect(compare(found, [{ ...entry, count: 3 }])).toHaveLength(1);
  });

  it('fails an empty reason', () => {
    expect(compare(found, [{ ...entry, count: 2, reason: ' ' }])).toHaveLength(1);
  });
});

describe('checkPins', () => {
  const pinned = { tamagui: '2.7.7', '@tamagui/config': '2.7.7' };
  const dev = { '@tamagui/metro-plugin': '2.7.7' };

  it('passes the pinned versions', () => {
    expect(checkPins({ dependencies: pinned, devDependencies: dev })).toEqual([]);
  });

  it('fails a moved or ranged pin', () => {
    expect(checkPins({ dependencies: { ...pinned, tamagui: '^2.7.7' }, devDependencies: dev })).toHaveLength(1);
    expect(checkPins({ dependencies: pinned })).toHaveLength(1);
  });

  it('fails a dependency from outside the registry', () => {
    const deps = { ...pinned, evil: 'github:someone/evil' };
    expect(checkPins({ dependencies: deps, devDependencies: dev })).toHaveLength(1);
  });
});

describe('scan parsing', () => {
  it('finds comments after a template literal', () => {
    const text = ['const a = `x$', '{y}z`;\n// @ts-expect-error nope\nconst d: string = 1;\n'].join('');
    expect(kinds('a.ts', text)).toEqual({ 'ts-ignore': 1 });
  });

  it('finds comments inside JSX', () => {
    expect(kinds('a.tsx', 'const a = <b>{/* eslint-disable-line */}</b>;')).toEqual({ 'eslint-disable': 1 });
  });

  it('finds inline rule config', () => {
    expect(kinds('a.ts', '/* eslint no-console: off */\nconsole.log(1);')).toEqual({ 'eslint-config': 1 });
  });

  it('finds inline rule config with quoted names', () => {
    expect(kinds('a.ts', '/* eslint "no-console": "off" */\nconsole.log(1);')).toEqual({ 'eslint-config': 1 });
  });

  it('counts a directive in JSDoc once', () => {
    expect(kinds('a.ts', '/**\n * @example // eslint-disable-next-line foo\n */\nconst a = 1;')).toEqual({
      'eslint-disable': 1,
    });
  });

  it('does not read JSX text as a comment', () => {
    expect(kinds('a.tsx', 'const a = <b>// eslint-disable-line</b>;')).toEqual({});
  });

  it('parses a generic arrow in a .ts file as TypeScript', () => {
    expect(kinds('a.ts', 'const f = <T>(x: T) => x;\nconst a = b as Foo;\nconst c = d!;')).toEqual({
      'as-cast': 1,
      'non-null': 1,
    });
  });
});

describe('checkPins exclusions', () => {
  it('rejects packages hidden from the Expo version check', () => {
    const dependencies = { tamagui: '2.7.7', '@tamagui/config': '2.7.7', '@tamagui/metro-plugin': '2.7.7' };
    expect(checkPins({ dependencies, expo: { install: { exclude: ['expo-sqlite'] } } })).toHaveLength(1);
  });
});

describe('findLeaks', () => {
  it('finds the prompt and any mention of OpenRouter, in any case', () => {
    expect(findLeaks([{ name: 'a', text: 'x OpenRouter y' }])).toHaveLength(1);
    expect(findLeaks([{ name: 'a', text: 'you write puzzle cards for fencepost' }])).toHaveLength(1);
    expect(findLeaks([{ name: 'a', text: 'OPENROUTER_API_KEY' }])).toHaveLength(2);
  });

  it('finds a key by its shape alone', () => {
    expect(findLeaks([{ name: 'a', text: `var k="${['sk', 'or', 'v1', 'ab12'.repeat(8)].join('-')}"` }])).toHaveLength(
      1,
    );
  });

  it('finds a key with no version segment', () => {
    expect(findLeaks([{ name: 'a', text: ['sk', 'or', 'Ab12'.repeat(8)].join('-') }])).toHaveLength(1);
  });

  it('does not mistake words ending in sk for a key', () => {
    expect(findLeaks([{ name: 'a', text: 'desk-or-mobile-layout-container' }])).toEqual([]);
  });

  it('passes clean text', () => {
    expect(findLeaks([{ name: 'a', text: 'hello' }])).toEqual([]);
  });
});

describe('guardrail paths', () => {
  const guarded = parseList('# config\neslint.config.mjs\n\n.github/\n');

  it('skips comments and blanks', () => {
    expect(guarded).toEqual(['eslint.config.mjs', '.github/']);
  });

  it('matches files exactly and directories by prefix', () => {
    expect(
      touched(['eslint.config.mjs', '.github/workflows/ci.yml', 'src/a.ts', 'x/eslint.config.mjs'], guarded),
    ).toEqual(['eslint.config.mjs', '.github/workflows/ci.yml']);
  });
});

const runBlockBypass = (command: string) =>
  spawnSync('node', ['.claude/hooks/block-bypass.mjs'], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  }).status;

describe('block-bypass hook', () => {
  it.each([
    'git commit --no-verify -m x',
    'git push --no-verify',
    'git commit -nm x',
    'git commit -m x -n',
    'LEFTHOOK=0 git commit -m x',
    'git -c core.hooksPath=/dev/null commit -m x',
    'gh pr edit 3 --add-label guardrails-approved',
    'gh api repos/honerlaw/fencepost/issues/3/labels -f "labels[]=guardrails-approved"',
  ])('blocks %s', (command) => {
    expect(runBlockBypass(command)).toBe(2);
  });

  it.each([
    'git commit -m "explain why --no-verify is banned"',
    'git commit --amend -m x',
    'git log -n 5',
    'gh pr view 3 --json labels',
    'gh pr edit 3 --add-label bug',
  ])('allows %s', (command) => {
    expect(runBlockBypass(command)).toBe(0);
  });
});

describe('test-focus scan', () => {
  it('counts focused and skipped tests', () => {
    expect(kinds('a.test.ts', "it.only('x', run);\ntest.describe.skip('y', run);")).toEqual({
      'test-focus-or-skip': 2,
    });
  });

  it('counts conditional skips and skips in a chain once each', () => {
    const text =
      "it.skipIf(true)('a', run);\nit.runIf(false)('b', run);\nit.skip.each([1])('c', run);\nit.only.each([1])('d', run);";
    expect(kinds('a.test.ts', text)).toEqual({ 'test-focus-or-skip': 4 });
  });

  it('ignores other objects with a skip method', () => {
    expect(kinds('a.test.ts', 'store.skip();\nuseGame.getState().skip();')).toEqual({});
  });
});
