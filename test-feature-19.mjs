// Test Feature #19: Delete individual card removes it from database
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

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

  let gameId = null;
  let cardId = null;

  try {
    // Step 1: Create test game via API
    console.log('Step 1: Create test game...');
    // Navigate to start screen first so page.evaluate has a valid origin
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    await sleep(1000);

    const createGameRes = await page.evaluate(async () => {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'DELETE_CARD_TEST_19', description: 'Testing card deletion' }),
      });
      return await res.json();
    });
    gameId = createGameRes.id;
    console.log(`  Created game: ${gameId}`);

    // Step 2: Upload a test card via API
    console.log('Step 2: Upload a test card...');
    // Navigate to game detail page
    await page.goto(`${BASE_URL}/games/${gameId}`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Upload card using the file input
    const fileInput = page.locator('[data-testid="card-upload-input"]');
    // Create a temp PNG file in the page context and upload
    const uploadRes = await page.evaluate(async (gid) => {
      // Create a simple 1x1 PNG as a blob
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 140;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FF5733';
      ctx.fillRect(0, 0, 100, 140);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText('DELETE_ME', 10, 70);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const formData = new FormData();
      formData.append('file', blob, 'DELETE_TEST_CARD.png');

      const res = await fetch(`/api/games/${gid}/cards/upload`, {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    }, gameId);

    cardId = uploadRes.id;
    console.log(`  Uploaded card: ${cardId}, name: "${uploadRes.name}"`);

    // Step 3: Verify card appears in GET /api/games/:id/cards
    console.log('Step 3: Verify card appears in card list API...');
    const cardsListBefore = await page.evaluate(async (gid) => {
      const res = await fetch(`/api/games/${gid}/cards`);
      return await res.json();
    }, gameId);
    console.log(`  Cards in list: ${cardsListBefore.length}`);
    const foundCard = cardsListBefore.find(c => c.id === cardId);
    if (!foundCard) {
      console.error('ERROR: Uploaded card not found in card list!');
      return false;
    }
    console.log(`  Card "${foundCard.name}" found in list.`);

    // Step 4: Reload the page to see the card in the UI
    console.log('Step 4: Reload and verify card in UI...');
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/f19-step4-card-visible.png', fullPage: true });
    console.log('  Screenshot: screenshots/f19-step4-card-visible.png');

    // Verify card is visible in UI
    const cardEl = page.locator(`[data-testid="card-${cardId}"]`);
    const cardVisible = await cardEl.isVisible({ timeout: 5000 }).catch(() => false);
    if (!cardVisible) {
      console.error('ERROR: Card element not visible in UI!');
      return false;
    }
    console.log('  Card visible in UI grid.');

    // Step 5: Delete the card via UI (hover to show delete button, then click)
    console.log('Step 5: Delete card via UI...');
    // Handle the confirm dialog
    page.on('dialog', async dialog => {
      console.log(`  Dialog message: "${dialog.message()}"`);
      await dialog.accept();
    });

    // Hover over the card to show delete button
    await cardEl.hover();
    await sleep(500);

    const deleteBtn = page.locator(`[data-testid="delete-card-${cardId}"]`);
    const deleteBtnVisible = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!deleteBtnVisible) {
      console.error('ERROR: Delete button not visible after hover!');
      await page.screenshot({ path: 'screenshots/f19-error-no-delete-btn.png', fullPage: true });
      return false;
    }

    await deleteBtn.click();
    await sleep(1500);
    await page.screenshot({ path: 'screenshots/f19-step5-after-delete.png', fullPage: true });
    console.log('  Screenshot: screenshots/f19-step5-after-delete.png');

    // Step 6: Verify card no longer appears in the card list UI
    console.log('Step 6: Verify card removed from UI...');
    const cardStillVisible = await page.locator(`[data-testid="card-${cardId}"]`).isVisible({ timeout: 1000 }).catch(() => false);
    if (cardStillVisible) {
      console.error('ERROR: Card still visible in UI after deletion!');
      return false;
    }
    console.log('  Card no longer visible in UI. Good.');

    // Step 7: Refresh the page and verify card is still gone
    console.log('Step 7: Refresh page and verify card stays gone...');
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/f19-step7-refreshed.png', fullPage: true });
    console.log('  Screenshot: screenshots/f19-step7-refreshed.png');

    const cardAfterRefresh = await page.locator(`[data-testid="card-${cardId}"]`).isVisible({ timeout: 1000 }).catch(() => false);
    if (cardAfterRefresh) {
      console.error('ERROR: Card reappeared after page refresh! Deletion was not persisted!');
      return false;
    }
    console.log('  Card still gone after refresh. Deletion persisted.');

    // Step 8: Verify API returns 404 for the deleted card ID
    console.log('Step 8: Verify API returns 404 for deleted card...');
    const getDeletedRes = await page.evaluate(async (params) => {
      const res = await fetch(`/api/games/${params.gameId}/cards/${params.cardId}`);
      return { status: res.status, body: await res.json() };
    }, { gameId, cardId });
    console.log(`  API response: status=${getDeletedRes.status}, body=${JSON.stringify(getDeletedRes.body)}`);

    if (getDeletedRes.status !== 404) {
      console.error(`ERROR: Expected 404 for deleted card, got ${getDeletedRes.status}`);
      return false;
    }
    console.log('  API correctly returns 404 for deleted card.');

    // Step 9: Verify card is also gone from cards list API
    console.log('Step 9: Verify card gone from cards list API...');
    const cardsListAfter = await page.evaluate(async (gid) => {
      const res = await fetch(`/api/games/${gid}/cards`);
      return await res.json();
    }, gameId);
    console.log(`  Cards in list after deletion: ${cardsListAfter.length}`);
    const deletedCardInList = cardsListAfter.find(c => c.id === cardId);
    if (deletedCardInList) {
      console.error('ERROR: Deleted card still appears in cards list API!');
      return false;
    }
    console.log('  Card removed from cards list API. All clear.');

    // Check console errors
    const filteredErrors = consoleErrors.filter(e => !e.includes('favicon'));
    if (filteredErrors.length > 0) {
      console.log('\nConsole errors detected:');
      filteredErrors.forEach(e => console.log('  -', e));
    } else {
      console.log('\nNo console errors detected.');
    }

    console.log('\n=== Feature #19: PASSED ===');
    return true;

  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: 'screenshots/f19-error.png', fullPage: true });
    return false;
  } finally {
    // Cleanup: Delete test game
    if (gameId) {
      try {
        await page.evaluate(async (gid) => {
          await fetch(`/api/games/${gid}`, { method: 'DELETE' });
        }, gameId);
        console.log(`Cleaned up test game: ${gameId}`);
      } catch (e) {
        console.log('Cleanup warning:', e.message);
      }
    }
    await browser.close();
  }
}

test().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
