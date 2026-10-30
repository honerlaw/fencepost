import { expect, type Page } from '@playwright/test';

import deck from '../src/cards/starter-deck.json';

export type StarterCard = (typeof deck)[number];
export const STARTER: StarterCard[] = deck;

export const RIGHT_WORDS = ['Nice catch.', 'Clean.', 'LGTM.', 'Ship it.', 'Exactly.', 'Sharp.', 'Boss down.'];
export const WRONG_WORDS = ['Not quite.', 'Bug escaped.', 'Rolled back.', 'Close, but no.'];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Stubs /api/* so starter-deck tests never touch the (unconfigured) server routes. */
export async function stubApi(page: Page, cards: { status: number; body?: string; headers?: Record<string, string> } = { status: 503 }) {
  const requests: unknown[] = [];
  await page.route('**/api/cards', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: cards.status, body: cards.body ?? '', headers: cards.headers ?? { 'content-type': 'application/x-ndjson' } });
  });
  await page.route('**/api/flag', (route) => route.fulfill({ status: 204 }));
  return requests;
}

export async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('top-bar')).toBeVisible();
}

export function card(page: Page) {
  return page.getByTestId('card');
}

/** Answers the current starter card right or wrong by reading its JSON. */
export async function answerStarter(page: Page, c: StarterCard, right: boolean) {
  await expect(card(page).getByRole('heading', { name: c.title })).toBeVisible();
  if (c.type === 'flaw') {
    const lines = c.code!;
    const bad = lines.findIndex((l) => l.trim() === c.bad_line);
    const line = right ? bad : bad === 0 ? 1 : 0;
    await page.getByRole('button', { name: new RegExp(`^Line ${line + 1}: `) }).click();
  } else if (c.type === 'order') {
    const steps = right ? c.steps! : [...c.steps!].reverse();
    for (const step of steps) await page.getByRole('button', { name: `Place: ${step}` }).click();
  } else {
    const options = c.options!;
    const text = right ? c.correct! : options.find((o) => o !== c.correct)!;
    await page.getByRole('button', { name: new RegExp(`^Option [A-E]: ${escape(text)}$`) }).click();
  }
  await expect(page.getByTestId('verdict')).toBeVisible();
}

export async function nextCard(page: Page) {
  await page.getByRole('button', { name: 'Next card' }).click();
}

/** Drags upward over the card area with the mouse, like a swipe. */
export async function swipeUp(page: Page) {
  const box = (await page.getByTestId('top-bar').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height + 400;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y - i * 20, { steps: 2 });
  await page.mouse.up();
}

export async function openTopics(page: Page) {
  await page.getByRole('button', { name: 'Topics and stats' }).click();
  await expect(page.getByTestId('topics-sheet')).toBeVisible();
}
