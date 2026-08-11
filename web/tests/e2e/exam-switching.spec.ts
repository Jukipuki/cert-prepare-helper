import { test, expect, type Page } from '@playwright/test';

async function answerCurrentQuestion(page: Page) {
  // Scoped to the question card (<article>): a screen reached via client-side navigation can
  // still have its own inputs in the DOM during the transition (e.g. the mode-choice screen's
  // shuffle checkbox), and an unscoped selector could match those instead of the real question's.
  const questionCard = page.locator('article');
  // .count() does not auto-wait like other Playwright assertions, so wait for at least one option
  // input to be attached before branching on radio vs. checkbox counts.
  await questionCard.locator('input[type="radio"], input[type="checkbox"]').first().waitFor();

  const radios = questionCard.getByRole('radio');
  if ((await radios.count()) > 0) {
    await radios.first().check();
    return;
  }

  const hint = await page.getByText(/select \d+/i).textContent();
  const match = hint?.match(/\d+/);
  const required = match ? Number(match[0]) : 1;
  const checkboxes = questionCard.getByRole('checkbox');
  for (let i = 0; i < required; i += 1) {
    await checkboxes.nth(i).check();
  }
}

test.describe('shared question numbers do not collide — V3', () => {
  test("CCDV-F's and CCAR-F's independently-numbered 1.1 questions are distinct", async ({
    page,
  }) => {
    await page.goto('/quiz?exam=CCDV-F&mode=zen');
    await expect(page.getByText('Question 1 of 53', { exact: true })).toBeVisible();
    const ccdvFirstText = await page.locator('main').textContent();

    await page.goto('/quiz?exam=CCAR-F&mode=zen');
    await expect(page.getByText('Question 1 of 60', { exact: true })).toBeVisible();
    const ccarFirstText = await page.locator('main').textContent();

    expect(ccdvFirstText).not.toEqual(ccarFirstText);
  });
});

test.describe('changing exams mid-session — V4', () => {
  test('requires confirmation and leaves no residue from the previous exam', async ({ page }) => {
    await page.goto('/quiz?exam=CCDV-F&mode=zen');
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /submit answer/i }).click();
    await expect(page.getByText(/^(correct|incorrect)$/i)).toBeVisible();

    // Changing exams mid-session is confirmed, not immediate.
    await page.getByRole('button', { name: /^change exam$/i }).click();
    await expect(page.getByText(/discard this session and choose a different exam/i)).toBeVisible();
    await page.getByRole('button', { name: /discard and change exam/i }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'CCDV-F', exact: true })).toBeVisible();

    // Starting CCDV-F again is a clean session — no residue from the discarded one.
    await page.getByRole('link', { name: 'CCDV-F', exact: true }).click();
    await page.getByRole('link', { name: /zen mode/i }).click();
    await expect(page.getByText('Question 1 of 53', { exact: true })).toBeVisible();
    await expect(page.getByText('0 correct so far')).toBeVisible();
    await expect(page.getByText(/^(correct|incorrect)$/i)).toHaveCount(0);
  });

  test('finishing a session first requires no confirmation to change exams', async ({ page }) => {
    await page.goto('/quiz?exam=CCDV-F&mode=zen');

    let guard = 0;
    while (guard < 60) {
      guard += 1;
      if (await page.getByRole('heading', { name: /session complete/i }).count()) break;
      await answerCurrentQuestion(page);
      await page.getByRole('button', { name: /submit answer/i }).click();
      const next = page.getByRole('button', { name: /next question/i });
      if (await next.count()) await next.click();
    }
    await expect(page.getByRole('heading', { name: /session complete/i })).toBeVisible();

    await page.getByRole('button', { name: /^change exam$/i }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('start over vs. change exam — V5', () => {
  test('start over returns to the same exam; change exam returns to the exam list', async ({
    page,
  }) => {
    await page.goto('/quiz?exam=CCAR-F&mode=zen');
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /submit answer/i }).click();

    await page.getByRole('button', { name: /^start over$/i }).click();
    await expect(page.getByText(/discard this session\?/i)).toBeVisible();
    await page.getByRole('button', { name: /discard and start over/i }).click();
    await expect(page).toHaveURL('/exam/CCAR-F');

    await page.getByRole('link', { name: /zen mode/i }).click();
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /submit answer/i }).click();

    await page.getByRole('button', { name: /^change exam$/i }).click();
    await page.getByRole('button', { name: /discard and change exam/i }).click();
    await expect(page).toHaveURL('/');
  });
});
