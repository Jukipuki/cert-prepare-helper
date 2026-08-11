import { test, expect } from '@playwright/test';

test.describe('exam disclosure discipline', () => {
  test('V5 — no correctness signal, correct answer, or rationale before submission', async ({
    page,
  }) => {
    await page.goto('/quiz?mode=exam');

    // Answer a few questions, navigate freely, and revisit an earlier one.
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /^next$/i }).click();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /^previous$/i }).click();

    // Jump directly via the grid.
    await page.getByRole('button', { name: /^question 3,/i }).click();

    // No disclosure anywhere: no feedback icon, no correctness label, no correct-answer text.
    await expect(page.locator('[data-feedback-icon]')).toHaveCount(0);
    await expect(page.getByText('Correct', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Incorrect', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/correct answer/i)).toHaveCount(0);

    // Keyboard-only traversal through several questions still discloses nothing.
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab');
    }
    await expect(page.getByText(/correct answer/i)).toHaveCount(0);
    await expect(page.locator('[data-feedback-icon]')).toHaveCount(0);
  });
});
