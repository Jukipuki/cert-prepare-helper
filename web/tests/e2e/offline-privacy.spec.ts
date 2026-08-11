import { test, expect, type Page } from '@playwright/test';

async function answerCurrentQuestion(page: Page) {
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

const SENSITIVE_DATA_PATTERN = /correct|score|percentage|rationale|selectedanswer|timeused/i;

test.describe('offline and privacy — V11', () => {
  test('completes a full zen session offline, with zero third-party requests and no answer/score/timing data on the wire', async ({
    page,
    context,
  }) => {
    const requests: { url: string; postData: string | null }[] = [];
    page.on('request', (req) => {
      requests.push({ url: req.url(), postData: req.postData() });
    });

    await page.goto('/quiz?exam=CCDV-F&mode=zen');
    await page.locator('input[type="radio"], input[type="checkbox"]').first().waitFor();

    // Disconnect the network and complete the entire session with nothing reachable.
    await context.setOffline(true);

    let guard = 0;
    while (guard < 60) {
      guard += 1;
      if (await page.getByRole('heading', { name: /session complete/i }).count()) break;

      await answerCurrentQuestion(page);
      await page.getByRole('button', { name: /submit answer/i }).click();

      const nextButton = page.getByRole('button', { name: /next question/i });
      if (await nextButton.count()) {
        await nextButton.click();
      }
    }

    await context.setOffline(false);
    await expect(page.getByRole('heading', { name: /session complete/i })).toBeVisible();

    expect(requests.length).toBeGreaterThan(0); // sanity: the listener actually observed traffic

    const appOrigin = new URL(page.url()).origin;
    for (const req of requests) {
      if (req.url.startsWith('ws://') || req.url.startsWith('wss://')) continue; // Next dev HMR
      let reqOrigin: string;
      try {
        reqOrigin = new URL(req.url).origin;
      } catch {
        continue; // non-http(s) scheme; not a third-party host request
      }
      expect(reqOrigin, req.url).toBe(appOrigin);
    }

    for (const req of requests) {
      expect(req.url, 'request URL must not encode answer/score/timing data').not.toMatch(
        SENSITIVE_DATA_PATTERN,
      );
      if (req.postData) {
        expect(req.postData, 'request body must not carry answer/score/timing data').not.toMatch(
          SENSITIVE_DATA_PATTERN,
        );
      }
    }
  });
});
