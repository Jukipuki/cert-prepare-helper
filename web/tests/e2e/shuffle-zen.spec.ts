import { test, expect, type Page } from '@playwright/test';

async function answerCurrentQuestion(page: Page) {
  // Scoped to the question card (<article>): a screen reached via client-side navigation can
  // still have its own inputs in the DOM during the transition (e.g. the mode-choice screen's own
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

async function firstOptionLocator(page: Page) {
  const questionCard = page.locator('article');
  await questionCard.locator('input[type="radio"], input[type="checkbox"]').first().waitFor();
  const radios = questionCard.getByRole('radio');
  if ((await radios.count()) > 0) return radios.first();
  return questionCard.getByRole('checkbox').first();
}

async function currentQuestionText(page: Page): Promise<string> {
  // Scoped to the question card's own heading — <dialog> elements for the confirm controls are
  // always present in the DOM (open/closed via `showModal`), so a bare `h2` also matches them.
  return (await page.locator('article h2').textContent()) ?? '';
}

test.describe('shuffled zen order — V2', () => {
  test('randomizes the order relative to source order and still presents every question exactly once', async ({
    page,
  }) => {
    // Baseline: the exam's known unshuffled first question.
    await page.goto('/quiz?exam=CCDV-F&mode=zen');
    const unshuffledFirst = await currentQuestionText(page);

    // Turn shuffle on via the mode-choice screen's toggle, then start a zen session.
    await page.goto('/exam/CCDV-F');
    await page.getByRole('checkbox', { name: /shuffle/i }).check();
    await page.getByRole('link', { name: /zen mode/i }).click();
    await expect(page).toHaveURL('/quiz?exam=CCDV-F&mode=zen&shuffle=1');

    const seenQuestions: string[] = [];
    let guard = 0;
    while (guard < 60) {
      guard += 1;
      const resultsHeading = page.getByRole('heading', { name: /session complete/i });
      if (await resultsHeading.count()) break;

      seenQuestions.push(await currentQuestionText(page));
      await answerCurrentQuestion(page);
      await page.getByRole('button', { name: /submit answer/i }).click();

      const nextButton = page.getByRole('button', { name: /next question/i });
      if (await nextButton.count()) {
        await nextButton.click();
      }
    }

    await expect(page.getByRole('heading', { name: /session complete/i })).toBeVisible();

    // Every question appears exactly once — no omission, no duplication (SC-002).
    expect(seenQuestions).toHaveLength(53);
    expect(new Set(seenQuestions).size).toBe(53);

    // The order differs from the exam's fixed source order (SC-003).
    expect(seenQuestions[0]).not.toBe(unshuffledFirst);
  });

  test('produces an independently randomized order across separate sessions', async ({ page }) => {
    await page.goto('/exam/CCDV-F');
    await page.getByRole('checkbox', { name: /shuffle/i }).check();
    await page.getByRole('link', { name: /zen mode/i }).click();
    const firstSessionFirstQuestion = await currentQuestionText(page);

    // A fresh navigation with shuffle on starts a new, independently randomized session.
    await page.goto('/exam/CCDV-F');
    await page.getByRole('checkbox', { name: /shuffle/i }).check();
    await page.getByRole('link', { name: /zen mode/i }).click();
    const secondSessionFirstQuestion = await currentQuestionText(page);

    expect(secondSessionFirstQuestion).not.toBe(firstSessionFirstQuestion);
  });
});

test.describe('shuffled zen mode behaves identically to unshuffled zen mode — V4', () => {
  test('grading, locking, backward navigation and results are unaffected by shuffling', async ({
    page,
  }) => {
    await page.goto('/quiz?exam=CCDV-F&mode=zen&shuffle=1');

    // No countdown appears — same as unshuffled zen mode.
    await expect(page.getByText(/\d{1,3}:\d{2}/)).toHaveCount(0);

    const firstOption = await firstOptionLocator(page);
    await firstOption.check();
    await page.getByRole('button', { name: /submit answer/i }).click();

    await expect(page.getByText(/^(correct|incorrect)$/i)).toBeVisible();
    await expect(page.getByText(/correct answer/i)).toBeVisible();
    await expect(firstOption).toBeDisabled();

    const scoreBefore = await page.getByText(/correct so far/i).textContent();
    await page.getByRole('button', { name: /next question/i }).click();
    await page.getByRole('button', { name: /^back$/i }).click();

    // Stepping back to the graded question shows it locked, with its result unchanged.
    await expect(await firstOptionLocator(page)).toBeDisabled();
    await expect(page.getByText(/correct answer/i)).toBeVisible();
    const scoreAfter = await page.getByText(/correct so far/i).textContent();
    expect(scoreAfter).toBe(scoreBefore);
  });
});

test.describe('exam mode ignores the shuffle toggle — V5', () => {
  test('starting exam mode with shuffle checked still uses the fixed source order', async ({
    page,
  }) => {
    await page.goto('/quiz?exam=CCDV-F&mode=exam');
    const unshuffledExamFirst = await currentQuestionText(page);

    await page.goto('/exam/CCDV-F');
    await page.getByRole('checkbox', { name: /shuffle/i }).check();
    await page.getByRole('link', { name: /exam mode/i }).click();

    await expect(page).toHaveURL('/quiz?exam=CCDV-F&mode=exam');
    expect(await currentQuestionText(page)).toBe(unshuffledExamFirst);
    await expect(page.getByRole('timer')).toContainText('120:00');
  });
});
