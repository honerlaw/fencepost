// The prompt and the OpenRouter key must only exist on the server. Missing output is a failure:
// a scan of nothing would pass, and it would look like coverage.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FORBIDDEN = [/You write puzzle cards for Fencepost/i, /OPENROUTER_API_KEY/i, /openrouter/i];
const ROOTS = ['dist/client', 'dist-native'];

export function findLeaks(files: { name: string; text: string }[]): string[] {
  return files.flatMap(({ name, text }) =>
    FORBIDDEN.filter((pattern) => pattern.test(text)).map((pattern) => `${name} contains ${pattern.source}`),
  );
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (process.argv[1]?.endsWith('check-bundle-secrets.ts') === true) {
  const roots = process.argv.length > 2 ? process.argv.slice(2) : ROOTS;
  const missing = roots.filter((root) => !existsSync(root));
  if (missing.length > 0) {
    console.error(`No export at ${missing.join(', ')}. Build first.`);
    process.exit(1);
  }
  const names = roots.flatMap((root) => walk(root));
  if (names.length === 0) {
    console.error('The exports are empty.');
    process.exit(1);
  }
  // latin1 keeps Hermes bytecode's plain-text string table searchable.
  const leaks = findLeaks(names.map((name) => ({ name, text: readFileSync(name, 'latin1') })));
  if (leaks.length > 0) {
    console.error(leaks.join('\n'));
    process.exit(1);
  }
  console.log(`bundle secrets: ${names.length} files clean`);
}
