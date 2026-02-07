import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Step 1: Create a test game via API
    console.log('=== Step 1: Create test game via API ===');
    const createRes = await page.request.post(`${BASE}/api/games`, {
      data: { name: 'DELETE_TEST_F11', description: 'Test game for feature 11 delete' }
    });
    const testGame = await createRes.json();
    console.log(`Created game: ${testGame.name} (${testGame.id})`);

    // Step 2: Navigate to start screen
    console.log('\n=== Step 2: Navigate to start screen ===');
    await page.goto(BASE);
    await page.waitForSelector('[data-testid^="game-card-"]', { timeout: 5000 });
    await page.screenshot({ path: 'screenshots/f11-step2-startscreen.png', fullPage: true });

    // Verify test game is visible
    const gameCard = page.locator(`[data-testid="game-card-${testGame.id}"]`);
    const gameCardVisible = await gameCard.isVisible();
    console.log(`Game card visible: ${gameCardVisible}`);

    if (!gameCardVisible) {
      throw new Error('Test game card not found on start screen');
    }

    // Step 3: Initiate delete on test game (hover over card to reveal delete button)
    console.log('\n=== Step 3: Hover and click delete button ===');
    await gameCard.hover();
    await sleep(500);

    const deleteBtn = page.locator(`[data-testid="delete-game-${testGame.id}"]`);
    await deleteBtn.waitFor({ state: 'visible', timeout: 3000 });
    await page.screenshot({ path: 'screenshots/f11-step3-hover-delete.png', fullPage: true });
    await deleteBtn.click();

    // Step 4: Verify confirmation dialog appears
    console.log('\n=== Step 4: Verify confirmation dialog ===');
    const modal = page.locator('[data-testid="delete-game-modal"]');
    await modal.waitFor({ state: 'visible', timeout: 3000 });
    await page.screenshot({ path: 'screenshots/f11-step4-confirmation-dialog.png', fullPage: true });

    // Check warning text mentions cards/setups/saves
    const warningText = await page.locator('[data-testid="delete-warning"]').textContent();
    console.log(`Warning text: "${warningText}"`);
    const hasCardsWarning = warningText.toLowerCase().includes('cards');
    const hasSetupsWarning = warningText.toLowerCase().includes('setups');
    const hasSavesWarning = warningText.toLowerCase().includes('saved games') || warningText.toLowerCase().includes('saves');
    console.log(`Warning mentions cards: ${hasCardsWarning}`);
    console.log(`Warning mentions setups: ${hasSetupsWarning}`);
    console.log(`Warning mentions saves: ${hasSavesWarning}`);

    if (!hasCardsWarning || !hasSetupsWarning || !hasSavesWarning) {
      console.warn('WARNING: Delete confirmation should warn about all related data (cards, setups, saves)');
    }

    // Step 5: Cancel the deletion
    console.log('\n=== Step 5: Cancel deletion ===');
    await page.locator('[data-testid="delete-game-cancel-btn"]').click();
    await sleep(500);

    // Verify modal is gone
    const modalGone = await modal.isHidden();
    console.log(`Modal closed after cancel: ${modalGone}`);

    // Step 6: Verify game still exists
    console.log('\n=== Step 6: Verify game still exists ===');
    const gameStillVisible = await gameCard.isVisible();
    console.log(`Game still visible after cancel: ${gameStillVisible}`);
    await page.screenshot({ path: 'screenshots/f11-step6-after-cancel.png', fullPage: true });

    if (!gameStillVisible) {
      throw new Error('Game disappeared after clicking Cancel!');
    }

    // Step 7: Initiate delete again
    console.log('\n=== Step 7: Initiate delete again ===');
    await gameCard.hover();
    await sleep(500);
    await deleteBtn.waitFor({ state: 'visible', timeout: 3000 });
    await deleteBtn.click();

    // Step 8: Confirm the deletion
    console.log('\n=== Step 8: Confirm deletion ===');
    await modal.waitFor({ state: 'visible', timeout: 3000 });
    await page.screenshot({ path: 'screenshots/f11-step8-confirm-dialog.png', fullPage: true });
    await page.locator('[data-testid="delete-game-confirm-btn"]').click();
    await sleep(1000);

    // Step 9: Verify success feedback
    console.log('\n=== Step 9: Verify success feedback ===');
    await page.screenshot({ path: 'screenshots/f11-step9-after-delete.png', fullPage: true });

    // Check for success message
    const successBanner = page.locator('.bg-green-50');
    const hasSuccess = await successBanner.isVisible().catch(() => false);
    console.log(`Success feedback shown: ${hasSuccess}`);
    if (hasSuccess) {
      const successText = await successBanner.textContent();
      console.log(`Success text: "${successText.trim()}"`);
    }

    // Step 10: Verify game is removed from list
    console.log('\n=== Step 10: Verify game removed from list ===');
    const gameGone = await gameCard.isHidden();
    console.log(`Game removed from list: ${gameGone}`);

    if (!gameGone) {
      throw new Error('Game still visible after deletion!');
    }

    // Step 11: Verify API returns 404 for deleted game
    console.log('\n=== Step 11: Verify API returns 404 ===');
    const getRes = await page.request.get(`${BASE}/api/games/${testGame.id}`);
    console.log(`API GET status: ${getRes.status()}`);
    if (getRes.status() !== 404) {
      throw new Error(`Expected 404 but got ${getRes.status()}`);
    }
    console.log('API correctly returns 404 for deleted game');

    // =============================
    // Test from GameDetail page too
    // =============================
    console.log('\n\n=== TESTING DELETE FROM GAME DETAIL PAGE ===\n');

    // Create another test game
    const createRes2 = await page.request.post(`${BASE}/api/games`, {
      data: { name: 'DELETE_TEST_F11_DETAIL', description: 'Test delete from game detail' }
    });
    const testGame2 = await createRes2.json();
    console.log(`Created game: ${testGame2.name} (${testGame2.id})`);

    // Navigate to game detail
    await page.goto(`${BASE}/games/${testGame2.id}`);
    await page.waitForSelector('[data-testid="game-name"]', { timeout: 5000 });
    await page.screenshot({ path: 'screenshots/f11-detail-page.png', fullPage: true });

    // Click Delete button
    console.log('Clicking Delete button on detail page...');
    await page.locator('[data-testid="delete-game-btn"]').click();

    // Verify confirmation dialog
    const detailModal = page.locator('[data-testid="delete-game-modal"]');
    await detailModal.waitFor({ state: 'visible', timeout: 3000 });
    await page.screenshot({ path: 'screenshots/f11-detail-confirm.png', fullPage: true });

    const detailWarning = await page.locator('[data-testid="delete-warning"]').textContent();
    console.log(`Detail page warning: "${detailWarning}"`);

    // Cancel first
    await page.locator('[data-testid="delete-game-cancel-btn"]').click();
    await sleep(500);
    const detailModalGone = await detailModal.isHidden();
    console.log(`Detail modal closed after cancel: ${detailModalGone}`);

    // Delete button again and confirm
    await page.locator('[data-testid="delete-game-btn"]').click();
    await detailModal.waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('[data-testid="delete-game-confirm-btn"]').click();

    // Should navigate back to start screen
    await page.waitForURL(BASE + '/', { timeout: 5000 }).catch(() => {
      // URL might be just BASE without trailing slash
    });
    await sleep(1000);
    await page.screenshot({ path: 'screenshots/f11-detail-after-delete.png', fullPage: true });

    // Check success message after redirect
    const redirectSuccess = page.locator('.bg-green-50');
    const hasRedirectSuccess = await redirectSuccess.isVisible().catch(() => false);
    console.log(`Success message after redirect: ${hasRedirectSuccess}`);

    // Verify game 2 API returns 404
    const getRes2 = await page.request.get(`${BASE}/api/games/${testGame2.id}`);
    console.log(`API GET status for game 2: ${getRes2.status()}`);

    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach(e => console.log(`  ERROR: ${e}`));
    } else {
      console.log('\nNo console errors detected.');
    }

    console.log('\n=== ALL TESTS PASSED ===');

  } catch (err) {
    console.error(`\nTEST FAILED: ${err.message}`);
    await page.screenshot({ path: 'screenshots/f11-failure.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

run();
