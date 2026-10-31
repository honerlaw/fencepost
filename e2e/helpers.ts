import { expect, type Locator, type Page } from '@playwright/test';

import deck from '../src/cards/starter-deck.json';

export type StarterCard = (typeof deck)[number];
export const STARTER: StarterCard[] = deck;

export const RIGHT_WORDS = ['Nice catch.', 'Clean.', 'LGTM.', 'Ship it.', 'Exactly.', 'Sharp.', 'Boss down.'];
export const WRONG_WORDS = ['Not quite.', 'Bug escaped.', 'Rolled back.', 'Close, but no.'];

const escape = (s: string) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

interface CardsReply {
  status: number;
  body?: string;
  headers?: Record<string, string>;
}

const UNAVAILABLE: CardsReply = { status: 503 };

/** Stubs /api/* so starter-deck tests never touch the (unconfigured) server routes. */
export async function stubApi(page: Page, cards: CardsReply = UNAVAILABLE): Promise<unknown[]> {
  const requests: unknown[] = [];
  await page.route('**/api/cards', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: cards.status,
      body: cards.body ?? '',
      headers: cards.headers ?? { 'content-type': 'application/x-ndjson' },
    });
  });
  await page.route('**/api/flag', (route) => route.fulfill({ status: 204 }));
  return requests;
}

export async function open(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('top-bar')).toBeVisible();
}

export function card(page: Page): Locator {
  return page.getByTestId('card');
}

/** Answers the current starter card right or wrong by reading its JSON. */
export async function answerStarter(page: Page, c: StarterCard, right: boolean): Promise<void> {
  await expect(card(page).getByRole('heading', { name: c.title })).toBeVisible();
  if (c.type === 'flaw') {
    const lines = c.code!;
    const bad = lines.findIndex((l) => l.trim() === c.bad_line);
    const wrong = bad === 0 ? 1 : 0;
    const line = right ? bad : wrong;
    await page.getByRole('button', { name: new RegExp(`^Line ${line + 1}: `) }).click();
  } else if (c.type === 'order') {
    const steps = right ? c.steps! : c.steps!.toReversed();
    for (const step of steps) await page.getByRole('button', { name: `Place: ${step}` }).click();
  } else {
    const options = c.options!;
    const text = right ? c.correct! : options.find((o) => o !== c.correct)!;
    await page.getByRole('button', { name: new RegExp(`^Option [A-E]: ${escape(text)}$`) }).click();
  }
  await expect(page.getByTestId('verdict')).toBeVisible();
}

/** Advances and waits for the answered card to finish leaving. */
export async function nextCard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Next card' }).click();
  await expect(page.getByTestId('verdict')).toHaveCount(0);
}

/** Advances past every starter card but the last, which has no next card to go to. */
export async function nextStarter(page: Page, i: number): Promise<void> {
  if (i < STARTER.length - 1) await nextCard(page);
}

/** The 5th right answer in a row celebrates. */
export async function expectStreakToast(page: Page, i: number): Promise<void> {
  if (i === 4) await expect(page.getByTestId('toasts')).toContainText('5 in a row');
}

/** On a flaw card, the loop is drawn around the buggy line and the tapped line is struck through. */
export async function expectFlawReveal(page: Page, c: StarterCard): Promise<void> {
  if (c.type !== 'flaw') return;
  await expect(card(page).getByTestId('marker-circle')).toHaveCount(1);
  const code = c.code!;
  const bad = code.findIndex((l) => l.trim() === c.bad_line);
  // Its centre sits inside that line's text box.
  const loop = (await card(page).getByTestId('marker-circle').boundingBox())!;
  const line = (await card(page).getByText(code[bad]!.trim(), { exact: true }).boundingBox())!;
  const [cx, cy] = [loop.x + loop.width / 2, loop.y + loop.height / 2];
  expect(cx).toBeGreaterThanOrEqual(line.x);
  expect(cx).toBeLessThanOrEqual(line.x + line.width);
  expect(cy).toBeGreaterThanOrEqual(line.y);
  expect(cy).toBeLessThanOrEqual(line.y + line.height);
  const tapped = card(page).getByText(code[bad === 0 ? 1 : 0]!.trim(), { exact: true });
  await expect(tapped).toHaveCSS('text-decoration-line', 'line-through');
}

/** Drags upward over the card area with the mouse, like a swipe. */
export async function swipeUp(page: Page): Promise<void> {
  const box = (await page.getByTestId('top-bar').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height + 400;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y - i * 20, { steps: 2 });
  await page.mouse.up();
}

export async function openTopics(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Topics and stats' }).click();
  await expect(page.getByTestId('topics-sheet')).toBeVisible();
}
