import { test, expect } from '@playwright/test';

const EXAMS: { code: string; name: string; totalQuestions: number; domain: string }[] = [
  { code: 'CCDV-F', name: 'CCDV-F', totalQuestions: 53, domain: 'Agents and Workflows' },
  { code: 'CCAR-F', name: 'CCAR-F', totalQuestions: 60, domain: 'Agentic Architecture & Orchestration' },
  { code: 'CCAR-Fv2', name: 'CCAR-Fv2', totalQuestions: 60, domain: 'Agentic Architecture & Orchestration' },
];

test.describe('exam selection — V1', () => {
  test('lists every configured exam with name, question count and domain breakdown before anything else (FR-001, FR-002)', async ({
    page,
  }) => {
    await page.goto('/');

    for (const exam of EXAMS) {
      const card = page.getByTestId(`exam-card-${exam.code}`);
      await expect(card.getByRole('link', { name: exam.name, exact: true })).toBeVisible();
      // Scope the count assertion to this exam's own card — CCAR-F and CCAR-Fv2 share a count.
      await expect(card.getByText(`${exam.totalQuestions} questions`, { exact: true })).toBeVisible();
    }
    // Domain breakdown is visible for at least the first exam without any further interaction.
    await expect(page.getByText('Agents and Workflows')).toBeVisible();

    // No mode choice or question is shown until an exam is chosen.
    await expect(page.getByRole('link', { name: /zen mode/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /exam mode/i })).toHaveCount(0);
  });
});

test.describe('exam scoping — V2', () => {
  for (const exam of EXAMS) {
    test(`choosing ${exam.code} scopes the mode choice and the session to that exam only`, async ({
      page,
    }) => {
      await page.goto('/');
      await page.getByRole('link', { name: exam.name, exact: true }).click();

      await expect(page).toHaveURL(`/exam/${exam.code}`);
      await expect(page.getByRole('heading', { name: exam.name, exact: true })).toBeVisible();
      await expect(page.getByText(`${exam.totalQuestions} practice questions`)).toBeVisible();

      await page.getByRole('link', { name: /zen mode/i }).click();
      await expect(page).toHaveURL(`/quiz?exam=${exam.code}&mode=zen`);
      await expect(
        page.getByText(`Question 1 of ${exam.totalQuestions}`, { exact: true }),
      ).toBeVisible();

      // Answer the first question and confirm the session stays scoped to this exam's content.
      await page.locator('input[type="radio"], input[type="checkbox"]').first().waitFor();
      const radios = page.getByRole('radio');
      if ((await radios.count()) > 0) {
        await radios.first().check();
      } else {
        await page.getByRole('checkbox').first().check();
      }
      await page.getByRole('button', { name: /submit answer/i }).click();
      await expect(page.getByText(/^(correct|incorrect)$/i)).toBeVisible();
    });
  }
});
