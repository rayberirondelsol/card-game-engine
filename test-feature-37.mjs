// Test Feature #37: Auto-save functionality
import { chromium } from 'playwright';

const GAME_ID = '5d0d98ba-3904-49f7-aca0-37b0ee6d7678';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('[ERR]', msg.text());
    }
    if (msg.text().includes('Auto-save')) {
      console.log('[AUTO-SAVE LOG]', msg.text());
    }
  });

  try {
    // Step 1: Clean up any existing auto-saves for this game
    console.log('Step 0: Cleaning up existing auto-saves...');
    const savesRes = await (await fetch(`http://localhost:3001/api/games/${GAME_ID}/saves`)).json();
    for (const save of savesRes) {
      if (save.is_auto_save) {
        await fetch(`http://localhost:3001/api/games/${GAME_ID}/saves/${save.id}`, { method: 'DELETE' });
        console.log(`  Deleted auto-save: ${save.id}`);
      }
    }

    // Step 1: Navigate to game table
    console.log('Step 1: Navigate to game table with cards...');
    await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    const title = await page.locator('[data-testid="game-table-title"]').textContent();
    console.log(`  Title: "${title}"`);

    // Verify auto-save status indicator exists
    const autoSaveIndicator = page.locator('[data-testid="auto-save-status"]');
    const indicatorVisible = await autoSaveIndicator.isVisible().catch(() => false);
    console.log(`  Auto-save indicator visible: ${indicatorVisible}`);

    // Step 2: Place cards on the table and add a marker
    console.log('Step 2: Placing cards on table...');
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(1000);

    const cards = await page.locator('[data-testid^="drawer-card-"]').all();
    console.log(`  Available cards: ${cards.length}`);
    // Place 3 cards
    for (let i = 0; i < Math.min(3, cards.length); i++) {
      await cards[i].click();
      await sleep(200);
    }
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(500);

    const tableCardCount = await page.locator('[data-table-card="true"]').count();
    console.log(`  Cards on table: ${tableCardCount}`);

    // Add a marker via toolbar
    console.log('  Adding a marker...');
    const markerBtn = page.locator('[data-testid="toolbar-marker-btn"]');
    if (await markerBtn.isVisible().catch(() => false)) {
      await markerBtn.click();
      await sleep(500);
      const markerCreateBtn = page.locator('[data-testid="marker-create-btn"]');
      if (await markerCreateBtn.isVisible().catch(() => false)) {
        await markerCreateBtn.click();
        await sleep(500);
      }
    }

    await page.screenshot({ path: 'screenshots/f37-step1-table-setup.png' });

    // Step 3: Trigger auto-save manually by clicking the auto-save indicator
    console.log('Step 3: Triggering auto-save...');
    await autoSaveIndicator.click();
    await sleep(2000); // Wait for auto-save to complete

    // Check for auto-save toast (may have already disappeared)
    const saveToast = await page.locator('[data-testid="save-toast"]').isVisible().catch(() => false);
    console.log(`  Save toast visible: ${saveToast}`);
    if (saveToast) {
      const toastText = await page.locator('[data-testid="save-toast"]').textContent().catch(() => '(gone)');
      console.log(`  Toast text: "${toastText}"`);
    }

    // Verify auto-save status changed
    const statusText = await autoSaveIndicator.textContent();
    console.log(`  Auto-save status: "${statusText}"`);

    await page.screenshot({ path: 'screenshots/f37-step2-auto-saved.png' });

    // Step 4: Verify auto-save entry exists in backend
    console.log('Step 4: Verifying auto-save in database...');
    const savesAfter = await (await fetch(`http://localhost:3001/api/games/${GAME_ID}/saves`)).json();
    const autoSaves = savesAfter.filter(s => s.is_auto_save);
    console.log(`  Total saves: ${savesAfter.length}`);
    console.log(`  Auto-saves: ${autoSaves.length}`);

    if (autoSaves.length > 0) {
      console.log(`  Auto-save name: "${autoSaves[0].name}"`);
      console.log(`  Auto-save ID: ${autoSaves[0].id}`);
      console.log('  SUCCESS: Auto-save entry found!');
    } else {
      console.log('  FAIL: No auto-save entry found');
      await page.screenshot({ path: 'screenshots/f37-error.png' });
      return;
    }

    const autoSaveId = autoSaves[0].id;

    // Step 5: Navigate away from the game
    console.log('Step 5: Navigating away from game...');
    await page.click('[data-testid="back-to-game-btn"]');
    await sleep(2000);

    // Verify we're on the game detail page
    const detailPage = await page.locator('[data-testid="game-detail-title"]').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  On game detail page: ${detailPage}`);

    await page.screenshot({ path: 'screenshots/f37-step3-game-detail.png' });

    // Step 6: Check that auto-save appears in saves list
    console.log('Step 6: Checking auto-save in saves list...');
    const saveItem = page.locator(`[data-testid="save-item-${autoSaveId}"]`);
    const saveVisible = await saveItem.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Auto-save item visible: ${saveVisible}`);

    if (saveVisible) {
      const saveItemText = await saveItem.textContent();
      console.log(`  Save item text: "${saveItemText}"`);
      const hasAutoLabel = saveItemText.includes('Auto');
      console.log(`  Has 'Auto' label: ${hasAutoLabel}`);
      if (hasAutoLabel) {
        console.log('  SUCCESS: Auto-save marked correctly!');
      }
    }

    await page.screenshot({ path: 'screenshots/f37-step4-saves-list.png' });

    // Step 7: Load the auto-save
    console.log('Step 7: Loading auto-save...');
    const loadBtn = page.locator(`[data-testid="save-load-btn-${autoSaveId}"]`);
    if (await loadBtn.isVisible().catch(() => false)) {
      await loadBtn.click();
      await sleep(3000);

      // Verify we're back on the game table
      const backOnTable = await page.locator('[data-testid="game-table-title"]').isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  Back on game table: ${backOnTable}`);

      // Verify cards are restored
      const restoredCards = await page.locator('[data-table-card="true"]').count();
      console.log(`  Restored table cards: ${restoredCards}`);

      if (restoredCards >= tableCardCount) {
        console.log('  SUCCESS: Auto-saved state restored!');
      } else {
        console.log(`  WARNING: Expected at least ${tableCardCount} cards, got ${restoredCards}`);
      }

      await page.screenshot({ path: 'screenshots/f37-step5-restored.png' });
    } else {
      console.log('  WARNING: Load button not visible, checking saves list...');
      // Maybe it's not showing yet; let's try scrolling to it
      const allSaveItems = await page.locator('[data-testid^="save-item-"]').all();
      console.log(`  Total save items visible: ${allSaveItems.length}`);
    }

    // Final summary
    const passed = autoSaves.length > 0;
    console.log(`\n=== Final Results ===`);
    console.log(`  Auto-save created: ${autoSaves.length > 0}`);
    console.log(`  JS errors: ${errors.length}`);
    console.log(`\n=== TEST ${passed ? 'PASSED' : 'FAILED'} ===`);

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: 'screenshots/f37-error.png' });
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
