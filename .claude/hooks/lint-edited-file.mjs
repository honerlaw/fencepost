// PostToolUse (Edit|Write): lints the file that just changed, so an agent sees a violation on the
// edit that caused it. Exit 2 feeds the output back to the agent.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LINTED = new Set(['.cjs', '.js', '.mjs', '.mts', '.ts', '.tsx']);
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const eslint = path.join(root, 'node_modules/.bin/eslint');

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;

if (
  typeof file === 'string' &&
  file.startsWith(`${root}${path.sep}`) &&
  LINTED.has(path.extname(file)) &&
  existsSync(file) &&
  existsSync(eslint)
) {
  const result = spawnSync(eslint, ['--max-warnings', '0', '--no-warn-ignored', '--', file], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(result.stdout || result.stderr);
    process.exit(2);
  }
}
