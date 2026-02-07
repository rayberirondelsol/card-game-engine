import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto('http://localhost:5173/games/438a26be-ab99-4ca5-bb63-a81b06dc6e9b/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Try clicking on canvas first
  await page.click('canvas');
  await page.waitForTimeout(200);

  // Try multiple approaches to type ?
  console.log('Trying keyboard.type("?")...');
  await page.keyboard.type('?');
  await page.waitForTimeout(500);

  let visible = await page.locator('[data-testid="shortcuts-overlay"]').isVisible().catch(() => false);
  console.log('After type("?"): overlay visible =', visible);

  if (!visible) {
    console.log('Trying keyboard.press("Shift+Slash")...');
    await page.keyboard.press('Shift+Slash');
    await page.waitForTimeout(500);
    visible = await page.locator('[data-testid="shortcuts-overlay"]').isVisible().catch(() => false);
    console.log('After Shift+Slash: overlay visible =', visible);
  }

  if (!visible) {
    console.log('Trying toolbar button instead...');
    await page.locator('[data-testid="toolbar-shortcuts-btn"]').click();
    await page.waitForTimeout(500);
    visible = await page.locator('[data-testid="shortcuts-overlay"]').isVisible().catch(() => false);
    console.log('After toolbar button: overlay visible =', visible);
  }

  if (visible) {
    await page.screenshot({ path: 'screenshots/f40-debug-overlay.png' });
    console.log('Screenshot saved');
  }

  await browser.close();
}

test();
