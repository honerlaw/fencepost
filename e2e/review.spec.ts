import { expect, test } from '@playwright/test';

import { GENERATED, ndjson } from './generated';
import {
  answerStarter,
  card,
  nextCard,
  open,
  openTopics,
  playStarters,
  reviewCard,
  STARTER,
  stubApi,
  swipeLeft,
  swipeRight,
  swipeUp,
} from './helpers';

const [FIRST, SECOND, THIRD] = [STARTER[0]!, STARTER[1]!, STARTER[2]!];

test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

test('a right swipe does nothing before any card is answered', async ({ page }) => {
  await open(page);
  await swipeRight(page);
  await expect(card(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  await expect(reviewCard(page)).toHaveCount(0);
});

test('swiping right walks back through answered cards, and left walks forward to the live card', async ({ page }) => {
  await open(page);
  await answerStarter(page, FIRST, false);
  const missedVerdict = await page.getByTestId('verdict').textContent();
  await nextCard(page);
  await answerStarter(page, SECOND, true);
  const points = await page.getByTestId('verdict-points').textContent();
  await nextCard(page);
  await expect(card(page).getByRole('heading', { name: THIRD.title })).toBeVisible();

  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await expect(page.getByTestId('review-verdict')).toContainText(SECOND.why);
  await expect(page.getByTestId('review-verdict').getByTestId('verdict-points')).toHaveText(points!);

  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  const verdict = page.getByTestId('review-verdict');
  await expect(verdict).toContainText(FIRST.why);
  // The stored verdict word, and the reveal of the wrong line.
  await expect(verdict).toContainText(missedVerdict!.slice(0, 8));
  await expect(reviewCard(page).getByTestId('marker-circle')).toHaveCount(1);

  // The oldest card is the end of the line.
  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();

  await swipeLeft(page);
  await expect(reviewCard(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await swipeLeft(page);
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(card(page).getByRole('heading', { name: THIRD.title })).toBeVisible();
});

test('a reviewed card cannot be redone and changes nothing', async ({ page }) => {
  await open(page);
  await answerStarter(page, FIRST, false);
  await nextCard(page);
  await answerStarter(page, SECOND, true);
  const xp = await page.getByTestId('xp').textContent();
  await expect(page.getByTestId('toasts')).toHaveText('');

  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  // Roles leave out the hidden live card, so these see only what the player can reach.
  for (const name of [/^Line \d+/, /^Option [A-E]/, /^Place:/, 'Skip this card', 'Card was wrong', 'Next card']) {
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  }
  // No retrying: a toast fired by the review would expire and pass a retried check.
  await expect(page.getByTestId('toasts')).toHaveText('', { timeout: 0 });

  await page.getByRole('button', { name: 'Back to current card' }).click();
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(page.getByTestId('xp')).toHaveText(xp!);
  await openTopics(page);
  await expect(page.getByTestId('stat-answered')).toHaveText('2');
});

test('swiping up from a review returns to the live card without advancing it', async ({ page }) => {
  await open(page);
  await answerStarter(page, FIRST, true);
  await nextCard(page);
  await answerStarter(page, SECOND, true);

  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  await swipeUp(page);
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(card(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await expect(page.getByTestId('verdict')).toBeVisible();
});

test('the buttons walk the same history as the swipes', async ({ page }) => {
  await open(page);
  await playStarters(page, 2);
  await answerStarter(page, THIRD, true);

  await page.getByRole('button', { name: 'Previous card' }).click();
  await expect(reviewCard(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await page.getByRole('button', { name: 'Older card' }).click();
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Older card' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Newer card' }).click();
  await expect(reviewCard(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Newer card' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to current card' }).click();
  await expect(card(page).getByRole('heading', { name: THIRD.title })).toBeVisible();
});

test('an accidental Next can be undone from the unanswered card, with no swipe', async ({ page }) => {
  await open(page);
  await answerStarter(page, FIRST, true);
  await nextCard(page);
  await expect(card(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await page.getByRole('button', { name: 'Previous card' }).click();
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  await expect(page.getByTestId('review-verdict')).toContainText(FIRST.why);
});

test('no earlier card means no Previous card button', async ({ page }) => {
  await open(page);
  await answerStarter(page, FIRST, true);
  await expect(page.getByRole('button', { name: 'Previous card' })).toHaveCount(0);
});

test('a half-placed order card is still half placed after looking back', async ({ page }) => {
  const index = STARTER.findIndex((c) => c.type === 'order');
  const order = STARTER[index]!;
  await open(page);
  await playStarters(page, index);
  await expect(card(page).getByRole('heading', { name: order.title })).toBeVisible();
  const first = order.steps![0]!;
  await page.getByRole('button', { name: `Place: ${first}` }).click();

  await swipeRight(page);
  await expect(reviewCard(page)).toBeVisible();
  await swipeLeft(page);
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Step 1: / })).toHaveCount(1);
  await expect(page.getByRole('button', { name: `Place: ${first}` })).toHaveCount(0);
});

test('answered cards are still there after a reload, on an answered card and on the welcome card', async ({ page }) => {
  await open(page);
  await answerStarter(page, FIRST, true);
  // The save is debounced by a second; reload fires pagehide, which flushes it.
  await page.reload();
  await expect(card(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  await swipeLeft(page);

  for (const c of STARTER.slice(1, -1)) {
    await answerStarter(page, c, true);
    await nextCard(page);
  }
  await answerStarter(page, STARTER.at(-1)!, true);
  await page.reload();
  await expect(page.getByTestId('welcome')).toBeVisible();
  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: STARTER.at(-1)!.title })).toBeVisible();
});

test('a status card can look back too, and is still there on return', async ({ page }) => {
  await open(page);
  await playStarters(page, 1);
  for (const c of STARTER.slice(1)) {
    await expect(card(page).getByRole('heading', { name: c.title })).toBeVisible();
    await page.getByRole('button', { name: 'Skip this card' }).click();
  }
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  await swipeLeft(page);
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('an answered order card and a flagged card look back as they ended', async ({ page }) => {
  const index = STARTER.findIndex((c) => c.type === 'order');
  const order = STARTER[index]!;
  await open(page);
  await playStarters(page, index);
  await answerStarter(page, order, false);
  await page.getByRole('button', { name: 'Card was wrong' }).click();
  await nextCard(page);

  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: order.title })).toBeVisible();
  await expect(
    reviewCard(page)
      .getByText(/^Belongs at step/)
      .first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Place:/ })).toHaveCount(0);
  await expect(page.getByTestId('review-verdict')).toContainText("won't count against you");
});

test('a batch landing behind a review waits there', async ({ page }) => {
  const { promise: held, resolve: release } = Promise.withResolvers<boolean>();
  await page.route('**/api/cards', async (route) => {
    await held;
    await route.fulfill({
      status: 200,
      body: ndjson(GENERATED),
      headers: { 'content-type': 'application/x-ndjson' },
    });
  });
  await open(page);
  await playStarters(page, 1);
  for (const c of STARTER.slice(1)) {
    await expect(card(page).getByRole('heading', { name: c.title })).toBeVisible();
    await page.getByRole('button', { name: 'Skip this card' }).click();
  }
  await expect(card(page)).toHaveCount(0);

  await swipeRight(page);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  release(true);
  // The live card arrives hidden, and the review stays put.
  await expect(card(page)).toHaveCount(1);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
  await swipeLeft(page);
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(card(page).getByRole('heading', { name: GENERATED[0]!.title })).toBeVisible();
});

test('on a card too long to fit, swiping up only leaves the review from the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 520 });
  await open(page);
  await answerStarter(page, FIRST, true);
  await nextCard(page);
  await answerStarter(page, SECOND, true);
  await page.getByRole('button', { name: 'Previous card' }).click();
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();

  await swipeUp(page);
  await expect(reviewCard(page)).toBeVisible();

  await page.getByRole('button', { name: 'Back to current card' }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 4000);
  await swipeUp(page);
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(card(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
});

test('a sideways drag over an option does not answer the card', async ({ page }) => {
  await open(page);
  await playStarters(page, 1);
  await expect(card(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  const option = (await page.getByRole('button', { name: /^Option A/ }).boundingBox())!;
  const y = option.y + option.height / 2;
  await page.mouse.move(option.x + 20, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(option.x + 20 + i * 15, y, { steps: 2 });
  await page.mouse.up();
  await expect(page.getByTestId('verdict')).toHaveCount(0);
  await expect(reviewCard(page).getByRole('heading', { name: FIRST.title })).toBeVisible();
});

test('a diagonal drag neither advances nor looks back', async ({ page }) => {
  await open(page);
  await playStarters(page, 1);
  await answerStarter(page, SECOND, true);
  const box = (await page.getByTestId('top-bar').boundingBox())!;
  const [x, y] = [box.x + 40, box.y + box.height + 400];
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + i * 12, y - i * 12, { steps: 2 });
  await page.mouse.up();
  await expect(card(page).getByRole('heading', { name: SECOND.title })).toBeVisible();
  await expect(reviewCard(page)).toHaveCount(0);
  await expect(page.getByTestId('verdict')).toBeVisible();
});
