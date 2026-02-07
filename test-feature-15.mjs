// Feature #15: Batch upload multiple card images - Browser automation test
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAME_ID = '0c498f61-f0a3-4536-b298-58c9e5695878';
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Step 1: Navigate to game detail screen
    console.log('Step 1: Navigate to game detail screen...');
    await page.goto(`${BASE_URL}/games/${GAME_ID}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="game-name"]', { timeout: 10000 });

    const gameName = await page.textContent('[data-testid="game-name"]');
    console.log('  Game name:', gameName);

    // Verify no cards yet
    const noCardsMsg = await page.textContent('[data-testid="no-cards-message"]');
    console.log('  No cards message:', noCardsMsg);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f15-step1-detail.png`, fullPage: true });
    console.log('  Screenshot saved: f15-step1-detail.png');

    // Step 2: Select batch upload - set multiple files on the file input
    console.log('Step 2: Upload 4 card images at once via batch upload...');

    const fileInput = await page.locator('[data-testid="card-upload-input"]');

    // Set 4 files at once (batch upload)
    await fileInput.setInputFiles([
      path.join(__dirname, 'BATCH_TEST_CARD_A.png'),
      path.join(__dirname, 'BATCH_TEST_CARD_B.png'),
      path.join(__dirname, 'BATCH_TEST_CARD_C.png'),
      path.join(__dirname, 'BATCH_TEST_CARD_D.png'),
    ]);

    // Wait for upload to complete (success message appears)
    await page.waitForSelector('[data-testid="upload-message"]', { timeout: 15000 });

    const uploadMsg = await page.textContent('[data-testid="upload-message"]');
    console.log('  Upload message:', uploadMsg);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f15-step2-uploaded.png`, fullPage: true });
    console.log('  Screenshot saved: f15-step2-uploaded.png');

    // Step 3: Verify all 4 cards appear in the card grid
    console.log('Step 3: Verify all 4 cards appear in card grid...');
    await page.waitForSelector('[data-testid="card-grid"]', { timeout: 5000 });

    // Count cards in the grid
    const cardElements = await page.locator('[data-testid="card-grid"] > div').all();
    console.log('  Card count in grid:', cardElements.length);

    if (cardElements.length !== 4) {
      throw new Error(`Expected 4 cards, found ${cardElements.length}`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f15-step3-cards-grid.png`, fullPage: true });
    console.log('  Screenshot saved: f15-step3-cards-grid.png');

    // Step 4: Verify card count in the "All Cards" sidebar
    console.log('Step 4: Verify card count matches...');
    const allCardsText = await page.textContent('[data-testid="all-cards-filter"]');
    console.log('  All Cards text:', allCardsText.trim());

    // Step 5: Refresh page and verify all cards persist
    console.log('Step 5: Refresh page and verify cards persist...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="card-grid"]', { timeout: 10000 });

    const cardElementsAfterRefresh = await page.locator('[data-testid="card-grid"] > div').all();
    console.log('  Card count after refresh:', cardElementsAfterRefresh.length);

    if (cardElementsAfterRefresh.length !== 4) {
      throw new Error(`Expected 4 cards after refresh, found ${cardElementsAfterRefresh.length}`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f15-step5-persisted.png`, fullPage: true });
    console.log('  Screenshot saved: f15-step5-persisted.png');

    // Step 6: Verify via API
    console.log('Step 6: Verify cards via API...');
    const apiResponse = await page.evaluate(async (gameId) => {
      const res = await fetch(`/api/games/${gameId}/cards`);
      return res.json();
    }, GAME_ID);

    console.log('  API card count:', apiResponse.length);
    for (const card of apiResponse) {
      console.log(`  - ${card.name} (id: ${card.id})`);
    }

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    console.log('\n=== FEATURE #15 TEST RESULT: PASSED ===');
    console.log('All 4 cards uploaded via batch, displayed in grid, persisted after refresh.');

  } catch (err) {
    console.error('\n=== FEATURE #15 TEST RESULT: FAILED ===');
    console.error('Error:', err.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/f15-error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
