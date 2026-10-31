// Versions a past incident decided. A routine upgrade must not move them without a new decision.
import { readFileSync } from 'node:fs';

import { z } from 'zod';

const ManifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  expo: z.object({ install: z.object({ exclude: z.array(z.string()).optional() }).optional() }).optional(),
});
type Manifest = z.infer<typeof ManifestSchema>;

// .minerva/knowledge/2026-10-29-decision-tamagui-pinned-to-2-7-7
const EXACT: Record<string, string> = {
  tamagui: '2.7.7',
  '@tamagui/config': '2.7.7',
  '@tamagui/metro-plugin': '2.7.7',
};
const NON_REGISTRY = /^(?:file:|link:|git[+:]|github:|https?:)/;

export function checkPins(manifest: Manifest): string[] {
  const all = { ...manifest.dependencies, ...manifest.devDependencies };
  const problems: string[] = [];
  for (const [name, version] of Object.entries(EXACT)) {
    if (all[name] !== version) problems.push(`${name} must stay exactly ${version}, found ${all[name] ?? 'nothing'}`);
  }
  for (const [name, spec] of Object.entries(all)) {
    if (NON_REGISTRY.test(spec)) problems.push(`${name} must come from the npm registry, found ${spec}`);
  }
  if ((manifest.expo?.install?.exclude ?? []).length > 0) {
    problems.push('expo.install.exclude hides packages from the Expo version check');
  }
  return problems;
}

if (process.argv[1]?.endsWith('check-pins.ts') === true) {
  const problems = checkPins(ManifestSchema.parse(JSON.parse(readFileSync('package.json', 'utf8'))));
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('pins: ok');
}
