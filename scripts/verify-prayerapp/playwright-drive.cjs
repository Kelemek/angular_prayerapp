#!/usr/bin/env node
/**
 * Minimal Playwright driver for verify-prayerapp recipes.
 * Requires ensure_playwright_module() (PW_MODULE_ROOT with playwright npm install).
 */
const path = require('node:path');
const pwRoot =
  process.env.PW_MODULE_ROOT || '/tmp/prayerapp-verify-playwright';
const { chromium } = require(path.join(pwRoot, 'node_modules/playwright'));

const url = process.env.PW_URL;
const screenshot = process.env.PW_SCREENSHOT;
const waitSelector = process.env.PW_WAIT_SELECTOR || '';
const viewportW = Number(process.env.PW_VIEWPORT_W || 1280);
const viewportH = Number(process.env.PW_VIEWPORT_H || 720);
const fullPage = process.env.PW_FULL_PAGE === '1';

let steps = [];
if (process.env.PW_STEPS) {
  steps = JSON.parse(process.env.PW_STEPS);
}

if (!url || !screenshot) {
  console.error('[playwright-drive] PW_URL and PW_SCREENSHOT are required');
  process.exit(2);
}

(async () => {
  const browser = await chromium.launch();
  const contextOptions = {
    viewport: { width: viewportW, height: viewportH },
  };
  if (process.env.PW_STORAGE_STATE) {
    contextOptions.storageState = process.env.PW_STORAGE_STATE;
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});

    if (waitSelector) {
      await page.locator(waitSelector).first().waitFor({
        state: 'visible',
        timeout: 60_000,
      });
    }

    for (const step of steps) {
      if (step.scrollIntoView) {
        await page.locator(step.scrollIntoView).first().scrollIntoViewIfNeeded();
      }
      if (step.click) {
        const loc = page.locator(step.click).first();
        await loc.waitFor({ state: 'visible', timeout: step.timeoutMs ?? 30_000 });
        await loc.click({ timeout: step.timeoutMs ?? 30_000 });
      }
      if (step.fill) {
        await page.locator(step.fill.selector).first().fill(step.fill.value);
      }
      if (step.press) {
        await page.keyboard.press(step.press);
      }
      if (step.waitMs) {
        await page.waitForTimeout(step.waitMs);
      }
      if (step.waitSelector) {
        await page.locator(step.waitSelector).first().waitFor({
          state: 'visible',
          timeout: step.timeoutMs ?? 30_000,
        });
      }
    }

    await page.screenshot({ path: screenshot, fullPage });
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error('[playwright-drive]', err);
  process.exit(1);
});
