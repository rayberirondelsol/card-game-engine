// Quick visual verification test for Feature #31
import { chromium } from 'playwright';

const GAME_ID = '5d0d98ba-3904-49f7-aca0-37b0ee6d7678';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[ERR]', msg.text());
  });

  await page.goto(`http://localhost:5173/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
  await sleep(3000);

  // Open card drawer
  await page.click('[data-testid="toggle-card-drawer"]');
  await sleep(1000);

  // Place 12 cards
  const cards = await page.locator('[data-testid^="drawer-card-"]').all();
  for (const c of cards) { await c.click(); await sleep(150); }
  await page.click('[data-testid="toggle-card-drawer"]');
  await sleep(500);

  // Select all and stack
  const tableCards = await page.locator('[data-table-card="true"]').all();
  await tableCards[0].click();
  for (let i = 1; i < tableCards.length; i++) {
    await tableCards[i].click({ modifiers: ['Control'] });
    await sleep(50);
  }
  await page.keyboard.press('g');
  await sleep(1000);

  // Screenshot: stack of 12
  await page.screenshot({ path: 'screenshots/f31-1-stack.png' });

  // Find stack, hover it, press '3'
  const stack = page.locator('[data-table-card="true"]').first();
  await stack.click();
  await sleep(200);
  await stack.hover();
  await sleep(200);
  await page.keyboard.press('3');
  await sleep(1500);

  // Screenshot: drew 3 cards
  await page.screenshot({ path: 'screenshots/f31-2-drew3.png' });

  const handCount1 = await page.locator('[data-hand-card="true"]').count();
  console.log(`Hand after draw 3: ${handCount1}`);

  // Draw 5 more
  const stack2 = page.locator('[data-table-card="true"]').first();
  await stack2.click();
  await sleep(200);
  await stack2.hover();
  await sleep(200);
  await page.keyboard.press('5');
  await sleep(1500);

  const handCount2 = await page.locator('[data-hand-card="true"]').count();
  console.log(`Hand after draw 5: ${handCount2}`);
  await page.screenshot({ path: 'screenshots/f31-3-drew5.png' });

  // Multi-digit: press 1 then 0 for 10 (only 4 remain)
  const stack3 = page.locator('[data-table-card="true"]').first();
  if (await stack3.isVisible().catch(() => false)) {
    await stack3.click();
    await sleep(200);
    await stack3.hover();
    await sleep(200);
    await page.keyboard.press('1');
    await sleep(200);
    await page.keyboard.press('0');
    await sleep(1500);

    const handCount3 = await page.locator('[data-hand-card="true"]').count();
    console.log(`Hand after multi-digit (10): ${handCount3}`);
    await page.screenshot({ path: 'screenshots/f31-4-multi.png' });
  }

  const finalHand = await page.locator('[data-hand-card="true"]').count();
  const finalTable = await page.locator('[data-table-card="true"]').count();
  console.log(`Final: hand=${finalHand}, table=${finalTable}`);
  console.log(`TEST ${finalHand === 12 ? 'PASSED' : 'FAILED'}`);

  await browser.close();
}

test().catch(console.error);
