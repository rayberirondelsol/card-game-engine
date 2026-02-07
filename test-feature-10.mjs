// Test Feature #10: Edit game details
import { chromium } from 'playwright';

const GAME_ID = 'c6d9225d-c45a-41d8-ad81-b52d5281314c';
const BASE_URL = 'http://localhost:5173';

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
    // Step 1: Navigate to game detail screen
    console.log('Step 1: Navigating to game detail page...');
    await page.goto(`${BASE_URL}/games/${GAME_ID}`);
    await page.waitForSelector('[data-testid="game-name"]', { timeout: 10000 });

    const gameName = await page.textContent('[data-testid="game-name"]');
    console.log('  Game name displayed:', gameName);
    if (!gameName.includes('EDIT_TEST_Original_Name')) {
      throw new Error('Game name does not match expected "EDIT_TEST_Original_Name"');
    }
    await page.screenshot({ path: 'test-f10-step1-detail.png' });
    console.log('  Screenshot saved: test-f10-step1-detail.png');

    // Step 2: Click Edit Game button
    console.log('Step 2: Clicking Edit Game button...');
    await page.click('[data-testid="edit-game-btn"]');
    await page.waitForSelector('[data-testid="edit-game-modal"]', { timeout: 5000 });
    console.log('  Edit modal appeared');

    // Verify the modal is pre-filled with current values
    const nameInputVal = await page.inputValue('[data-testid="edit-game-name-input"]');
    const descInputVal = await page.inputValue('[data-testid="edit-game-desc-input"]');
    console.log('  Pre-filled name:', nameInputVal);
    console.log('  Pre-filled description:', descInputVal);
    await page.screenshot({ path: 'test-f10-step2-editmodal.png' });
    console.log('  Screenshot saved: test-f10-step2-editmodal.png');

    // Step 3: Change name to 'EDIT_TEST_Updated_Name'
    console.log('Step 3: Updating name and description...');
    await page.fill('[data-testid="edit-game-name-input"]', 'EDIT_TEST_Updated_Name');
    await page.fill('[data-testid="edit-game-desc-input"]', 'Updated Description for testing');
    await page.screenshot({ path: 'test-f10-step3-filled.png' });
    console.log('  Screenshot saved: test-f10-step3-filled.png');

    // Step 4: Save changes
    console.log('Step 4: Saving changes...');
    await page.click('[data-testid="edit-game-save-btn"]');

    // Wait for modal to close and success message to appear
    await page.waitForSelector('[data-testid="edit-game-modal"]', { state: 'hidden', timeout: 5000 });
    console.log('  Edit modal closed');

    // Check for success message
    const successMsg = await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
    const successText = await successMsg.textContent();
    console.log('  Success message:', successText);

    // Step 5: Verify updated name appears on screen
    console.log('Step 5: Verifying updated values on page...');
    const updatedName = await page.textContent('[data-testid="game-name"]');
    console.log('  Updated name:', updatedName);
    if (!updatedName.includes('EDIT_TEST_Updated_Name')) {
      throw new Error(`Expected name "EDIT_TEST_Updated_Name" but got "${updatedName}"`);
    }

    const updatedDesc = await page.textContent('[data-testid="game-description"]');
    console.log('  Updated description:', updatedDesc);
    if (!updatedDesc.includes('Updated Description for testing')) {
      throw new Error(`Expected description "Updated Description for testing" but got "${updatedDesc}"`);
    }
    await page.screenshot({ path: 'test-f10-step5-updated.png' });
    console.log('  Screenshot saved: test-f10-step5-updated.png');

    // Step 6: Refresh page and verify changes persist
    console.log('Step 6: Refreshing page to verify persistence...');
    await page.reload();
    await page.waitForSelector('[data-testid="game-name"]', { timeout: 10000 });

    const refreshedName = await page.textContent('[data-testid="game-name"]');
    const refreshedDesc = await page.textContent('[data-testid="game-description"]');
    console.log('  After refresh - name:', refreshedName);
    console.log('  After refresh - description:', refreshedDesc);

    if (!refreshedName.includes('EDIT_TEST_Updated_Name')) {
      throw new Error('Name did not persist after refresh!');
    }
    if (!refreshedDesc.includes('Updated Description for testing')) {
      throw new Error('Description did not persist after refresh!');
    }
    await page.screenshot({ path: 'test-f10-step6-persisted.png' });
    console.log('  Screenshot saved: test-f10-step6-persisted.png');

    // Check for console errors
    console.log('\nConsole errors:', consoleErrors.length === 0 ? 'NONE' : consoleErrors.join(', '));

    console.log('\n=== FEATURE #10 TEST: PASSED ===');
  } catch (err) {
    console.error('\n=== FEATURE #10 TEST: FAILED ===');
    console.error('Error:', err.message);
    await page.screenshot({ path: 'test-f10-failure.png' });
    console.log('Failure screenshot saved: test-f10-failure.png');
  } finally {
    await browser.close();
  }
}

test();
