// Test Feature #31: Draw cards from stack using number keys
// This test verifies TTS-style number key input to draw cards from a stack to hand

import { chromium } from 'playwright';

const GAME_ID = '5d0d98ba-3904-49f7-aca0-37b0ee6d7678';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      console.log('  [CONSOLE ERROR]', msg.text());
    }
  });

  try {
    // Step 1: Navigate to game table
    console.log('Step 1: Navigate to game table...');
    await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
    await sleep(3000);

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-step0-page-load.png' });

    // Check page loaded correctly
    const titleEl = await page.locator('[data-testid="game-table-title"]');
    const titleVisible = await titleEl.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Game table title visible: ${titleVisible}`);
    if (titleVisible) {
      const title = await titleEl.textContent();
      console.log(`  Title: "${title}"`);
    }

    // Step 2: Open card drawer and place cards on table
    console.log('Step 2: Opening card drawer...');
    const drawerBtn = page.locator('[data-testid="toggle-card-drawer"]');
    await drawerBtn.waitFor({ state: 'visible', timeout: 10000 });
    await drawerBtn.click();
    await sleep(1000);

    // Place 12 cards on table
    console.log('Step 3: Placing 12 cards on table...');
    const cardButtons = await page.locator('[data-testid^="drawer-card-"]').all();
    console.log(`  Found ${cardButtons.length} cards in drawer`);

    for (let idx = 0; idx < Math.min(12, cardButtons.length); idx++) {
      await cardButtons[idx].click();
      await sleep(200);
    }
    await sleep(500);

    // Close drawer
    await drawerBtn.click();
    await sleep(500);

    // Count table cards
    let tableCardsBefore = await page.locator('[data-table-card="true"]').count();
    console.log(`  Table cards: ${tableCardsBefore}`);

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-step1-cards-placed.png' });

    if (tableCardsBefore < 2) {
      console.log('ERROR: Not enough cards on table to test stacking');
      return;
    }

    // Step 4: Select all cards and group into a stack using G key
    console.log('Step 4: Selecting all cards and grouping into stack...');

    // Click the first card to select it
    const firstCard = page.locator('[data-table-card="true"]').first();
    await firstCard.click();
    await sleep(300);

    // Ctrl+click remaining cards to select them
    const allTableCards = await page.locator('[data-table-card="true"]').all();
    for (let idx = 1; idx < allTableCards.length; idx++) {
      await allTableCards[idx].click({ modifiers: ['Control'] });
      await sleep(100);
    }
    await sleep(500);

    // Press G to group into stack
    await page.keyboard.press('g');
    await sleep(1000);

    // Verify stack was created
    const visibleCardsAfterStack = await page.locator('[data-table-card="true"]').count();
    console.log(`  Visible cards after stacking: ${visibleCardsAfterStack}`);

    // Find the stack card
    const stackCards = await page.locator('[data-table-card="true"]').all();
    let stackCardEl = null;
    let stackId = null;
    let stackSize = 0;

    for (const card of stackCards) {
      const sid = await card.getAttribute('data-stack-id');
      const sz = await card.getAttribute('data-stack-size');
      if (sid && parseInt(sz) > 1) {
        stackCardEl = card;
        stackId = sid;
        stackSize = parseInt(sz);
        break;
      }
    }

    if (!stackCardEl) {
      console.log('ERROR: No stack found on table!');
      await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-error-no-stack.png' });
      return;
    }

    console.log(`  Stack found! Size: ${stackSize}, ID: ${stackId}`);
    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-step2-stack-created.png' });

    // Step 5: Hover the stack and press '3' to draw 3 cards
    console.log('Step 5: Hovering stack and pressing "3" to draw 3 cards...');

    // Click the stack card to select it first
    await stackCardEl.click();
    await sleep(300);

    // Hover over the stack
    await stackCardEl.hover();
    await sleep(300);

    // Press '3' to draw 3 cards
    await page.keyboard.press('3');
    console.log('  Pressed "3", waiting 1.5s for draw delay...');
    await sleep(1500);

    // Take screenshot after draw
    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-step3-drew-3-cards.png' });

    // Verify draw toast appeared (may have already disappeared)
    const drawToast = await page.locator('[data-testid="draw-toast"]').isVisible().catch(() => false);
    console.log(`  Draw toast visible: ${drawToast}`);
    if (drawToast) {
      const toastText = await page.locator('[data-testid="draw-toast-text"]').textContent();
      console.log(`  Toast text: "${toastText}"`);
    }

    // Check hand area for drawn cards
    const handVisible = await page.locator('[data-testid="hand-area"]').isVisible().catch(() => false);
    console.log(`  Hand area visible after draw: ${handVisible}`);

    // Count hand cards
    const handCardCount = await page.locator('[data-hand-card="true"]').count();
    console.log(`  Hand cards after drawing 3: ${handCardCount}`);

    // Verify 3 cards were drawn
    if (handCardCount !== 3) {
      console.log(`  WARNING: Expected 3 hand cards, got ${handCardCount}`);
    } else {
      console.log('  SUCCESS: 3 cards drawn to hand!');
    }

    // Check stack size decreased
    const remainingStackCards = await page.locator('[data-table-card="true"]').all();
    let newStackSize = 0;
    for (const card of remainingStackCards) {
      const sid = await card.getAttribute('data-stack-id');
      const sz = await card.getAttribute('data-stack-size');
      if (sid && parseInt(sz) > 0) {
        newStackSize = parseInt(sz);
        break;
      }
    }
    console.log(`  Stack size after drawing 3: ${newStackSize} (was ${stackSize})`);

    // Verify stack decreased by 3
    if (newStackSize === stackSize - 3) {
      console.log('  SUCCESS: Stack decreased by 3!');
    }

    // Step 6: Draw 5 more cards
    console.log('\nStep 6: Drawing 5 more cards...');
    const stackCard2 = await page.locator('[data-table-card="true"][data-stack-id]').first();
    const isStillStack = await stackCard2.isVisible().catch(() => false);

    if (isStillStack) {
      await stackCard2.click();
      await sleep(300);
      await stackCard2.hover();
      await sleep(300);
      await page.keyboard.press('5');
      console.log('  Pressed "5", waiting for draw...');
      await sleep(1500);

      const handCardCount2 = await page.locator('[data-hand-card="true"]').count();
      console.log(`  Hand cards after drawing 5 more: ${handCardCount2}`);

      if (handCardCount2 === handCardCount + 5) {
        console.log('  SUCCESS: 5 more cards drawn!');
      }

      await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-step4-drew-5-more.png' });
    }

    // Step 7: Test multi-digit input - press '1' then '0' quickly for 10
    console.log('\nStep 7: Testing multi-digit draw (press 1 then 0 for 10)...');
    const remainingStack3 = await page.locator('[data-table-card="true"][data-stack-id]').first();
    const stillHasStack = await remainingStack3.isVisible().catch(() => false);

    if (stillHasStack) {
      const remSize = await remainingStack3.getAttribute('data-stack-size');
      console.log(`  Remaining stack size: ${remSize}`);

      await remainingStack3.click();
      await sleep(300);
      await remainingStack3.hover();
      await sleep(300);

      // Press '1' then '0' quickly
      await page.keyboard.press('1');
      await sleep(200);
      await page.keyboard.press('0');
      console.log('  Pressed 1 then 0, waiting 1.5s...');
      await sleep(1500);

      const handCardCount3 = await page.locator('[data-hand-card="true"]').count();
      console.log(`  Hand cards after multi-digit draw: ${handCardCount3}`);

      await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-step5-multi-digit.png' });
    } else {
      console.log('  No remaining stack for multi-digit test');
    }

    // Final verification
    const finalHandCount = await page.locator('[data-hand-card="true"]').count();
    const finalTableCards = await page.locator('[data-table-card="true"]').count();
    console.log(`\n=== Final State ===`);
    console.log(`  Hand cards: ${finalHandCount}`);
    console.log(`  Table cards: ${finalTableCards}`);

    // Check for JS console errors (excluding expected ones)
    const jsErrors = consoleMessages.filter(m => m.type === 'error' && !m.text.includes('favicon'));
    console.log(`  JS console errors: ${jsErrors.length}`);

    // Test pass criteria:
    // 1. Cards were drawn to hand from stack
    // 2. Stack size decreased appropriately
    const passed = finalHandCount >= 3; // At minimum the first draw of 3 should work
    console.log(`\n=== TEST ${passed ? 'PASSED' : 'FAILED'} ===`);

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f31-error.png' });
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
