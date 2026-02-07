// Feature #24: Flip card with F key
// Tests: place card, select it, press F to flip to back, press F again to flip to front, smooth animation

import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';
const BASE_URL = 'http://localhost:5178';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

try {
  console.log('Step 1: Navigate to game table');
  await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
  await sleep(2000);
  console.log('  Game table loaded');

  console.log('Step 2: Open card drawer and place a card face-up');
  await page.click('[data-testid="toggle-card-drawer"]');
  await sleep(500);
  const drawerCards = await page.locator('[data-testid^="drawer-card-"]').all();
  console.log(`  Found ${drawerCards.length} cards in drawer`);
  await drawerCards[0].click();
  await sleep(500);
  await page.click('[data-testid="toggle-card-drawer"]');
  await sleep(300);

  // Verify card is on table face-up
  const tableCard = page.locator('[data-table-card="true"]').first();
  const cardVisible = await tableCard.isVisible();
  console.log(`  Card placed on table: ${cardVisible}`);

  // Check initial face state (should be face-up, faceDown=false)
  const faceContainer = page.locator('[data-testid^="card-face-container-"]').first();
  const initialFaceDown = await faceContainer.getAttribute('data-face-down');
  console.log(`  Initial face-down state: ${initialFaceDown} (should be false)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f24-01-face-up.png' });

  console.log('Step 3: Select the card by clicking on it');
  await tableCard.click();
  await sleep(300);
  console.log('  Card selected');

  console.log('Step 4: Press F key to flip');
  await page.keyboard.press('f');
  await sleep(600); // Wait for animation

  // Check face state changed to face-down
  const afterFlip1 = await faceContainer.getAttribute('data-face-down');
  console.log(`  Face-down after first F press: ${afterFlip1} (should be true)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f24-02-face-down.png' });

  console.log('Step 5: Press F key again to flip back');
  await page.keyboard.press('f');
  await sleep(600); // Wait for animation

  // Check face state changed back to face-up
  const afterFlip2 = await faceContainer.getAttribute('data-face-down');
  console.log(`  Face-down after second F press: ${afterFlip2} (should be false)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f24-03-face-up-again.png' });

  console.log('Step 6: Verify flip animation has CSS transition');
  // Check that the flip container has transition style
  const hasTransition = await page.evaluate(() => {
    const container = document.querySelector('[data-testid^="card-face-container-"]');
    if (!container) return false;
    const inner = container.firstElementChild;
    if (!inner) return false;
    const style = inner.style;
    return style.transition.includes('transform') || style.transition.includes('0.4s');
  });
  console.log(`  Has CSS flip transition: ${hasTransition}`);

  // Also check that transformStyle is preserve-3d
  const hasPreserve3d = await page.evaluate(() => {
    const container = document.querySelector('[data-testid^="card-face-container-"]');
    if (!container) return false;
    const inner = container.firstElementChild;
    if (!inner) return false;
    return inner.style.transformStyle === 'preserve-3d';
  });
  console.log(`  Has preserve-3d transform style: ${hasPreserve3d}`);

  // Check mid-flip screenshot by pressing F and taking a quick screenshot
  console.log('Step 7: Capture mid-flip animation');
  await page.keyboard.press('f');
  await sleep(150); // Capture mid-animation
  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f24-04-mid-flip.png' });
  await sleep(500); // Let animation complete

  console.log('\n=== FEATURE #24 TEST RESULTS ===');
  console.log(`  Card starts face-up: ${initialFaceDown === 'false' ? 'PASS' : 'FAIL'}`);
  console.log(`  F key flips to face-down: ${afterFlip1 === 'true' ? 'PASS' : 'FAIL'}`);
  console.log(`  F key flips back to face-up: ${afterFlip2 === 'false' ? 'PASS' : 'FAIL'}`);
  console.log(`  CSS transition animation: ${hasTransition ? 'PASS' : 'FAIL'}`);
  console.log(`  3D transform style: ${hasPreserve3d ? 'PASS' : 'FAIL'}`);
  console.log(`  Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(err => console.log(`    ERROR: ${err}`));
  }

} catch (err) {
  console.error('Test failed:', err.message);
  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f24-error.png' });
} finally {
  await browser.close();
}
