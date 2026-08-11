import { test, expect, type Page } from '@playwright/test';

async function answerCurrentQuestion(page: Page) {
  // .count() does not auto-wait like other Playwright assertions, so wait for at least one option
  // input to be attached before branching on radio vs. checkbox counts.
  await page.locator('input[type="radio"], input[type="checkbox"]').first().waitFor();

  const radios = page.getByRole('radio');
  if ((await radios.count()) > 0) {
    await radios.first().check();
    return;
  }

  const hint = await page.getByText(/select \d+/i).textContent();
  const match = hint?.match(/\d+/);
  const required = match ? Number(match[0]) : 1;
  const checkboxes = page.getByRole('checkbox');
  for (let i = 0; i < required; i += 1) {
    await checkboxes.nth(i).check();
  }
}

test.describe('review and restart — V9', () => {
  test('reviews a completed zen session, filters to missed questions, and restarts into exam mode', async ({
    page,
  }) => {
    await page.goto('/quiz?mode=zen');

    // Complete the whole session — grading the final question submits it automatically.
    let guard = 0;
    while (guard < 60) {
      guard += 1;
      const resultsHeading = page.getByRole('heading', { name: /session complete/i });
      if (await resultsHeading.count()) break;

      await answerCurrentQuestion(page);
      await page.getByRole('button', { name: /submit answer/i }).click();

      const nextButton = page.getByRole('button', { name: /next question/i });
      if (await nextButton.count()) {
        await nextButton.click();
      }
    }

    await expect(page.getByRole('heading', { name: /session complete/i })).toBeVisible();

    // The review lists every question with the candidate's selection, the correct answer(s) and
    // the rationale.
    await expect(page.getByText(/your answer/i).first()).toBeVisible();
    await expect(page.getByText(/correct answer/i).first()).toBeVisible();

    // Narrow to incorrect and unanswered only.
    await page.getByRole('button', { name: /incorrect & unanswered/i }).click();
    await expect(page.getByRole('button', { name: /incorrect & unanswered/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Start over returns to the mode choice with a clean slate.
    await page.getByRole('button', { name: /^start over$/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: /exam mode/i })).toBeVisible();

    // A fresh exam session gets a full 120 minutes.
    await page.getByRole('link', { name: /exam mode/i }).click();
    await expect(page.getByRole('timer')).toContainText('120:00');
  });
});
