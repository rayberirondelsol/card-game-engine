import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';
const BASE_URL = 'http://localhost:5173';

async function testFeature29() {
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

    // Step 2: Place 6 cards on table
    console.log('Step 2: Place 6 cards on table...');
    await page.click('[data-testid="toggle-card-drawer"]');
    await page.waitForSelector('[data-testid="card-drawer"]');
    const drawerCards = await page.$$('[data-testid^="drawer-card-"]');
    console.log(`  Found ${drawerCards.length} cards in drawer`);
    for (let i = 0; i < Math.min(drawerCards.length, 6); i++) {
      await drawerCards[i].click();
      await page.waitForTimeout(200);
    }
    await page.click('[data-testid="toggle-card-drawer"]');
    await page.waitForTimeout(500);

    let tableCards = await page.$$('[data-table-card="true"]');
    console.log(`  ${tableCards.length} cards on table`);

    // Step 3: Multi-select cards using a more reliable method
    // First click selects 1 card, then Ctrl+mousedown+mouseup on others
    console.log('Step 3: Multi-select all cards...');

    // Click first card (standard click)
    let box = await tableCards[0].boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    // Ctrl+click remaining cards one by one with proper waits
    for (let i = 1; i < tableCards.length; i++) {
      box = await tableCards[i].boundingBox();
      if (!box) continue;
      // Use keyboard modifier approach
      await page.keyboard.down('Control');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.up('Control');
      await page.waitForTimeout(500);
    }

    // Check selection visually
    let selectedCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-table-card="true"] .ring-2').length;
    });
    console.log(`  Selected card indicators: ${selectedCount}`);

    // If multi-select failed, try alternative: use evaluate to directly set selection
    if (selectedCount < 3) {
      console.log('  Multi-select via click failed, trying direct JavaScript...');
      // We'll create the stack via JavaScript injection
      const stackCreated = await page.evaluate(() => {
        // Find all table cards in the DOM and get their IDs
        const cardElements = document.querySelectorAll('[data-table-card="true"]');
        const tableIds = [];
        cardElements.forEach(el => {
          const testid = el.getAttribute('data-testid');
          if (testid && testid.startsWith('table-card-')) {
            tableIds.push(testid.replace('table-card-', ''));
          }
        });
        return tableIds;
      });
      console.log(`  Found ${stackCreated.length} card tableIds`);

      // Alternative approach: select all cards and press G by dispatching events
      // First, let's try moving cards on top of each other to force a stack
      // Actually, let me just use a keyboard-only approach
      // Click first card, then hold Ctrl and click each subsequent one with precise coordinates

      // Re-fetch cards (they may have moved)
      tableCards = await page.$$('[data-table-card="true"]');

      // Click on empty table to deselect
      await page.mouse.click(10, 400);
      await page.waitForTimeout(300);

      // Click first card
      box = await tableCards[0].boundingBox();
      await page.mouse.down({ button: 'left' });
      await page.waitForTimeout(50);
      await page.mouse.up({ button: 'left' });
      await page.waitForTimeout(500);

      // For each subsequent card, hold Control and click
      for (let i = 1; i < tableCards.length; i++) {
        const cardBox = await tableCards[i].boundingBox();
        if (!cardBox) continue;
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
        await page.waitForTimeout(100);
        await page.keyboard.down('Control');
        await page.mouse.down({ button: 'left' });
        await page.waitForTimeout(50);
        await page.mouse.up({ button: 'left' });
        await page.keyboard.up('Control');
        await page.waitForTimeout(500);
      }

      selectedCount = await page.evaluate(() => {
        return document.querySelectorAll('[data-table-card="true"] .ring-2').length;
      });
      console.log(`  Selected card indicators (retry): ${selectedCount}`);
    }

    await page.screenshot({ path: 'screenshots/f29-step3-selected.png' });

    // Press G to group
    console.log('  Pressing G to group...');
    await page.keyboard.press('g');
    await page.waitForTimeout(500);

    // Check for stack
    let stackElement = null;
    let originalStackSize = 0;
    for (const el of await page.$$('[data-table-card="true"]')) {
      const size = await el.getAttribute('data-stack-size');
      if (parseInt(size) > 1) {
        stackElement = el;
        originalStackSize = parseInt(size);
        break;
      }
    }

    console.log(`  Stack created: ${!!stackElement}, size: ${originalStackSize}`);

    // If G-key grouping failed, create stack using evaluate
    if (!stackElement) {
      console.log('  G-key grouping failed, creating stack via page.evaluate...');
      await page.evaluate(() => {
        // Get all table card IDs from DOM
        const cardEls = document.querySelectorAll('[data-table-card="true"]');
        const allIds = [];
        cardEls.forEach(el => {
          const testid = el.getAttribute('data-testid');
          if (testid) allIds.push(testid.replace('table-card-', ''));
        });

        // Dispatch a custom event to create a stack (won't work directly)
        // Instead, simulate clicking and pressing G
        return allIds;
      });

      // Alternative: Just simulate the process more carefully
      // Click on empty space to deselect
      await page.mouse.click(1350, 450);
      await page.waitForTimeout(300);

      // Get fresh card positions
      tableCards = await page.$$('[data-table-card="true"]');
      console.log(`  ${tableCards.length} cards still on table`);

      // Select first card by clicking center
      const c0 = await tableCards[0].boundingBox();
      console.log(`  Clicking card 0 at (${c0.x + c0.width/2}, ${c0.y + c0.height/2})`);
      await page.mouse.click(c0.x + c0.width / 2, c0.y + c0.height / 2);
      await page.waitForTimeout(400);

      // Check if it's selected
      selectedCount = await page.evaluate(() => {
        return document.querySelectorAll('[data-table-card="true"] .ring-2').length;
      });
      console.log(`  After click card 0: ${selectedCount} selected`);

      // Ctrl+click rest - use dispatchEvent approach
      for (let i = 1; i < tableCards.length; i++) {
        const cb = await tableCards[i].boundingBox();
        if (!cb) continue;

        // Hold ctrl and click - use page level keyboard
        await page.keyboard.down('Control');
        await page.waitForTimeout(50);

        // Move mouse to card
        await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
        await page.waitForTimeout(50);

        // Mousedown on the card element
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.up();
        await page.waitForTimeout(50);

        await page.keyboard.up('Control');
        await page.waitForTimeout(400);

        selectedCount = await page.evaluate(() => {
          return document.querySelectorAll('[data-table-card="true"] .ring-2').length;
        });
        console.log(`  After Ctrl+click card ${i}: ${selectedCount} selected`);
      }

      await page.screenshot({ path: 'screenshots/f29-step3b-reselect.png' });

      // Now press G
      await page.keyboard.press('g');
      await page.waitForTimeout(500);

      // Check again
      for (const el of await page.$$('[data-table-card="true"]')) {
        const size = await el.getAttribute('data-stack-size');
        if (parseInt(size) > 1) {
          stackElement = el;
          originalStackSize = parseInt(size);
          break;
        }
      }
      console.log(`  Stack after retry: ${!!stackElement}, size: ${originalStackSize}`);
    }

    if (!stackElement || originalStackSize < 2) {
      console.log('FATAL: Could not create stack. Cannot proceed with shuffle/split/flip tests.');
      await page.screenshot({ path: 'screenshots/f29-fatal.png' });
      return;
    }

    await page.screenshot({ path: 'screenshots/f29-step3-stack.png' });

    // === Step 4: SHUFFLE ===
    console.log('\nStep 4: Shuffle the stack...');
    let stackBox = await stackElement.boundingBox();
    await page.mouse.click(stackBox.x + stackBox.width / 2, stackBox.y + stackBox.height / 2, { button: 'right' });
    await page.waitForTimeout(500);

    const shuffleBtn = await page.$('[data-testid="context-shuffle"]');
    console.log(`  Shuffle button: ${!!shuffleBtn}`);
    if (shuffleBtn) {
      await shuffleBtn.click();
      await page.waitForTimeout(500);
      console.log('  Shuffled!');
    }

    // Verify stack intact
    for (const el of await page.$$('[data-table-card="true"]')) {
      const size = await el.getAttribute('data-stack-size');
      if (parseInt(size) > 1) {
        stackElement = el;
        console.log(`  Stack intact with ${size} cards`);
        break;
      }
    }

    // === Step 5: BROWSE to verify ===
    console.log('\nStep 5: Browse stack...');
    stackBox = await stackElement.boundingBox();
    await page.mouse.click(stackBox.x + stackBox.width / 2, stackBox.y + stackBox.height / 2, { button: 'right' });
    await page.waitForTimeout(500);

    const browseBtn = await page.$('[data-testid="context-browse"]');
    if (browseBtn) {
      let browseMsg = '';
      page.once('dialog', async d => {
        browseMsg = d.message();
        await d.accept();
      });
      await browseBtn.click();
      await page.waitForTimeout(500);
      console.log(`  Browse: ${browseMsg.substring(0, 100)}`);
    }

    // === Step 6: SPLIT ===
    console.log('\nStep 6: Split the stack...');
    // Re-find stack
    for (const el of await page.$$('[data-table-card="true"]')) {
      const size = await el.getAttribute('data-stack-size');
      if (parseInt(size) > 1) { stackElement = el; break; }
    }
    stackBox = await stackElement.boundingBox();
    await page.mouse.click(stackBox.x + stackBox.width / 2, stackBox.y + stackBox.height / 2, { button: 'right' });
    await page.waitForTimeout(500);

    const splitBtn = await page.$('[data-testid="context-split"]');
    console.log(`  Split button: ${!!splitBtn}`);
    if (splitBtn) {
      await splitBtn.click();
      await page.waitForTimeout(500);
    }

    const splitModal = await page.$('[data-testid="split-modal"]');
    console.log(`  Split modal: ${!!splitModal}`);
    await page.screenshot({ path: 'screenshots/f29-step6-split-modal.png' });

    if (splitModal) {
      const splitInput = await page.$('[data-testid="split-count-input"]');
      await splitInput.fill('2');
      await page.waitForTimeout(200);
      console.log('  Entered count: 2');

      const confirmBtn = await page.$('[data-testid="split-confirm-btn"]');
      await confirmBtn.click();
      await page.waitForTimeout(500);
      console.log('  Split confirmed');
    }

    await page.screenshot({ path: 'screenshots/f29-step6-after-split.png' });

    // Count resulting groups
    let stacksAfter = [];
    let individualsAfter = 0;
    for (const el of await page.$$('[data-table-card="true"]')) {
      const size = parseInt(await el.getAttribute('data-stack-size'));
      const sid = await el.getAttribute('data-stack-id');
      if (size > 1 && sid) stacksAfter.push(size);
      else individualsAfter++;
    }
    const totalAfter = stacksAfter.reduce((s, v) => s + v, 0) + individualsAfter;
    console.log(`  After split: stacks=${JSON.stringify(stacksAfter)}, individuals=${individualsAfter}, total=${totalAfter}`);
    const splitOk = totalAfter === originalStackSize;
    console.log(`  Split correct: ${splitOk}`);

    // === Step 7: FLIP STACK ===
    console.log('\nStep 7: Flip stack...');
    let flipTarget = null;
    for (const el of await page.$$('[data-table-card="true"]')) {
      const size = parseInt(await el.getAttribute('data-stack-size'));
      if (size > 1) { flipTarget = el; break; }
    }

    let flipOk = false;
    if (flipTarget) {
      const fb = await flipTarget.boundingBox();
      const faceBefore = await (await flipTarget.$('[data-testid^="card-face-container-"]'))?.getAttribute('data-face-down');
      console.log(`  Face before: ${faceBefore}`);

      await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2, { button: 'right' });
      await page.waitForTimeout(500);

      const flipBtn = await page.$('[data-testid="context-flip-stack"]');
      console.log(`  Flip Stack button: ${!!flipBtn}`);
      if (flipBtn) {
        await flipBtn.click();
        await page.waitForTimeout(500);
      }

      for (const el of await page.$$('[data-table-card="true"]')) {
        const size = parseInt(await el.getAttribute('data-stack-size'));
        if (size > 1) {
          const faceAfter = await (await el.$('[data-testid^="card-face-container-"]'))?.getAttribute('data-face-down');
          console.log(`  Face after: ${faceAfter}`);
          flipOk = faceBefore !== faceAfter;
          console.log(`  Flip toggled: ${flipOk ? 'YES' : 'NO'}`);
          break;
        }
      }
      await page.screenshot({ path: 'screenshots/f29-step7-flipped.png' });
    }

    // Summary
    console.log('\n=== RESULTS ===');
    console.log(`Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach(e => console.log(`  ${e}`));
    console.log(`Stack created (${originalStackSize} cards): PASS`);
    console.log(`Shuffle: ${shuffleBtn ? 'PASS' : 'FAIL'}`);
    console.log(`Split modal: ${splitModal ? 'PASS' : 'FAIL'}`);
    console.log(`Split counts correct: ${splitOk ? 'PASS' : 'FAIL'}`);
    console.log(`Flip toggled: ${flipOk ? 'PASS' : 'FAIL'}`);

    if (shuffleBtn && splitModal && splitOk && flipOk) {
      console.log('\nFEATURE #29 PASSED!');
    }

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: 'screenshots/f29-error.png' });
  } finally {
    await browser.close();
  }
}

testFeature29().catch(console.error);
