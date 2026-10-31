import path from 'node:path';
import { format, resolveConfig } from 'prettier';

import type { Target } from './targets';

/** What a text target writes: JSON goes through the repo's Prettier config, so `prettier --check` and a re-render agree. */
export async function targetText({ file, content }: Target, root: string): Promise<string> {
  if (!file.endsWith('.json')) return content;
  const options = (await resolveConfig(path.join(root, file))) ?? {};
  return format(content, { ...options, parser: 'json' });
}
