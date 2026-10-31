import { expect, test } from '@playwright/test';

import {
  answerStarter,
  card,
  nextCard,
  open,
  openTopics,
  RIGHT_WORDS,
  STARTER,
  stubApi,
  swipeUp,
  WRONG_WORDS,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

test('every starter card can be answered right, with the verdict, points and explanation', async ({ page }) => {
  await open(page);
  for (const [i, c] of STARTER.entries()) {
    await answerStarter(page, c, true);
    const verdict = page.getByTestId('verdict');
    const text = (await verdict.textContent()) ?? '';
    expect(
      RIGHT_WORDS.some((w) => text.includes(w)),
      text,
    ).toBe(true);
    await expect(page.getByTestId('verdict-points')).not.toHaveText('+0');
    await expect(verdict).toContainText(c.why);
    await expect(page.getByRole('button', { name: 'Card was wrong' })).toHaveCount(0);
    // The 5th right answer in a row celebrates.
    if (i === 4) await expect(page.getByTestId('toasts')).toContainText('5 in a row');
    if (i < STARTER.length - 1) await nextCard(page);
  }
});

test('every starter card can be answered wrong, with +0 and a reveal', async ({ page }) => {
  await open(page);
  for (const [i, c] of STARTER.entries()) {
    await answerStarter(page, c, false);
    const verdict = page.getByTestId('verdict');
    const text = (await verdict.textContent()) ?? '';
    expect(
      WRONG_WORDS.some((w) => text.includes(w)),
      text,
    ).toBe(true);
    await expect(page.getByTestId('verdict-points')).toHaveText('+0');
    await expect(verdict).toContainText(c.why);
    if (c.type === 'flaw') {
      await expect(card(page).getByTestId('marker-circle')).toHaveCount(1);
      const bad = c.code!.findIndex((l) => l.trim() === c.bad_line);
      // The loop is drawn around the buggy line: its centre sits inside that line's text box.
      const loop = (await card(page).getByTestId('marker-circle').boundingBox())!;
      const line = (await card(page).getByText(c.code![bad].trim(), { exact: true }).boundingBox())!;
      const [cx, cy] = [loop.x + loop.width / 2, loop.y + loop.height / 2];
      expect(cx).toBeGreaterThanOrEqual(line.x);
      expect(cx).toBeLessThanOrEqual(line.x + line.width);
      expect(cy).toBeGreaterThanOrEqual(line.y);
      expect(cy).toBeLessThanOrEqual(line.y + line.height);
      const tapped = card(page).getByText(c.code![bad === 0 ? 1 : 0].trim(), { exact: true });
      await expect(tapped).toHaveCSS('text-decoration-line', 'line-through');
    }
    if (i < STARTER.length - 1) await nextCard(page);
  }
});

test('an order card is graded only when the last step is placed', async ({ page }) => {
  await open(page);
  for (const c of STARTER.slice(0, 4)) {
    await page.getByRole('button', { name: 'Skip this card' }).click();
    await expect(card(page).getByRole('heading', { name: c.title })).toHaveCount(0);
  }
  const order = STARTER[4];
  await expect(card(page).getByRole('heading', { name: order.title })).toBeVisible();
  const steps = order.steps!;
  for (const step of steps.slice(0, -1)) await page.getByRole('button', { name: `Place: ${step}` }).click();
  await expect(page.getByTestId('verdict')).toHaveCount(0);
  // A placed step can be sent back and placed again.
  await page.getByRole('button', { name: `Step 1: ${steps[0]}. Tap to send back` }).click();
  await page.getByRole('button', { name: `Place: ${steps[0]}` }).click();
  await page.getByRole('button', { name: `Place: ${steps.at(-1)}` }).click();
  await expect(page.getByTestId('verdict')).toBeVisible();
  await expect(page.getByTestId('verdict-points')).toHaveText('+0');
});

test('skip advances without points', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Skip this card' }).click();
  await expect(card(page).getByRole('heading', { name: STARTER[1].title })).toBeVisible();
  await expect(page.getByTestId('xp')).toHaveText('0 / 800 XP');
  await openTopics(page);
  await expect(page.getByTestId('stat-answered')).toHaveText('0');
});

test('card was wrong appears only after a wrong answer and takes it off the count', async ({ page }) => {
  await open(page);
  await answerStarter(page, STARTER[0], true);
  await expect(page.getByRole('button', { name: 'Card was wrong' })).toHaveCount(0);
  await nextCard(page);
  await answerStarter(page, STARTER[1], false);
  await page.getByRole('button', { name: 'Card was wrong' }).click();
  await expect(page.getByRole('button', { name: 'Card was wrong' })).toHaveCount(0);
  await openTopics(page);
  await expect(page.getByTestId('stat-answered')).toHaveText('1');
  await expect(page.getByTestId('stat-rematches')).toHaveText('0');
});

test('every button in the card, verdict, top bar and topics sheet has a name', async ({ page }) => {
  await open(page);
  const check = async () => {
    const names = await page
      .getByRole('button')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent ?? ''));
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.trim()).not.toBe('');
  };
  await check();
  await expect(page.getByRole('button', { name: /^Line 5: if r\.start <= s and e <= r\.end:$/ })).toBeVisible();
  await answerStarter(page, STARTER[0], false);
  await check();
  await openTopics(page);
  await check();
});

test('progress survives a reload and returning players get a welcome card', async ({ page }) => {
  await open(page);
  for (const [i, c] of STARTER.entries()) {
    await answerStarter(page, c, i !== 1);
    if (i < STARTER.length - 1) await nextCard(page);
  }
  const xp = await page.getByTestId('xp').textContent();
  // The save is debounced by a second; reload fires pagehide, which flushes it.
  await page.reload();
  await expect(page.getByTestId('welcome')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deal me in' })).toBeVisible();
  await expect(page.getByTestId('xp')).toHaveText(xp!);
  await openTopics(page);
  await expect(page.getByTestId('stat-answered')).toHaveText('6');
});

test('swiping up advances only after the card is answered', async ({ page }) => {
  await open(page);
  await swipeUp(page);
  await expect(card(page).getByRole('heading', { name: STARTER[0].title })).toBeVisible();
  await answerStarter(page, STARTER[0], true);
  await swipeUp(page);
  await expect(card(page).getByRole('heading', { name: STARTER[1].title })).toBeVisible();
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the feed still advances', async ({ page }) => {
    await open(page);
    await answerStarter(page, STARTER[0], true);
    await nextCard(page);
    await expect(card(page).getByRole('heading', { name: STARTER[1].title })).toBeVisible();
    await answerStarter(page, STARTER[1], true);
    await swipeUp(page);
    await expect(card(page).getByRole('heading', { name: STARTER[2].title })).toBeVisible();
  });
});
