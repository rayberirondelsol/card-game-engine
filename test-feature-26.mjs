import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';
const BASE_URL = 'http://localhost:5173';

async function testFeature26() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push('PAGE_ERROR: ' + err.message);
  });

  try {
    // Step 1: Navigate to game table
    console.log('Step 1: Navigate to game table...');
    await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('[data-testid="game-table-container"]', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/f26-step1-table.png' });
    console.log('  Game table loaded');

    // Step 2: Open card drawer
    console.log('Step 2: Open card drawer...');
    await page.click('[data-testid="toggle-card-drawer"]');
    await page.waitForSelector('[data-testid="card-drawer"]', { timeout: 5000 });
    await page.screenshot({ path: 'screenshots/f26-step2-drawer.png' });
    console.log('  Card drawer opened');

    // Step 3: Place cards on table
    console.log('Step 3: Place cards on table...');
    const drawerCards = await page.$$('[data-testid^="drawer-card-"]');
    console.log(`  Found ${drawerCards.length} cards in drawer`);

    for (let i = 0; i < Math.min(drawerCards.length, 3); i++) {
      await drawerCards[i].click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: 'screenshots/f26-step3-cards-placed.png' });

    // Check cards on table
    const tableCardElements = await page.$$('[data-table-card="true"]');
    console.log(`  ${tableCardElements.length} cards placed on table`);

    if (tableCardElements.length === 0) {
      console.log('ERROR: No cards placed on table!');
      return;
    }

    // Step 4: Hover over a card WITHOUT ALT - preview should NOT appear
    console.log('Step 4: Hover over card without ALT...');
    const firstCard = tableCardElements[0];
    const cardBox = await firstCard.boundingBox();
    console.log(`  Card at: x=${cardBox.x}, y=${cardBox.y}, w=${cardBox.width}, h=${cardBox.height}`);

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.waitForTimeout(300);

    const previewWithoutAlt = await page.$('[data-testid="alt-card-preview"]');
    console.log(`  Preview without ALT: ${previewWithoutAlt ? 'VISIBLE (WRONG!)' : 'Not visible (correct)'}`);
    await page.screenshot({ path: 'screenshots/f26-step4-hover-no-alt.png' });

    // Step 5: Hold ALT and hover over card - preview SHOULD appear
    console.log('Step 5: Hold ALT and hover over card...');
    await page.keyboard.down('Alt');
    await page.waitForTimeout(500);

    // Move mouse slightly to ensure hover is still active
    await page.mouse.move(cardBox.x + cardBox.width / 2 + 1, cardBox.y + cardBox.height / 2 + 1);
    await page.waitForTimeout(500);

    let previewWithAlt = await page.$('[data-testid="alt-card-preview"]');
    console.log(`  Preview with ALT: ${previewWithAlt ? 'VISIBLE (correct!)' : 'Not visible (WRONG!)'}`);
    await page.screenshot({ path: 'screenshots/f26-step5-hover-with-alt.png' });

    // If not visible, try another approach - hover first then press alt
    if (!previewWithAlt) {
      console.log('  Retrying: move to card center first, then press ALT...');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(200);

      // Move directly to card center
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.waitForTimeout(300);

      // Now press ALT
      await page.keyboard.down('Alt');
      await page.waitForTimeout(500);

      previewWithAlt = await page.$('[data-testid="alt-card-preview"]');
      console.log(`  Preview with ALT (retry): ${previewWithAlt ? 'VISIBLE (correct!)' : 'Not visible (WRONG!)'}`);
      await page.screenshot({ path: 'screenshots/f26-step5-retry.png' });
    }

    // Step 6: Release ALT - preview should disappear
    console.log('Step 6: Release ALT...');
    await page.keyboard.up('Alt');
    await page.waitForTimeout(300);

    const previewAfterRelease = await page.$('[data-testid="alt-card-preview"]');
    console.log(`  Preview after ALT release: ${previewAfterRelease ? 'VISIBLE (WRONG!)' : 'Not visible (correct)'}`);
    await page.screenshot({ path: 'screenshots/f26-step6-alt-released.png' });

    // Step 7: Verify preview doesn't interfere - check pointer-events
    console.log('Step 7: Check preview doesnt interfere...');
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.waitForTimeout(200);
    await page.keyboard.down('Alt');
    await page.waitForTimeout(300);

    const previewEl = await page.$('[data-testid="alt-card-preview"]');
    if (previewEl) {
      const pointerEvents = await previewEl.evaluate(el => getComputedStyle(el).pointerEvents);
      console.log(`  Preview pointer-events: ${pointerEvents} (should be 'none')`);
    }

    await page.keyboard.up('Alt');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'screenshots/f26-step7-no-interfere.png' });

    // Summary
    console.log('\n=== Test Results ===');
    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(e => console.log(`  ERROR: ${e}`));
    }

    const allPassed = !previewWithoutAlt && previewWithAlt && !previewAfterRelease;
    console.log(`All core checks passed: ${allPassed}`);

    if (allPassed) {
      console.log('FEATURE #26 PASSED!');
    } else {
      console.log('FEATURE #26 FAILED - see details above');
    }

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: 'screenshots/f26-error.png' });
  } finally {
    await browser.close();
  }
}

testFeature26().catch(console.error);
