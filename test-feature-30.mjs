import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';
const BASE_URL = 'http://localhost:5173';

async function testFeature30() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

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
    console.log('  Game table loaded');

    // Step 2: Place 5 cards on table
    console.log('Step 2: Place 5 cards on table...');
    await page.click('[data-testid="toggle-card-drawer"]');
    await page.waitForSelector('[data-testid="card-drawer"]');
    const drawerCards = await page.$$('[data-testid^="drawer-card-"]');
    console.log(`  Found ${drawerCards.length} cards in drawer`);
    for (let i = 0; i < Math.min(drawerCards.length, 5); i++) {
      await drawerCards[i].click();
      await page.waitForTimeout(200);
    }
    await page.click('[data-testid="toggle-card-drawer"]');
    await page.waitForTimeout(500);

    let tableCards = await page.$$('[data-table-card="true"]');
    console.log(`  ${tableCards.length} cards on table`);

    // Step 3: Select all cards and create a stack
    console.log('Step 3: Create a stack...');
    let box = await tableCards[0].boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    for (let i = 1; i < tableCards.length; i++) {
      box = await tableCards[i].boundingBox();
      if (!box) continue;
      await page.keyboard.down('Control');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.up('Control');
      await page.waitForTimeout(500);
    }

    await page.keyboard.press('g');
    await page.waitForTimeout(500);

    // Find the stack
    let stackElement = null;
    let stackSize = 0;
    for (const el of await page.$$('[data-table-card="true"]')) {
      const size = parseInt(await el.getAttribute('data-stack-size'));
      if (size > 1) {
        stackElement = el;
        stackSize = size;
        break;
      }
    }
    console.log(`  Stack created with ${stackSize} cards`);

    if (!stackElement) {
      console.log('ERROR: No stack created');
      return;
    }

    // Step 4: Right-click stack -> Browse
    console.log('Step 4: Right-click -> Browse...');
    let stackBox = await stackElement.boundingBox();
    await page.mouse.click(stackBox.x + stackBox.width / 2, stackBox.y + stackBox.height / 2, { button: 'right' });
    await page.waitForTimeout(500);

    const browseBtn = await page.$('[data-testid="context-browse"]');
    console.log(`  Browse button found: ${!!browseBtn}`);

    if (browseBtn) {
      await browseBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 5: Verify browse overlay appeared with thumbnails
    console.log('Step 5: Verify browse overlay...');
    const browseOverlay = await page.$('[data-testid="browse-stack-overlay"]');
    console.log(`  Browse overlay visible: ${!!browseOverlay}`);

    const browsePanel = await page.$('[data-testid="browse-stack-panel"]');
    console.log(`  Browse panel visible: ${!!browsePanel}`);

    await page.screenshot({ path: 'screenshots/f30-step5-browse-overlay.png' });

    // Step 6: Verify card thumbnails are visible
    console.log('Step 6: Verify card thumbnails...');
    const browseCards = await page.$$('[data-testid^="browse-card-"]');
    console.log(`  Browse cards found: ${browseCards.length} (expected: ${stackSize})`);

    // Verify card names are visible
    if (browsePanel) {
      const panelText = await browsePanel.textContent();
      console.log(`  Panel contains text: ${panelText.substring(0, 200)}`);

      // Check for card count in header
      const headerText = await browsePanel.$eval('h3', el => el.textContent);
      console.log(`  Header: ${headerText}`);
      const hasCorrectCount = headerText.includes(stackSize.toString());
      console.log(`  Header shows correct count: ${hasCorrectCount}`);
    }

    // Check that card images/placeholders are visible
    const cardImages = await browsePanel.$$('img');
    const cardPlaceholders = await browsePanel.$$('svg');
    console.log(`  Card images: ${cardImages.length}, placeholders: ${cardPlaceholders.length}`);

    // Step 7: Close the browse view
    console.log('Step 7: Close browse view...');
    const closeBtn = await page.$('[data-testid="browse-close-btn"]');
    console.log(`  Close button found: ${!!closeBtn}`);

    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify overlay is gone
    const overlayAfterClose = await page.$('[data-testid="browse-stack-overlay"]');
    console.log(`  Overlay after close: ${overlayAfterClose ? 'STILL VISIBLE (WRONG!)' : 'Gone (correct)'}`);

    await page.screenshot({ path: 'screenshots/f30-step7-closed.png' });

    // Step 8: Verify stack is intact
    console.log('Step 8: Verify stack is intact...');
    let stackAfterBrowse = null;
    let sizeAfterBrowse = 0;
    for (const el of await page.$$('[data-table-card="true"]')) {
      const size = parseInt(await el.getAttribute('data-stack-size'));
      if (size > 1) {
        stackAfterBrowse = el;
        sizeAfterBrowse = size;
        break;
      }
    }
    console.log(`  Stack after browse: ${sizeAfterBrowse} cards (expected: ${stackSize})`);
    const stackIntact = sizeAfterBrowse === stackSize;
    console.log(`  Stack intact: ${stackIntact ? 'YES' : 'NO'}`);

    // Step 9: Test closing via Done button
    console.log('Step 9: Test Done button...');
    stackBox = await stackAfterBrowse.boundingBox();
    await page.mouse.click(stackBox.x + stackBox.width / 2, stackBox.y + stackBox.height / 2, { button: 'right' });
    await page.waitForTimeout(500);
    const browseBtn2 = await page.$('[data-testid="context-browse"]');
    if (browseBtn2) {
      await browseBtn2.click();
      await page.waitForTimeout(500);
    }

    const doneBtn = await page.$('[data-testid="browse-done-btn"]');
    console.log(`  Done button found: ${!!doneBtn}`);
    if (doneBtn) {
      await doneBtn.click();
      await page.waitForTimeout(300);
    }

    const overlayAfterDone = await page.$('[data-testid="browse-stack-overlay"]');
    console.log(`  Overlay after Done: ${overlayAfterDone ? 'STILL VISIBLE (WRONG!)' : 'Gone (correct)'}`);

    // Step 10: Test closing via backdrop click
    console.log('Step 10: Test backdrop click close...');
    stackBox = await stackAfterBrowse.boundingBox();
    await page.mouse.click(stackBox.x + stackBox.width / 2, stackBox.y + stackBox.height / 2, { button: 'right' });
    await page.waitForTimeout(500);
    const browseBtn3 = await page.$('[data-testid="context-browse"]');
    if (browseBtn3) {
      await browseBtn3.click();
      await page.waitForTimeout(500);
    }

    // Click on backdrop (outside the panel)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    const overlayAfterBackdrop = await page.$('[data-testid="browse-stack-overlay"]');
    console.log(`  Overlay after backdrop click: ${overlayAfterBackdrop ? 'STILL VISIBLE (WRONG!)' : 'Gone (correct)'}`);

    await page.screenshot({ path: 'screenshots/f30-step10-final.png' });

    // Summary
    console.log('\n=== RESULTS ===');
    console.log(`Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach(e => console.log(`  ${e}`));
    console.log(`Browse overlay appears: ${browseOverlay ? 'PASS' : 'FAIL'}`);
    console.log(`Card thumbnails shown: ${browseCards.length === stackSize ? 'PASS' : 'FAIL'}`);
    console.log(`Close button works: ${!overlayAfterClose ? 'PASS' : 'FAIL'}`);
    console.log(`Done button works: ${!overlayAfterDone ? 'PASS' : 'FAIL'}`);
    console.log(`Backdrop click works: ${!overlayAfterBackdrop ? 'PASS' : 'FAIL'}`);
    console.log(`Stack intact: ${stackIntact ? 'PASS' : 'FAIL'}`);

    const allPassed = browseOverlay && browseCards.length === stackSize && !overlayAfterClose && !overlayAfterDone && stackIntact;
    if (allPassed) {
      console.log('\nFEATURE #30 PASSED!');
    } else {
      console.log('\nFEATURE #30 NEEDS ATTENTION');
    }

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: 'screenshots/f30-error.png' });
  } finally {
    await browser.close();
  }
}

testFeature30().catch(console.error);
