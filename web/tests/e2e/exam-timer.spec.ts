import { test, expect } from '@playwright/test';

const EXAM_DURATION_MS = 120 * 60_000;

test.describe('exam timer', () => {
  test('V7 — expiry auto-submits within 1s, retains selections, no candidate action', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-01-01T09:00:00Z') });
    await page.goto('/quiz?exam=CCDV-F&mode=exam');

    // Countdown starts at 120:00 and is visible.
    await expect(page.getByRole('timer')).toContainText('120:00');

    // Answer the first question before time runs out.
    await page.getByRole('radio').first().check();

    // Jump straight past the 120-minute deadline — no candidate action after this.
    await page.clock.fastForward(EXAM_DURATION_MS + 1000);

    await expect(page.getByText(/time expired/i)).toBeVisible({ timeout: 5000 });

    // The selection made before expiry is retained and visible in the review.
    const firstAnswerLine = page.getByText(/your answer/i).first();
    await expect(firstAnswerLine).toBeVisible();
    await expect(firstAnswerLine).not.toContainText('No answer selected');
  });

  test('remaining time reflects real elapsed time after a long background gap, including already expired', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-01-01T09:00:00Z') });
    await page.goto('/quiz?exam=CCDV-F&mode=exam');
    await expect(page.getByRole('timer')).toContainText('120:00');

    // Simulate the tab being backgrounded/throttled for well over an hour in one jump.
    await page.clock.fastForward(90 * 60_000);
    await expect(page.getByRole('timer')).toContainText('30:0');

    // And a jump straight past expiry while away, without ever seeing the intermediate ticks.
    await page.clock.fastForward(31 * 60_000);
    await expect(page.getByText(/time expired/i)).toBeVisible({ timeout: 5000 });
  });
});
