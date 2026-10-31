import { getDomain } from '@/cards/domains';
import { cleanRecent } from './clean-recent';
import { PROMPT_TEMPLATE } from './constants';
import { formatPlan } from './format-plan';
import type { PromptInput } from './types';

export function buildPrompt({ domain, plan, flavor, recent }: PromptInput): string {
  const { name, blurb } = getDomain(domain);
  const titles = cleanRecent(recent);
  let text = PROMPT_TEMPLATE;
  if (titles.length === 0) text = text.replace('Do not repeat these recent cards: {RECENT}.\n', '');
  // Function replacers so `$` in titles is never treated as a replacement pattern.
  return text
    .replace('{N}', () => String(plan.length))
    .replace('{DOMAIN_NAME}', () => name)
    .replace('{DOMAIN_BLURB}', () => blurb)
    .replace('{PLAN}', () => formatPlan(plan))
    .replace('{FLAVOR}', () => flavor)
    .replace('{RECENT}', () => titles.map((t) => `"${t}"`).join(', '));
}
