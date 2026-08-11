import { test, expect, type Page } from '@playwright/test';

interface FocusInfo {
  tag: string;
  type: string | null;
  text: string;
}

async function focusedElementInfo(page: Page): Promise<FocusInfo | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    return {
      tag: el.tagName,
      type: el.getAttribute('type'),
      text: el.textContent?.trim() ?? '',
    };
  });
}

async function tabUntil(
  page: Page,
  predicate: (info: FocusInfo | null) => boolean,
  maxSteps = 30,
): Promise<void> {
  for (let i = 0; i < maxSteps; i += 1) {
    await page.keyboard.press('Tab');
    if (predicate(await focusedElementInfo(page))) return;
  }
  throw new Error('tabUntil: focus target not reached within maxSteps');
}

/** Checks current focus first (React sometimes retains focus across a reconciled element) before
 * falling back to tabbing forward, so it works whether or not focus already landed on the target. */
async function reachButton(page: Page, pattern: RegExp, maxSteps = 30): Promise<void> {
  const current = await focusedElementInfo(page);
  if (current?.tag === 'BUTTON' && pattern.test(current.text)) return;
  await tabUntil(page, (info) => info?.tag === 'BUTTON' && pattern.test(info.text), maxSteps);
}

async function assertFocusVisible(page: Page): Promise<void> {
  const outlineStyle = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? getComputedStyle(el).outlineStyle : null;
  });
  expect(outlineStyle).not.toBe('none');
}

test.describe('keyboard-only completion — SC-011', () => {
  test('completes an entire zen session using only the keyboard, with focus visible throughout', async ({
    page,
  }) => {
    await page.goto('/quiz?mode=zen');
    await page.locator('input[type="radio"], input[type="checkbox"]').first().waitFor();

    let guard = 0;
    while (guard < 60) {
      guard += 1;
      if (await page.getByRole('heading', { name: /session complete/i }).count()) break;

      await tabUntil(
        page,
        (info) => info?.tag === 'INPUT' && (info.type === 'radio' || info.type === 'checkbox'),
      );
      await assertFocusVisible(page);

      const hintCount = await page.getByText(/select \d+/i).count();
      if (hintCount > 0) {
        const hintText = await page
          .getByText(/select \d+/i)
          .first()
          .textContent();
        const required = Number(hintText?.match(/\d+/)?.[0] ?? 1);
        await page.keyboard.press(' ');
        for (let k = 1; k < required; k += 1) {
          await page.keyboard.press('Tab');
          await page.keyboard.press(' ');
        }
      } else {
        await page.keyboard.press(' ');
      }

      await reachButton(page, /submit answer/i);
      await assertFocusVisible(page);
      await page.keyboard.press('Enter');

      if (await page.getByRole('button', { name: /next question/i }).count()) {
        await reachButton(page, /next question/i);
        await page.keyboard.press('Enter');
      }
    }

    await expect(page.getByRole('heading', { name: /session complete/i })).toBeVisible();
  });

  test('completes an exam session using only the keyboard, with focus visible throughout', async ({
    page,
  }) => {
    await page.goto('/quiz?mode=exam');
    await page.locator('input[type="radio"], input[type="checkbox"]').first().waitFor();

    // Answer a couple of questions, advancing via the keyboard-reachable Next button.
    for (let i = 0; i < 2; i += 1) {
      await tabUntil(
        page,
        (info) => info?.tag === 'INPUT' && (info.type === 'radio' || info.type === 'checkbox'),
      );
      await assertFocusVisible(page);
      await page.keyboard.press(' ');

      await reachButton(page, /^next$/i);
      await page.keyboard.press('Enter');
    }

    await reachButton(page, /submit exam/i);
    await assertFocusVisible(page);
    await page.keyboard.press('Enter');

    // Confirmation dialog — reach its confirm button by keyboard and activate it.
    await expect(page.getByText(/submit with questions outstanding/i)).toBeVisible();
    await reachButton(page, /^submit$/i);
    await assertFocusVisible(page);
    await page.keyboard.press('Enter');

    await expect(page.getByText(/exam submitted/i)).toBeVisible();
  });
});
