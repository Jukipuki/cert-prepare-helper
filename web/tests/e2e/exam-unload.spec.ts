import { test, expect, type Page } from '@playwright/test';

async function dispatchBeforeUnload(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

test.describe('unload guard — V8', () => {
  test('prompts during an in-progress exam', async ({ page }) => {
    await page.goto('/quiz?mode=exam');
    await page.getByRole('radio').first().waitFor();
    expect(await dispatchBeforeUnload(page)).toBe(true);
  });

  test('does not prompt after an exam is submitted', async ({ page }) => {
    await page.goto('/quiz?mode=exam');
    await page.getByRole('button', { name: /submit exam/i }).click();
    await page.getByRole('button', { name: /^submit$/i }).click(); // confirm despite unanswered
    await expect(page.getByText(/exam submitted/i)).toBeVisible();

    expect(await dispatchBeforeUnload(page)).toBe(false);
  });

  test('never prompts during a zen session', async ({ page }) => {
    await page.goto('/quiz?mode=zen');
    await page.getByRole('radio').first().waitFor();
    expect(await dispatchBeforeUnload(page)).toBe(false);
  });
});
