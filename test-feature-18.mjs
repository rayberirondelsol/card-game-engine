// Test Feature #18: Edit card name after import
import { chromium } from 'playwright';

const GAME_ID = 'ccc8bfb6-7074-42e7-884f-a7ba5a207394';
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
    // Step 1: Navigate to game detail
    console.log('Step 1: Navigate to game detail page...');
    await page.goto(`${BASE_URL}/games/${GAME_ID}`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/f18-step1-gamedetail.png', fullPage: true });
    console.log('  Screenshot: screenshots/f18-step1-gamedetail.png');

    // Step 2: Verify card exists with name "test-card"
    console.log('Step 2: Check card is visible...');
    const cardGrid = await page.locator('[data-testid="card-grid"]');
    const cardExists = await cardGrid.isVisible().catch(() => false);
    if (!cardExists) {
      console.error('ERROR: Card grid not found!');
      await page.screenshot({ path: 'screenshots/f18-error-no-grid.png', fullPage: true });
      return false;
    }

    // Find the card name element
    const cardNameEls = await page.locator('[data-testid^="card-name-"]').all();
    console.log(`  Found ${cardNameEls.length} card name elements`);

    if (cardNameEls.length === 0) {
      console.error('ERROR: No card name elements found!');
      return false;
    }

    const firstCardName = await cardNameEls[0].textContent();
    console.log(`  First card name: "${firstCardName}"`);

    // Get the card ID from testid
    const testId = await cardNameEls[0].getAttribute('data-testid');
    const cardId = testId.replace('card-name-', '');
    console.log(`  Card ID: ${cardId}`);

    // Step 3: Click on card name to start editing
    console.log('Step 3: Click on card name to start editing...');
    await cardNameEls[0].click();
    await sleep(500);
    await page.screenshot({ path: 'screenshots/f18-step3-editing.png', fullPage: true });
    console.log('  Screenshot: screenshots/f18-step3-editing.png');

    // Step 4: Verify edit input appeared
    const editInput = page.locator(`[data-testid="card-name-input-${cardId}"]`);
    const inputVisible = await editInput.isVisible().catch(() => false);
    if (!inputVisible) {
      console.error('ERROR: Edit input did not appear after clicking card name!');
      await page.screenshot({ path: 'screenshots/f18-error-no-input.png', fullPage: true });
      return false;
    }
    console.log('  Edit input is visible');

    // Step 5: Clear and type new name
    console.log('Step 5: Type new card name "RENAMED_CARD_TEST"...');
    await editInput.fill('RENAMED_CARD_TEST');
    await sleep(300);
    await page.screenshot({ path: 'screenshots/f18-step5-typed.png', fullPage: true });
    console.log('  Screenshot: screenshots/f18-step5-typed.png');

    // Step 6: Press Enter to save
    console.log('Step 6: Press Enter to save...');
    await editInput.press('Enter');
    await sleep(1500);
    await page.screenshot({ path: 'screenshots/f18-step6-saved.png', fullPage: true });
    console.log('  Screenshot: screenshots/f18-step6-saved.png');

    // Step 7: Verify the new name displays in the UI
    console.log('Step 7: Verify new name displays...');
    const updatedNameEl = page.locator(`[data-testid="card-name-${cardId}"]`);
    const updatedNameVisible = await updatedNameEl.isVisible({ timeout: 3000 }).catch(() => false);

    if (updatedNameVisible) {
      const updatedName = await updatedNameEl.textContent();
      console.log(`  Updated card name: "${updatedName}"`);
      if (updatedName !== 'RENAMED_CARD_TEST') {
        console.error(`ERROR: Expected "RENAMED_CARD_TEST", got "${updatedName}"`);
        return false;
      }
      console.log('  Card name updated successfully in UI!');
    } else {
      console.error('ERROR: Card name element not visible after save');
      return false;
    }

    // Step 8: Refresh page and verify persistence
    console.log('Step 8: Refresh page and verify persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/f18-step8-refreshed.png', fullPage: true });
    console.log('  Screenshot: screenshots/f18-step8-refreshed.png');

    const persistedNameEl = page.locator(`[data-testid="card-name-${cardId}"]`);
    const persistedNameVisible = await persistedNameEl.isVisible({ timeout: 3000 }).catch(() => false);

    if (persistedNameVisible) {
      const persistedName = await persistedNameEl.textContent();
      console.log(`  Persisted card name after refresh: "${persistedName}"`);
      if (persistedName !== 'RENAMED_CARD_TEST') {
        console.error(`ERROR: Name did not persist! Expected "RENAMED_CARD_TEST", got "${persistedName}"`);
        return false;
      }
      console.log('  Card name persisted after refresh!');
    } else {
      console.error('ERROR: Card name element not visible after refresh');
      return false;
    }

    // Step 9: Verify via API
    console.log('Step 9: Verify via API...');
    const apiRes = await page.evaluate(async (params) => {
      const res = await fetch(`/api/games/${params.gameId}/cards`);
      return await res.json();
    }, { gameId: GAME_ID });

    const renamedCard = apiRes.find(c => c.id === cardId);
    if (renamedCard) {
      console.log(`  API card name: "${renamedCard.name}"`);
      if (renamedCard.name === 'RENAMED_CARD_TEST') {
        console.log('  API confirms card name update!');
      } else {
        console.error(`ERROR: API shows "${renamedCard.name}" instead of "RENAMED_CARD_TEST"`);
        return false;
      }
    } else {
      console.error('ERROR: Card not found in API response');
      return false;
    }

    // Check console errors
    if (consoleErrors.length > 0) {
      console.log('\nConsole errors detected:');
      consoleErrors.forEach(e => console.log('  -', e));
    } else {
      console.log('\nNo console errors detected.');
    }

    console.log('\n=== Feature #18: PASSED ===');
    return true;

  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: 'screenshots/f18-error.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

test().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
