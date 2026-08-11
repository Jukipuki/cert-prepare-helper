import { test, expect } from '@playwright/test';

test.describe('zen mode journey', () => {
  test('V2 — answer, grade, lock, and refuse invalid submissions', async ({ page }) => {
    await page.goto('/quiz?mode=zen');

    // No countdown appears anywhere in zen mode.
    await expect(page.getByText(/\d{1,3}:\d{2}/)).toHaveCount(0);

    // Submit with nothing selected — refused with a message naming what is required.
    await page.getByRole('button', { name: /submit answer/i }).click();
    await expect(page.getByText(/select exactly/i)).toBeVisible();

    // Answer the first question.
    const firstOption = page.getByRole('radio').first();
    await firstOption.check();
    await page.getByRole('button', { name: /submit answer/i }).click();

    // Grading is immediate: correctness, correct option(s) and rationale all appear.
    await expect(page.getByText(/^(correct|incorrect)$/i)).toBeVisible();
    await expect(page.getByText(/correct answer/i)).toBeVisible();

    // The graded question is locked — options are disabled.
    await expect(firstOption).toBeDisabled();

    // Advance and confirm no countdown ever appears.
    await page.getByRole('button', { name: /next question/i }).click();
    await expect(page.getByText(/\d{1,3}:\d{2}/)).toHaveCount(0);
  });

  test('V3 — stepping back preserves the graded state and score', async ({ page }) => {
    await page.goto('/quiz?mode=zen');

    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /submit answer/i }).click();
    await expect(page.getByText(/^(correct|incorrect)$/i)).toBeVisible();

    const scoreBefore = await page.getByText(/correct so far/i).textContent();

    await page.getByRole('button', { name: /next question/i }).click();
    await page.getByRole('button', { name: /^back$/i }).click();

    // Stepping back shows the original selection, correct answers and rationale, still locked.
    await expect(page.getByRole('radio').first()).toBeDisabled();
    await expect(page.getByText(/correct answer/i)).toBeVisible();

    const scoreAfter = await page.getByText(/correct so far/i).textContent();
    expect(scoreAfter).toBe(scoreBefore);
  });
});
