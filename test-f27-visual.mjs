import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';
const BASE_URL = 'http://localhost:5178';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
await sleep(2000);

// Place 3 cards on table
await page.click('[data-testid="toggle-card-drawer"]');
await sleep(500);
const drawerCards = await page.locator('[data-testid^="drawer-card-"]').all();
for (const card of drawerCards) { await card.click(); await sleep(300); }
await page.click('[data-testid="toggle-card-drawer"]');
await sleep(300);

await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f27-01-cards-on-table.png' });
console.log('Screenshot 1: Cards on table');

// Pick up all 3 to hand via right-click
for (let i = 0; i < 3; i++) {
  const card = page.locator('[data-table-card="true"]').first();
  await card.click();
  await sleep(200);
  await card.click({ button: 'right' });
  await sleep(400);
  await page.click('[data-testid="context-pick-up-to-hand"]');
  await sleep(400);
}

await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f27-02-hand-3cards.png' });
console.log('Screenshot 2: 3 cards in hand');

// Hover over middle card for preview
const handCards = await page.locator('[data-hand-card="true"]').all();
if (handCards.length >= 2) {
  await handCards[1].hover();
  await sleep(600);
}
await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f27-03-hover-preview.png' });
console.log('Screenshot 3: Hover preview');

// Play one card
await page.mouse.move(100, 100);
await sleep(300);
const firstHandCard = page.locator('[data-hand-card="true"]').first();
await firstHandCard.hover();
await sleep(500);
await page.locator('[data-testid^="hand-play-"]').first().click();
await sleep(500);
await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f27-04-after-play.png' });
console.log('Screenshot 4: After playing one card from hand');

// Play remaining to empty hand
for (let i = 0; i < 2; i++) {
  const hc = page.locator('[data-hand-card="true"]').first();
  if (await hc.isVisible().catch(() => false)) {
    await hc.hover();
    await sleep(500);
    const pb = page.locator('[data-testid^="hand-play-"]').first();
    if (await pb.isVisible().catch(() => false)) {
      await pb.click();
      await sleep(500);
    }
  }
}
await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f27-05-hand-empty.png' });
console.log('Screenshot 5: Hand empty, auto-hidden');

await browser.close();
console.log('Done - all screenshots saved');
