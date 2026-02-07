// Feature #17: Card back management and assignment - Browser automation test
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let gameId;

  try {
    // Step 1: Create test game via API
    console.log('Step 1: Create test game via API...');
    const createRes = await fetch('http://localhost:3001/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'CARDBACK_TEST_17', description: 'Card back test game' }),
    });
    const game = await createRes.json();
    gameId = game.id;
    console.log('  Created game:', gameId);

    // Step 2: Navigate to game detail screen
    console.log('Step 2: Navigate to game detail screen...');
    await page.goto(`${BASE_URL}/games/${gameId}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="game-name"]', { timeout: 10000 });
    console.log('  Game detail page loaded');

    // Verify card backs section exists
    await page.waitForSelector('[data-testid="card-backs-section"]', { timeout: 5000 });
    const noBacksMsg = await page.textContent('[data-testid="no-card-backs-message"]');
    console.log('  No card backs message:', noBacksMsg);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f17-step2-detail.png`, fullPage: true });

    // Step 3: Upload a card back image
    console.log('Step 3: Upload a card back image...');
    const cardBackInput = await page.locator('[data-testid="card-back-upload-input"]');
    await cardBackInput.setInputFiles([
      path.join(__dirname, 'BATCH_TEST_CARD_A.png'),
    ]);

    // Wait for upload to complete
    await page.waitForSelector('[data-testid="card-backs-list"]', { timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/f17-step3-back-uploaded.png`, fullPage: true });

    // Step 4: Verify card back appears in list
    console.log('Step 4: Verify card back appears in card back list...');
    const cardBackItems = await page.locator('[data-testid="card-backs-list"] li').all();
    console.log('  Card back count:', cardBackItems.length);
    if (cardBackItems.length !== 1) {
      throw new Error(`Expected 1 card back, found ${cardBackItems.length}`);
    }

    // Get the card back name
    const firstBackItem = await page.locator('[data-testid="card-backs-list"] li').first();
    const backName = await firstBackItem.locator('span').textContent();
    console.log('  Card back name:', backName.trim());

    // Step 5: Upload a card to the game
    console.log('Step 5: Upload a card to the game...');
    const cardInput = await page.locator('[data-testid="card-upload-input"]');
    await cardInput.setInputFiles([
      path.join(__dirname, 'BATCH_TEST_CARD_B.png'),
    ]);
    await page.waitForSelector('[data-testid="upload-message"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="card-grid"]', { timeout: 5000 });
    console.log('  Card uploaded successfully');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f17-step5-card-uploaded.png`, fullPage: true });

    // Step 6: Assign the card back to the card
    console.log('Step 6: Assign card back to card...');

    // Wait for the card back select to appear (it only shows when cardBacks.length > 0)
    const cardBackSelects = await page.locator('select[data-testid^="card-back-select-"]').all();
    console.log('  Card back select dropdowns found:', cardBackSelects.length);
    if (cardBackSelects.length === 0) {
      throw new Error('No card back select dropdowns found');
    }

    // Get the card back ID from the API
    const backsRes = await fetch(`http://localhost:3001/api/games/${gameId}/card-backs`);
    const backs = await backsRes.json();
    const cardBackId = backs[0].id;
    console.log('  Card back ID to assign:', cardBackId);

    // Select the card back in the dropdown
    const firstSelect = cardBackSelects[0];
    await firstSelect.selectOption(cardBackId);
    console.log('  Card back assigned via dropdown');

    // Small delay for the API call to complete
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f17-step6-assigned.png`, fullPage: true });

    // Step 7: Verify assignment is saved via API
    console.log('Step 7: Verify card back assignment saved...');
    const cardsRes = await fetch(`http://localhost:3001/api/games/${gameId}/cards`);
    const cards = await cardsRes.json();
    const card = cards[0];
    console.log('  Card:', card.name, '- card_back_id:', card.card_back_id);

    if (card.card_back_id !== cardBackId) {
      throw new Error(`Card back not assigned! Expected ${cardBackId}, got ${card.card_back_id}`);
    }
    console.log('  Card back assignment verified in database!');

    // Step 8: Refresh and verify persistence
    console.log('Step 8: Refresh page and verify assignment persists...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="card-grid"]', { timeout: 10000 });

    // Check card back dropdown still has the right value selected
    const refreshedSelects = await page.locator('select[data-testid^="card-back-select-"]').all();
    if (refreshedSelects.length > 0) {
      const selectedValue = await refreshedSelects[0].inputValue();
      console.log('  Card back select value after refresh:', selectedValue);
      if (selectedValue !== cardBackId) {
        throw new Error(`Card back assignment lost after refresh! Expected ${cardBackId}, got ${selectedValue}`);
      }
    }

    // Also verify card back still listed
    const refreshedBackItems = await page.locator('[data-testid="card-backs-list"] li').all();
    console.log('  Card backs after refresh:', refreshedBackItems.length);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f17-step8-persisted.png`, fullPage: true });

    console.log('\n=== FEATURE #17 TEST RESULT: PASSED ===');
    console.log('Card back uploaded, listed, assigned to card, and persisted after refresh.');

  } catch (err) {
    console.error('\n=== FEATURE #17 TEST RESULT: FAILED ===');
    console.error('Error:', err.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/f17-error.png`, fullPage: true });
  } finally {
    // Step 9: Clean up test data
    if (gameId) {
      try {
        await fetch(`http://localhost:3001/api/games/${gameId}`, { method: 'DELETE' });
        console.log('Test data cleaned up');
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    await browser.close();
  }
}

run().catch(console.error);
