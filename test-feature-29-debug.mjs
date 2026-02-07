import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';
const BASE_URL = 'http://localhost:5173';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));

  await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('[data-testid="game-table-container"]', { timeout: 10000 });

  // Place 6 cards
  await page.click('[data-testid="toggle-card-drawer"]');
  await page.waitForSelector('[data-testid="card-drawer"]');
  const drawerCards = await page.$$('[data-testid^="drawer-card-"]');
  for (let i = 0; i < Math.min(drawerCards.length, 6); i++) {
    await drawerCards[i].click();
    await page.waitForTimeout(200);
  }
  await page.click('[data-testid="toggle-card-drawer"]');
  await page.waitForTimeout(500);

  const tableCards = await page.$$('[data-table-card="true"]');
  console.log(`Cards on table: ${tableCards.length}`);

  // Click first card to select it
  const firstBox = await tableCards[0].boundingBox();
  await page.mouse.click(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.waitForTimeout(300);

  // Check selection state - evaluate in browser
  let selectedCount = await page.evaluate(() => {
    // Access React internals to check selection
    const container = document.querySelector('[data-testid="game-table-container"]');
    const selectedCards = document.querySelectorAll('.ring-2');
    return selectedCards.length;
  });
  console.log(`After clicking first card, selected visual indicators: ${selectedCount}`);

  // Now Ctrl+click each remaining card
  for (let i = 1; i < tableCards.length; i++) {
    const box = await tableCards[i].boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { modifiers: ['Control'] });
      await page.waitForTimeout(300);
    }
  }

  selectedCount = await page.evaluate(() => {
    const selectedCards = document.querySelectorAll('.ring-2');
    return selectedCards.length;
  });
  console.log(`After Ctrl+clicking all cards, selected visual indicators: ${selectedCount}`);

  await page.screenshot({ path: 'screenshots/f29-debug-selected.png' });

  // Now press G
  console.log('Pressing G...');
  await page.keyboard.press('g');
  await page.waitForTimeout(500);

  // Check for stacks
  const allElements = await page.$$('[data-table-card="true"]');
  for (const el of allElements) {
    const size = await el.getAttribute('data-stack-size');
    const stackId = await el.getAttribute('data-stack-id');
    const name = await el.getAttribute('data-card-name');
    console.log(`  Card: ${name}, stack-size=${size}, stack-id=${stackId ? stackId.substring(0, 8) : 'none'}`);
  }

  await page.screenshot({ path: 'screenshots/f29-debug-after-g.png' });

  await browser.close();
}

debug().catch(console.error);
