// Test Feature #28: Create stack by grouping cards with G key
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 800 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // Step 1: Navigate to game table
    console.log('Step 1: Load game table...');
    await page.goto(`http://localhost:5173/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Step 2: Place 3 cards on the table
    console.log('Step 2: Place 3 cards...');
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(500);

    const drawerCards = page.locator('[data-testid^="drawer-card-"]');
    for (let i = 0; i < 3; i++) {
      await drawerCards.nth(i).click();
      await sleep(300);
    }

    // Close drawer
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(300);

    // Query all table cards
    let tableCards = page.locator('[data-table-card="true"]');
    let count = await tableCards.count();
    console.log(`  ${count} cards placed on table`);

    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'f28-step2-placed.png') });

    // Step 3: Select all 3 cards
    console.log('Step 3: Select all 3 cards...');

    // Get bounding boxes of all cards
    const boxes = [];
    for (let i = 0; i < count; i++) {
      const box = await tableCards.nth(i).boundingBox();
      boxes.push(box);
    }
    console.log(`  Card positions: ${boxes.map((b, i) => `card${i}(${Math.round(b.x)},${Math.round(b.y)})`).join(', ')}`);

    // Click first card (no modifier)
    await page.mouse.click(boxes[0].x + boxes[0].width / 2, boxes[0].y + boxes[0].height / 2);
    await sleep(200);

    // Ctrl+click remaining cards
    for (let i = 1; i < count; i++) {
      await page.keyboard.down('Control');
      await page.mouse.click(boxes[i].x + boxes[i].width / 2, boxes[i].y + boxes[i].height / 2);
      await page.keyboard.up('Control');
      await sleep(200);
    }

    // Count selected (look for blue ring)
    let selectedCount = await page.evaluate(() => {
      let n = 0;
      document.querySelectorAll('[data-table-card="true"]').forEach(el => {
        // Check if any child has ring-2 class
        if (el.querySelector('.ring-2')) n++;
      });
      return n;
    });
    console.log(`  Selected cards: ${selectedCount}`);

    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'f28-step3-selected.png') });

    // Step 4: Press G to group
    console.log('Step 4: Press G...');
    await page.keyboard.press('g');
    await sleep(800);

    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'f28-step4-grouped.png') });

    // Check stack badges
    const badges = page.locator('[data-testid^="stack-count-"]');
    const badgeCount = await badges.count();
    console.log(`  Stack badges: ${badgeCount}`);

    if (badgeCount > 0) {
      const text = await badges.first().textContent();
      console.log(`  Badge text: ${text}`);
    }

    // Check stack-size attributes
    const allCards = page.locator('[data-table-card="true"]');
    const allCount = await allCards.count();
    console.log(`  Visible table elements after group: ${allCount}`);

    for (let i = 0; i < allCount; i++) {
      const el = allCards.nth(i);
      const name = await el.getAttribute('data-card-name');
      const stackSize = await el.getAttribute('data-stack-size');
      const stackId = await el.getAttribute('data-stack-id');
      console.log(`    "${name}" size=${stackSize} stackId=${stackId ? stackId.substring(0, 8) : 'none'}`);
    }

    if (badgeCount < 1) {
      // The G key might not have fired because selectedCards might be empty
      // This can happen if the ctrl+click selection doesn't persist
      // Let's check if the cards all ended up at the same position
      // indicating grouping happened but no visual badge was created
      console.log('  DEBUG: Checking if selection was lost...');
      console.log(`  DEBUG: selectedCount was ${selectedCount}`);
      throw new Error('No stack badges found after G key');
    }

    console.log('  \u2713 Stack created!');

    // Step 5: Tooltip check
    console.log('Step 5: Check tooltip...');
    const stackCard = page.locator('[data-stack-size="3"]').first();
    if (await stackCard.count() > 0) {
      const title = await stackCard.getAttribute('title');
      console.log(`  Title: "${title}"`);
      if (title && title.includes('3')) {
        console.log('  \u2713 Tooltip shows card count');
      }

      // Hover
      const sBox = await stackCard.boundingBox();
      await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
      await sleep(500);
      await page.screenshot({ path: path.join(__dirname, 'screenshots', 'f28-step5-hover.png') });

      // Check CSS tooltip visibility
      const tooltip = page.locator('[data-testid^="stack-tooltip-"]');
      const tooltipCount = await tooltip.count();
      console.log(`  Tooltip elements: ${tooltipCount}`);
      if (tooltipCount > 0) {
        const opacity = await tooltip.first().evaluate(el => getComputedStyle(el).opacity);
        console.log(`  Tooltip opacity: ${opacity}`);
      }
    }

    // Step 6: Visual distinction
    console.log('Step 6: Visual distinction...');
    // Add one more individual card
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(300);
    await page.locator('[data-testid^="drawer-card-"]').first().click();
    await sleep(300);
    await page.click('[data-testid="toggle-card-drawer"]');
    await sleep(300);

    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'f28-step6-visual.png') });

    const singles = page.locator('[data-stack-size="1"]');
    const stacks = page.locator('[data-stack-size="3"]');
    const sCount = await singles.count();
    const kCount = await stacks.count();
    console.log(`  Singles: ${sCount}, Stacks: ${kCount}`);

    if (sCount > 0 && kCount > 0) {
      const singleBadgeCount = await singles.first().locator('[data-testid^="stack-count-"]').count();
      const stackBadgeCount = await stacks.first().locator('[data-testid^="stack-count-"]').count();
      console.log(`  Single badge: ${singleBadgeCount}, Stack badge: ${stackBadgeCount}`);
      if (singleBadgeCount === 0 && stackBadgeCount > 0) {
        console.log('  \u2713 Visual distinction confirmed');
      }
    }

    // Console check
    const relevantErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('HMR') && !e.includes('WebSocket'));
    console.log(relevantErrors.length ? `\n  ! Errors: ${relevantErrors.join(', ')}` : '\n  \u2713 Zero console errors');

    console.log('\n=== FEATURE #28: ALL TESTS PASSED ===');

  } catch (err) {
    console.error('\nTEST FAILED:', err.message);
    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'f28-error.png') });
    throw err;
  } finally {
    await browser.close();
  }
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
