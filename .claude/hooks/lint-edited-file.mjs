// PostToolUse (Edit|Write): lints the file that just changed, so an agent sees a violation on the
// edit that caused it. Exit 2 feeds the output back to the agent. The root comes from the edited
// file, because the session may be in a different worktree, but it must be this repository: nothing
// from another repo's node_modules runs here.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LINTED = new Set(['.cjs', '.js', '.mjs', '.mts', '.ts', '.tsx']);

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout?.trim() ?? '';
const commonDir = (cwd) => git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;

if (typeof file === 'string' && LINTED.has(path.extname(file)) && existsSync(file)) {
  const dir = path.dirname(file);
  const root = git(dir, 'rev-parse', '--show-toplevel');
  const eslint = path.join(root, 'node_modules/.bin/eslint');
  const project = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  if (root !== '' && commonDir(dir) === commonDir(project) && existsSync(eslint)) {
    const result = spawnSync(eslint, ['--max-warnings', '0', '--no-warn-ignored', '--', file], {
      cwd: root,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      console.error(result.stdout || result.stderr);
      process.exit(2);
    }
  }
}
