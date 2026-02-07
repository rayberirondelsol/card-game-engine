// Feature #12: Game CRUD data persists across page refresh
// This script verifies create, edit, and delete persist after full page refresh

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ============ STEP 1: Create game 'PERSIST_TEST_67890' ============
    console.log('STEP 1: Navigate to start screen');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/f12-step1-startscreen.png' });

    console.log('STEP 1b: Click Create New Game');
    await page.click('button:has-text("Create New Game")');
    await sleep(500);

    console.log('STEP 1c: Fill in game name');
    await page.fill('input[placeholder="Enter game name..."]', 'PERSIST_TEST_67890');
    await page.fill('textarea[placeholder="Describe your game..."]', 'Testing persistence across refresh');
    await page.screenshot({ path: 'screenshots/f12-step1c-form.png' });

    console.log('STEP 1d: Submit the form');
    await page.click('button:has-text("Create Game")');
    await sleep(1000);

    // ============ STEP 2: Verify game appears in list ============
    console.log('STEP 2: Verify game appears in list');
    const gameVisible = await page.isVisible('text=PERSIST_TEST_67890');
    console.log('  Game visible in list:', gameVisible);
    await page.screenshot({ path: 'screenshots/f12-step2-gamecreated.png' });

    if (!gameVisible) {
      throw new Error('Game PERSIST_TEST_67890 not visible in list after creation');
    }
    console.log('  PASS: Game created and visible');

    // ============ STEP 3: Refresh browser and verify persistence ============
    console.log('STEP 3: Full page refresh');
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1000);

    const gameAfterRefresh = await page.isVisible('text=PERSIST_TEST_67890');
    console.log('  Game visible after refresh:', gameAfterRefresh);
    await page.screenshot({ path: 'screenshots/f12-step3-afterrefresh.png' });

    if (!gameAfterRefresh) {
      throw new Error('Game PERSIST_TEST_67890 not visible after page refresh - data not persisted!');
    }
    console.log('  PASS: Game persists after refresh');

    // ============ STEP 4: Navigate to game detail and edit name ============
    console.log('STEP 4: Navigate to game detail page');
    await page.click('text=PERSIST_TEST_67890');
    await sleep(1000);
    await page.screenshot({ path: 'screenshots/f12-step4-gamedetail.png' });

    // Verify we're on the game detail page
    const gameName = await page.textContent('[data-testid="game-name"]');
    console.log('  Game name on detail page:', gameName);

    console.log('STEP 4b: Click Edit Game');
    await page.click('[data-testid="edit-game-btn"]');
    await sleep(500);

    console.log('STEP 4c: Change name to PERSIST_TEST_UPDATED');
    await page.fill('[data-testid="edit-game-name-input"]', 'PERSIST_TEST_UPDATED');
    await page.screenshot({ path: 'screenshots/f12-step4c-editform.png' });

    console.log('STEP 4d: Save changes');
    await page.click('[data-testid="edit-game-save-btn"]');
    await sleep(1000);

    // Verify name changed on detail page
    const updatedName = await page.textContent('[data-testid="game-name"]');
    console.log('  Updated name on detail page:', updatedName);
    await page.screenshot({ path: 'screenshots/f12-step4d-updated.png' });

    if (!updatedName.includes('PERSIST_TEST_UPDATED')) {
      throw new Error('Game name not updated to PERSIST_TEST_UPDATED');
    }
    console.log('  PASS: Game name updated successfully');

    // ============ STEP 5: Refresh and verify updated name persists ============
    console.log('STEP 5: Refresh page and verify updated name persists');
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1000);

    const nameAfterRefresh = await page.textContent('[data-testid="game-name"]');
    console.log('  Name after refresh:', nameAfterRefresh);
    await page.screenshot({ path: 'screenshots/f12-step5-afterrefresh.png' });

    if (!nameAfterRefresh.includes('PERSIST_TEST_UPDATED')) {
      throw new Error('Updated game name did not persist after refresh!');
    }
    console.log('  PASS: Updated name persists after refresh');

    // ============ STEP 6: Go back to start screen and verify ============
    console.log('STEP 6: Navigate back to start screen');
    await page.click('[data-testid="back-button"]');
    await sleep(1000);

    const updatedInList = await page.isVisible('text=PERSIST_TEST_UPDATED');
    console.log('  Updated name visible in start screen list:', updatedInList);
    await page.screenshot({ path: 'screenshots/f12-step6-startscreen-updated.png' });

    if (!updatedInList) {
      throw new Error('Updated game name not visible in start screen list');
    }
    console.log('  PASS: Updated name shows in game list');

    // ============ STEP 7: Delete the game ============
    console.log('STEP 7: Delete the game');
    // Click on the game card to navigate to detail
    await page.click('text=PERSIST_TEST_UPDATED');
    await sleep(1000);

    // Use the Delete button on detail page
    await page.click('[data-testid="delete-game-btn"]');
    await sleep(500);
    await page.screenshot({ path: 'screenshots/f12-step7-deletemodal.png' });

    // Confirm deletion
    await page.click('[data-testid="delete-game-confirm-btn"]');
    await sleep(2000);

    // Should be redirected to start screen
    await page.screenshot({ path: 'screenshots/f12-step7-afterdelete.png' });

    // Wait for the success toast to disappear (it auto-dismisses after 4 seconds)
    // Then check that no game card contains the deleted game name
    // The toast message might contain "PERSIST_TEST_UPDATED" so we need to be specific
    // Check game cards specifically - look for h3 tags within game cards
    const gameCards = await page.$$eval('h3', els => els.map(el => el.textContent));
    console.log('  Game card titles after delete:', gameCards);
    const deletedGameInCards = gameCards.some(name => name.includes('PERSIST_TEST_UPDATED'));

    if (deletedGameInCards) {
      throw new Error('Game still visible in game cards after deletion!');
    }
    console.log('  PASS: Game deleted and no longer visible in game cards');

    // ============ STEP 8: Refresh and verify deletion persists ============
    console.log('STEP 8: Refresh page and verify deletion persists');
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1000);

    const gameCardsAfterRefresh = await page.$$eval('h3', els => els.map(el => el.textContent));
    console.log('  Game card titles after delete + refresh:', gameCardsAfterRefresh);
    await page.screenshot({ path: 'screenshots/f12-step8-afterdeleterefresh.png' });

    const deletedAfterRefresh = gameCardsAfterRefresh.some(name => name.includes('PERSIST_TEST_UPDATED'));
    if (deletedAfterRefresh) {
      throw new Error('Deleted game reappeared after page refresh!');
    }
    console.log('  PASS: Deletion persists after refresh');

    // Also verify original name is gone too
    const origAfterRefresh = gameCardsAfterRefresh.some(name => name.includes('PERSIST_TEST_67890'));
    if (origAfterRefresh) {
      throw new Error('Original game name reappeared after deletion and refresh!');
    }
    console.log('  PASS: Original game name also gone');

    // ============ RESULTS ============
    console.log('\n========================================');
    console.log('ALL STEPS PASSED!');
    console.log('Feature #12: Game CRUD data persists across page refresh - VERIFIED');
    console.log('========================================');

    if (consoleErrors.length > 0) {
      console.log('\nConsole errors detected:');
      consoleErrors.forEach(e => console.log('  ERROR:', e));
    } else {
      console.log('\nNo console errors detected');
    }

  } catch (err) {
    console.error('\nTEST FAILED:', err.message);
    await page.screenshot({ path: 'screenshots/f12-failure.png' });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

test();
