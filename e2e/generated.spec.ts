import { expect, test, type Page } from '@playwright/test';

import { GENERATED, ndjson } from './generated';
import { answerStarter, card, nextCard, open, openTopics, STARTER, stubApi } from './helpers';

/** Skips the starter cards still showing; stops at the first non-starter card or status card. */
async function skipStarters(page: Page) {
  for (const c of STARTER) {
    const heading = card(page).getByRole('heading', { name: c.title });
    if ((await heading.count()) === 0) continue;
    await page.getByRole('button', { name: 'Skip this card' }).click();
    await expect(heading).toHaveCount(0);
  }
}

test('generated cards play, the request carries the chosen topics, and stats add up', async ({ page }) => {
  const requests = await stubApi(page, { status: 200, body: ndjson(GENERATED) });
  await open(page);
  await openTopics(page);
  await page.getByRole('button', { name: 'Cache with expiry' }).click();
  await page.getByRole('button', { name: 'Job scheduler' }).click();
  await expect(page.getByRole('button', { name: 'All topics' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Done' }).click();

  // Nothing is fetched until the first answer.
  expect(requests).toHaveLength(0);
  await answerStarter(page, STARTER[0], true);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({ domains: ['cache', 'jobs'], recent: ['Overlapping bookings'] });
  expect((requests[0] as { deviceId: string }).deviceId).toMatch(/^[0-9a-f-]{36}$/);

  await nextCard(page);
  await skipStarters(page);
  await expect(card(page).getByRole('heading', { name: 'Stale after expiry' })).toBeVisible();
  await page.getByRole('button', { name: /^Line 5: / }).click();
  await expect(page.getByTestId('verdict')).toBeVisible();
  await nextCard(page);
  await expect(card(page).getByRole('heading', { name: 'Thundering herd' })).toBeVisible();
  // Wrong on purpose: the right answer is B.
  await page.getByRole('button', { name: /^Option A: / }).click();
  await expect(page.getByTestId('verdict-points')).toHaveText('+0');
  await nextCard(page);

  await openTopics(page);
  await expect(page.getByTestId('stat-answered')).toHaveText('3');
  await expect(page.getByTestId('stat-accuracy')).toHaveText('67%');
  await expect(page.getByTestId('stat-best')).toHaveText('2');
  // Skipped starters don't count; the missed generated card waits as a rematch.
  await expect(page.getByTestId('stat-rematches')).toHaveText('1');
});

test('a 503 shows the error card with Try again, and rematches stay playable', async ({ page }) => {
  const requests = await stubApi(page, { status: 503, body: '{"error":"unavailable"}', headers: { 'content-type': 'application/json' } });
  await open(page);
  await answerStarter(page, STARTER[0], false);
  await nextCard(page);
  await answerStarter(page, STARTER[1], false);
  await nextCard(page);
  await skipStarters(page);
  // The missed cards come back while there is nothing new.
  for (let i = 0; i < 2; i++) {
    await expect(card(page).getByText('Rematch')).toBeVisible();
    const title = (await card(page).getByRole('heading').textContent())!;
    const c = STARTER.find((s) => s.title === title)!;
    await answerStarter(page, c, true);
    await nextCard(page);
  }
  await expect(page.getByTestId('error')).toBeVisible();
  const before = requests.length;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => requests.length).toBe(before + 1);
  await expect(page.getByTestId('error')).toBeVisible();
});

test('a 429 is never retried automatically', async ({ page }) => {
  const requests = await stubApi(page, { status: 429, body: '{"error":"rate_limited"}', headers: { 'content-type': 'application/json', 'retry-after': '20' } });
  await open(page);
  await answerStarter(page, STARTER[0], true);
  await expect.poll(() => requests.length).toBe(1);
  for (const c of STARTER.slice(1, 4)) {
    await nextCard(page);
    await answerStarter(page, c, true);
  }
  await page.waitForTimeout(500);
  expect(requests).toHaveLength(1);
});

test.describe('full stack (no stubs)', () => {
  // A second server.js whose OPENROUTER_BASE_URL points at scripts/stub-openrouter.mjs.
  test.use({ baseURL: 'http://localhost:8093' });

  test('plays cards generated through the real /api/cards route', async ({ page }) => {
    await open(page);
    await answerStarter(page, STARTER[0], true);
    await nextCard(page);
    await skipStarters(page);
    // The stub streams scripts/stub-cards.json; the first is a flaw card about expiring holds.
    await expect(card(page).getByRole('heading', { name: 'Late checkout window' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /^Line 5: return age <= 15 \* 60 \* 60$/ }).click();
    await expect(page.getByTestId('verdict-points')).not.toHaveText('+0');
    await nextCard(page);
    await expect(card(page).getByRole('heading', { name: 'Double tap on pay' })).toBeVisible();
  });
});
