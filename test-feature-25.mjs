// Feature #25: Rotate card with Q and E keys
// Tests: E rotates 90 clockwise, E again to 180, Q back to 90, Q back to 0

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
  console.log('Step 1: Navigate to game table and place a card');
  await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
  await sleep(2000);

  // Place a card from drawer
  await page.click('[data-testid="toggle-card-drawer"]');
  await sleep(500);
  await page.locator('[data-testid^="drawer-card-"]').first().click();
  await sleep(500);
  await page.click('[data-testid="toggle-card-drawer"]');
  await sleep(300);

  const tableCard = page.locator('[data-table-card="true"]').first();
  console.log(`  Card placed: ${await tableCard.isVisible()}`);

  // Check initial rotation (should be 0)
  const initialRotation = await tableCard.getAttribute('data-rotation');
  console.log(`  Initial rotation: ${initialRotation} (should be 0)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f25-01-initial-0deg.png' });

  console.log('Step 2: Select the card');
  await tableCard.click();
  await sleep(300);

  console.log('Step 3: Press E key -> verify 90 degrees clockwise');
  await page.keyboard.press('e');
  await sleep(500);

  const rotation1 = await tableCard.getAttribute('data-rotation');
  console.log(`  Rotation after E: ${rotation1} (should be 90)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f25-02-90deg.png' });

  console.log('Step 4: Press E key again -> verify 180 degrees');
  await page.keyboard.press('e');
  await sleep(500);

  const rotation2 = await tableCard.getAttribute('data-rotation');
  console.log(`  Rotation after E+E: ${rotation2} (should be 180)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f25-03-180deg.png' });

  console.log('Step 5: Press Q key -> verify back to 90 degrees');
  await page.keyboard.press('q');
  await sleep(500);

  const rotation3 = await tableCard.getAttribute('data-rotation');
  console.log(`  Rotation after Q: ${rotation3} (should be 90)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f25-04-back-to-90deg.png' });

  console.log('Step 6: Press Q key -> verify back to 0 degrees');
  await page.keyboard.press('q');
  await sleep(500);

  const rotation4 = await tableCard.getAttribute('data-rotation');
  console.log(`  Rotation after Q+Q: ${rotation4} (should be 0)`);

  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f25-05-back-to-0deg.png' });

  // Verify CSS transition for smooth rotation
  const hasTransition = await page.evaluate(() => {
    const card = document.querySelector('[data-table-card="true"]');
    if (!card) return false;
    const style = window.getComputedStyle(card);
    return style.transition.includes('transform');
  });
  console.log(`  Has CSS rotation transition: ${hasTransition}`);

  console.log('\n=== FEATURE #25 TEST RESULTS ===');
  console.log(`  Initial 0 degrees: ${initialRotation === '0' ? 'PASS' : 'FAIL'}`);
  console.log(`  E -> 90 clockwise: ${rotation1 === '90' ? 'PASS' : 'FAIL'}`);
  console.log(`  E -> 180 clockwise: ${rotation2 === '180' ? 'PASS' : 'FAIL'}`);
  console.log(`  Q -> back to 90: ${rotation3 === '90' ? 'PASS' : 'FAIL'}`);
  console.log(`  Q -> back to 0: ${rotation4 === '0' ? 'PASS' : 'FAIL'}`);
  console.log(`  Smooth CSS transition: ${hasTransition ? 'PASS' : 'FAIL'}`);
  console.log(`  Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(err => console.log(`    ERROR: ${err}`));
  }

} catch (err) {
  console.error('Test failed:', err.message);
  await page.screenshot({ path: 'C:/workspace/card-game-engine/screenshots/f25-error.png' });
} finally {
  await browser.close();
}
