import { test, expect, type Page } from '@playwright/test';

// CCAR-P question 1.11 (scenario_matching, 5 sub-scenarios) sits at grid position 11 in the real
// seed's question order — verified by inspecting the generated bundle. Jumping there via the exam
// grid avoids playing through 10 prior questions just to reach it.
async function jumpToScenarioMatchingQuestion(page: Page) {
  await page.goto('/quiz?exam=CCAR-P&mode=exam');
  await page.getByRole('button', { name: /^question 11,/i }).click();
  await expect(page.getByText('Question 11 of 63', { exact: true })).toBeVisible();
}

async function answerCurrentQuestion(page: Page) {
  // Scoped to the question card (<article>): a screen reached via client-side navigation can
  // still have its own inputs in the DOM during the transition (e.g. the mode-choice screen's
  // shuffle checkbox), and an unscoped selector could match those instead of the real question's.
  const questionCard = page.locator('article');
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

test.describe('CCAR-P scenario-matching — V8, V9, V11 (exam mode)', () => {
  test('states the number of sub-scenarios requiring classification before answering (V8, FR-011)', async ({
    page,
  }) => {
    await jumpToScenarioMatchingQuestion(page);
    await expect(page.getByText(/classify all 5 scenarios/i)).toBeVisible();
  });

  test('accepts the same choice reused across sub-scenarios without any error (V9, FR-012)', async ({
    page,
  }) => {
    await jumpToScenarioMatchingQuestion(page);

    const optionA = page.getByRole('radio', { name: /^A\./ });
    await optionA.nth(0).check(); // sub-scenario 1
    await optionA.nth(4).check(); // sub-scenario 5 — same choice, real recorded answer reuses it too

    // Reusing a choice is accepted, not flagged: both rows keep their selection, and nothing in the
    // app's own content area reports an error (the dev-tools chrome outside <main> is not in scope).
    await expect(optionA.nth(0)).toBeChecked();
    await expect(optionA.nth(4)).toBeChecked();
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  });

  test('discloses per-sub-scenario correctness at submission and in review, not one aggregate verdict (V11, FR-013/FR-014)', async ({
    page,
  }) => {
    await jumpToScenarioMatchingQuestion(page);

    // Real recorded answer is A, B, C, D, A — classify the last sub-scenario wrong (B instead of A).
    const answers = ['A', 'B', 'C', 'D', 'B'];
    for (let index = 0; index < answers.length; index += 1) {
      const key = answers[index];
      await page
        .getByRole('radio', { name: new RegExp(`^${key}\\.`) })
        .nth(index)
        .check();
    }

    await page.getByRole('button', { name: /submit exam/i }).click();
    await expect(page.getByText(/questions outstanding/i)).toBeVisible();
    await page.getByRole('button', { name: /^submit$/i }).click();
    await expect(page.getByText(/exam submitted/i)).toBeVisible();

    // The review lists every question by default (63 of them) — the other four scenario_matching
    // questions (left entirely unanswered) also render their own "Scenario 1/2/3/4/5" rows, so scope
    // every assertion to question 1.11's own review card, not the whole page.
    const question1_11Card = page.getByText('Question 1.11', { exact: false }).locator('..');

    // Per-sub-scenario disclosure — four correct, one incorrect, shown individually, not one
    // aggregate verdict for the whole question.
    await expect(question1_11Card.getByText(/^scenario 1: correct/i)).toBeVisible();
    await expect(question1_11Card.getByText(/^scenario 2: correct/i)).toBeVisible();
    await expect(question1_11Card.getByText(/^scenario 3: correct/i)).toBeVisible();
    await expect(question1_11Card.getByText(/^scenario 4: correct/i)).toBeVisible();
    const scenario5 = question1_11Card.getByText(/^scenario 5: incorrect/i);
    await expect(scenario5).toBeVisible();
    await expect(scenario5).toContainText(/your answer b\./i);
    await expect(scenario5).toContainText(/correct answer a\./i);
  });
});

test.describe('CCAR-P scenario-matching — V10 (zen mode)', () => {
  test('refuses an incomplete zen submission and states how many sub-scenarios remain', async ({
    page,
  }) => {
    await page.goto('/quiz?exam=CCAR-P&mode=zen');

    // Answer the 10 questions ahead of 1.11 to reach it via zen's sequential navigation.
    for (let i = 0; i < 10; i += 1) {
      await answerCurrentQuestion(page);
      await page.getByRole('button', { name: /submit answer/i }).click();
      await page.getByRole('button', { name: /next question/i }).click();
    }
    await expect(page.getByText('Question 11 of 63', { exact: true })).toBeVisible();
    await expect(page.getByText(/classify all 5 scenarios/i)).toBeVisible();

    // Classify only 2 of the 5 sub-scenarios, then attempt to submit.
    await page.getByRole('radio', { name: /^A\./ }).nth(0).check();
    await page.getByRole('radio', { name: /^B\./ }).nth(1).check();
    await page.getByRole('button', { name: /submit answer/i }).click();

    await expect(page.getByText(/select exactly 5/i)).toBeVisible();
    // Refused, not graded — no disclosure appears.
    await expect(page.getByText(/scenario 1:/i)).toHaveCount(0);
  });
});
