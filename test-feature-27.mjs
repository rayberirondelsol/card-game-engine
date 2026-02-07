// Feature #27: Hand display and card management
// Tests: pick up cards to hand, fan display, hover preview, reorder, play from hand, auto-hide

import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b'; // Drag Test Game with 3 cards
const BASE_URL = 'http://localhost:5178';

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
    console.log('Step 1: Navigate to game table');
    await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Verify game table loads
    const tableContainer = await page.locator('[data-testid="game-table-container"]');
    console.log('  Game table loaded:', await tableContainer.isVisible());

    console.log('Step 2: Open card drawer and place 3 cards on table');
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(500);

    // Place all 3 cards on table
    const drawerCards = await page.locator('[data-testid^="drawer-card-"]').all();
    console.log(`  Found ${drawerCards.length} cards in drawer`);

    for (let i = 0; i < drawerCards.length; i++) {
      await drawerCards[i].click();
      await sleep(300);
    }
    await sleep(500);

    // Close card drawer
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(300);

    // Check cards on table
    const tableCardsAll = await page.locator('[data-table-card="true"]').all();
    console.log(`  Cards on table: ${tableCardsAll.length}`);

    console.log('Step 3: Verify hand area is hidden when empty');
    const handArea = page.locator('[data-testid="hand-area"]');
    const handVisible = await handArea.isVisible().catch(() => false);
    console.log(`  Hand area visible (should be false): ${handVisible}`);

    console.log('Step 4: Right-click first card to pick up to hand');
    // Click first card to select it
    const firstCard = page.locator('[data-table-card="true"]').first();
    await firstCard.click();
    await sleep(300);

    // Right-click on the card
    await firstCard.click({ button: 'right' });
    await sleep(500);

    // Take screenshot of context menu
    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-step4-contextmenu.png' });

    // Click "Pick up to Hand"
    const pickUpBtn = page.locator('[data-testid="context-pick-up-to-hand"]');
    const pickUpVisible = await pickUpBtn.isVisible().catch(() => false);
    console.log(`  "Pick up to Hand" option visible: ${pickUpVisible}`);

    if (pickUpVisible) {
      await pickUpBtn.click();
      await sleep(500);
    }

    // Verify hand area appears with 1 card
    const handAreaAfter1 = page.locator('[data-testid="hand-area"]');
    const handVisible1 = await handAreaAfter1.isVisible().catch(() => false);
    console.log(`  Hand area visible after pick up (should be true): ${handVisible1}`);

    // Check hand card count
    const handCardsCount1 = await page.locator('[data-hand-card="true"]').count();
    console.log(`  Cards in hand: ${handCardsCount1}`);

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-step4-hand1card.png' });

    console.log('Step 5: Pick up 2 more cards to hand');
    // Pick up second card
    const secondCard = page.locator('[data-table-card="true"]').first();
    await secondCard.click();
    await sleep(200);
    await secondCard.click({ button: 'right' });
    await sleep(500);
    const pickUpBtn2 = page.locator('[data-testid="context-pick-up-to-hand"]');
    if (await pickUpBtn2.isVisible().catch(() => false)) {
      await pickUpBtn2.click();
      await sleep(500);
    }

    // Pick up third card
    const thirdCard = page.locator('[data-table-card="true"]').first();
    await thirdCard.click();
    await sleep(200);
    await thirdCard.click({ button: 'right' });
    await sleep(500);
    const pickUpBtn3 = page.locator('[data-testid="context-pick-up-to-hand"]');
    if (await pickUpBtn3.isVisible().catch(() => false)) {
      await pickUpBtn3.click();
      await sleep(500);
    }

    console.log('Step 6: Verify all 3 cards display in hand');
    const handCardsCount3 = await page.locator('[data-hand-card="true"]').count();
    console.log(`  Cards in hand (should be 3): ${handCardsCount3}`);

    // Check table should be empty
    const tableCardsRemaining = await page.locator('[data-table-card="true"]').count();
    console.log(`  Cards remaining on table (should be 0): ${tableCardsRemaining}`);

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-step6-hand3cards.png' });

    console.log('Step 7: Hover over card in hand - verify enlargement');
    const firstHandCard = page.locator('[data-hand-card="true"]').first();
    await firstHandCard.hover();
    await sleep(500);

    // Check for preview
    const preview = page.locator('[data-testid="hand-card-preview"]');
    const previewVisible = await preview.isVisible().catch(() => false);
    console.log(`  Preview/enlargement visible on hover (should be true): ${previewVisible}`);

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-step7-hover-preview.png' });

    // Move mouse away
    await page.mouse.move(100, 100);
    await sleep(300);

    console.log('Step 8: Test reorder by dragging within hand');
    // Get names of hand cards before reorder
    const handCardNames = await page.locator('[data-hand-card="true"]').evaluateAll(
      cards => cards.map(c => c.getAttribute('data-card-name'))
    );
    console.log(`  Hand card names before reorder: ${handCardNames.join(', ')}`);

    // Drag first card to last position using native drag events
    const handCardEls = await page.locator('[data-hand-card="true"]').all();
    if (handCardEls.length >= 2) {
      const firstBox = await handCardEls[0].boundingBox();
      const lastBox = await handCardEls[handCardEls.length - 1].boundingBox();

      if (firstBox && lastBox) {
        // Use drag and drop
        await handCardEls[0].dragTo(handCardEls[handCardEls.length - 1]);
        await sleep(500);

        const handCardNamesAfter = await page.locator('[data-hand-card="true"]').evaluateAll(
          cards => cards.map(c => c.getAttribute('data-card-name'))
        );
        console.log(`  Hand card names after reorder: ${handCardNamesAfter.join(', ')}`);

        const orderChanged = handCardNames[0] !== handCardNamesAfter[0] || handCardNames[handCardNames.length - 1] !== handCardNamesAfter[handCardNamesAfter.length - 1];
        console.log(`  Order changed: ${orderChanged}`);
      }
    }

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-step8-reorder.png' });

    console.log('Step 9: Play a card from hand to table');
    // Hover over first hand card to show Play button
    const handCardToPlay = page.locator('[data-hand-card="true"]').first();
    await handCardToPlay.hover();
    await sleep(500);

    // Click Play button
    const playBtn = page.locator('[data-testid^="hand-play-"]').first();
    const playBtnVisible = await playBtn.isVisible().catch(() => false);
    console.log(`  Play button visible: ${playBtnVisible}`);

    if (playBtnVisible) {
      await playBtn.click();
      await sleep(500);
    }

    // Verify card is back on table
    const tableCardsAfterPlay = await page.locator('[data-table-card="true"]').count();
    console.log(`  Cards on table after playing (should be 1): ${tableCardsAfterPlay}`);

    // Verify hand card count decreased
    const handCardsAfterPlay = await page.locator('[data-hand-card="true"]').count();
    console.log(`  Cards in hand after playing (should be 2): ${handCardsAfterPlay}`);

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-step9-played.png' });

    console.log('Step 10: Play remaining cards to empty the hand');
    // Play remaining 2 cards
    for (let i = 0; i < 2; i++) {
      const hc = page.locator('[data-hand-card="true"]').first();
      if (await hc.isVisible().catch(() => false)) {
        await hc.hover();
        await sleep(500);
        const pb = page.locator('[data-testid^="hand-play-"]').first();
        if (await pb.isVisible().catch(() => false)) {
          await pb.click();
          await sleep(500);
        }
      }
    }

    console.log('Step 11: Verify hand auto-hides when empty');
    const handCardsEmpty = await page.locator('[data-hand-card="true"]').count();
    console.log(`  Cards in hand (should be 0): ${handCardsEmpty}`);

    const handAreaHidden = page.locator('[data-testid="hand-area"]');
    const handHidden = await handAreaHidden.isVisible().catch(() => false);
    console.log(`  Hand area visible (should be false): ${handHidden}`);

    // All cards should be back on table
    const tableCardsFinal = await page.locator('[data-table-card="true"]').count();
    console.log(`  Cards on table (should be 3): ${tableCardsFinal}`);

    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-step11-handhidden.png' });

    // Summary
    console.log('\n=== FEATURE #27 TEST RESULTS ===');
    console.log(`  Hand area auto-hide (empty): ${!handHidden ? 'PASS' : 'FAIL'}`);
    console.log(`  Pick up to hand: ${handCardsCount3 === 3 ? 'PASS' : 'FAIL'}`);
    console.log(`  Hover preview: ${previewVisible ? 'PASS' : 'FAIL'}`);
    console.log(`  Play from hand: ${tableCardsAfterPlay >= 1 ? 'PASS' : 'FAIL'}`);
    console.log(`  Hand auto-hide after emptying: ${!handHidden ? 'PASS' : 'FAIL'}`);
    console.log(`  Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(`    ERROR: ${err}`));
    }

  } catch (err) {
    console.error('Test failed:', err.message);
    await page.screenshot({ path: '/c/workspace/card-game-engine/screenshots/f27-error.png' });
  } finally {
    await browser.close();
  }
}

test();
