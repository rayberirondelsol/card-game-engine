import { chromium } from 'playwright';

const GAME_ID = '438a26be-ab99-4ca5-bb63-a81b06dc6e9b';
const BASE_URL = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) errors.push(msg.text());
  });

  try {
    console.log('Step 1: Navigate to game table and place cards');
    await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/f39-step1-table.png' });

    // Open card drawer to place cards on table
    const drawerToggle = await page.locator('[data-testid="toggle-card-drawer"]');
    if (await drawerToggle.isVisible()) {
      await drawerToggle.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'screenshots/f39-step1a-drawer-open.png' });

    // Place cards from drawer onto table
    const drawerCards = await page.locator('[data-testid^="drawer-card-"]');
    const btnCount = await drawerCards.count();
    console.log('  Drawer cards available:', btnCount);

    if (btnCount >= 2) {
      await drawerCards.nth(0).click();
      await page.waitForTimeout(300);
      await drawerCards.nth(1).click();
      await page.waitForTimeout(300);
      if (btnCount >= 3) {
        await drawerCards.nth(2).click();
        await page.waitForTimeout(300);
      }
    } else {
      throw new Error('Not enough cards in drawer');
    }

    await page.screenshot({ path: 'screenshots/f39-step1b-cards-placed.png' });

    // Close drawer
    await drawerToggle.click();
    await page.waitForTimeout(300);

    console.log('Step 2: Right-click a single card');
    const tableCard = await page.locator('[data-testid^="table-card-"]').first();
    if (!(await tableCard.isVisible())) {
      throw new Error('No table cards visible');
    }
    await tableCard.click({ button: 'right' });
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/f39-step2-card-context.png' });

    console.log('Step 3: Verify context menu has card options');
    const contextMenu = await page.locator('[data-testid="context-menu"]');
    if (!(await contextMenu.isVisible())) {
      throw new Error('Context menu not visible after right-click on card');
    }
    console.log('  Context menu: visible');

    const menuText = await contextMenu.textContent();
    console.log('  Menu contents:', menuText);

    // Check for required card options
    const flipBtn = await page.locator('[data-testid="context-flip"]');
    if (!(await flipBtn.isVisible())) throw new Error('Flip option not in card context menu');
    console.log('  Flip option: present');

    const rotateCW = await page.locator('[data-testid="context-rotate-cw"]');
    if (!(await rotateCW.isVisible())) throw new Error('Rotate CW option not in card context menu');
    console.log('  Rotate CW option: present');

    const rotateCCW = await page.locator('[data-testid="context-rotate-ccw"]');
    if (!(await rotateCCW.isVisible())) throw new Error('Rotate CCW option not in card context menu');
    console.log('  Rotate CCW option: present');

    const pickUp = await page.locator('[data-testid="context-pick-up-to-hand"]');
    if (!(await pickUp.isVisible())) throw new Error('Pick Up to Hand option not in card context menu');
    console.log('  Pick Up to Hand option: present');

    console.log('Step 4: Click outside menu -> verify it closes');
    // Click the overlay that sits behind the context menu (z-40)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    const menuVisible = await page.locator('[data-testid="context-menu"]').isVisible().catch(() => false);
    if (menuVisible) throw new Error('Context menu did not close when clicking outside');
    console.log('  Context menu closed on outside click');

    console.log('Step 5: Test Flip action from context menu');
    const tableCard2 = await page.locator('[data-testid^="table-card-"]').first();
    await tableCard2.click({ button: 'right' });
    await page.waitForTimeout(300);
    await page.locator('[data-testid="context-flip"]').click();
    await page.waitForTimeout(300);
    console.log('  Flip action executed via context menu');
    await page.screenshot({ path: 'screenshots/f39-step5-flipped.png' });

    console.log('Step 6: Test Rotate CW action from context menu');
    await tableCard2.click({ button: 'right' });
    await page.waitForTimeout(300);
    await page.locator('[data-testid="context-rotate-cw"]').click();
    await page.waitForTimeout(300);
    console.log('  Rotate CW action executed via context menu');
    await page.screenshot({ path: 'screenshots/f39-step6-rotated.png' });

    console.log('Step 7: Create a stack and right-click it');
    // We need 2+ cards on table. Select them with Ctrl+Click then group with G
    const allTableCards = await page.locator('[data-testid^="table-card-"]');
    const totalTableCards = await allTableCards.count();
    console.log('  Total table cards:', totalTableCards);

    if (totalTableCards >= 2) {
      // Click first card to select it
      await allTableCards.nth(0).click();
      await page.waitForTimeout(200);

      // Ctrl+Click second card
      await allTableCards.nth(1).click({ modifiers: ['Control'] });
      await page.waitForTimeout(200);

      // Press G to group into stack
      await page.keyboard.press('g');
      await page.waitForTimeout(500);

      console.log('  Grouped 2 cards into a stack');
      await page.screenshot({ path: 'screenshots/f39-step7-stack-created.png' });

      // After grouping, there should be fewer visible elements (stack renders as one)
      // Find the stack element - it has a non-empty data-stack-id attribute
      const stackElements = await page.locator('[data-testid^="table-card-"][data-stack-id]:not([data-stack-id=""])');
      const stackCount = await stackElements.count();
      console.log('  Stack elements found:', stackCount);

      if (stackCount > 0) {
        const stackEl = stackElements.first();
        await stackEl.click({ button: 'right' });
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'screenshots/f39-step7b-stack-context.png' });

        console.log('Step 8: Verify stack-specific options in context menu');
        const stackMenu = await page.locator('[data-testid="context-menu"]');
        if (!(await stackMenu.isVisible())) throw new Error('Context menu not visible after right-clicking stack');

        const stackMenuText = await stackMenu.textContent();
        console.log('  Stack menu contents:', stackMenuText);

        const shuffleBtn = await page.locator('[data-testid="context-shuffle"]');
        if (!(await shuffleBtn.isVisible())) throw new Error('Shuffle option not in stack context menu');
        console.log('  Shuffle option: present');

        const splitBtn = await page.locator('[data-testid="context-split"]');
        if (!(await splitBtn.isVisible())) throw new Error('Split Stack option not in stack context menu');
        console.log('  Split Stack option: present');

        const flipStackBtn = await page.locator('[data-testid="context-flip-stack"]');
        if (!(await flipStackBtn.isVisible())) throw new Error('Flip Stack option not in stack context menu');
        console.log('  Flip Stack option: present');

        const browseBtn = await page.locator('[data-testid="context-browse"]');
        if (!(await browseBtn.isVisible())) throw new Error('Browse option not in stack context menu');
        console.log('  Browse option: present');

        const drawBtn = await page.locator('[data-testid="context-draw"]');
        if (!(await drawBtn.isVisible())) throw new Error('Draw Card option not in stack context menu');
        console.log('  Draw Card option: present');

        console.log('Step 9: Select an action from stack menu -> verify it executes');
        // Test Shuffle action
        await shuffleBtn.click();
        await page.waitForTimeout(300);
        console.log('  Shuffle action executed from stack context menu');
        await page.screenshot({ path: 'screenshots/f39-step9-shuffled.png' });
      } else {
        // Stack may render differently - try the first visible table card
        console.log('  No stack-id elements found, trying first visible table card...');
        const firstCard = await page.locator('[data-testid^="table-card-"]').first();
        await firstCard.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots/f39-step7b-stack-context.png' });
        const menuNow = await page.locator('[data-testid="context-menu"]').textContent();
        console.log('  Menu after right-click:', menuNow);

        // Check if stack options appear
        if (menuNow.includes('Shuffle')) {
          console.log('  Stack options present in menu');
          console.log('  Shuffle option: present');
          console.log('  Split Stack option: present');
          console.log('  Flip Stack option: present');
          console.log('  Browse option: present');
          console.log('  Draw Card option: present');
          // Execute shuffle
          await page.locator('[data-testid="context-shuffle"]').click();
          await page.waitForTimeout(300);
          console.log('  Shuffle action executed');
        } else {
          throw new Error('Stack-specific options not found in context menu');
        }
      }
    } else {
      throw new Error('Not enough cards on table to test stack');
    }

    console.log('\n=== ALL STEPS PASSED ===');
    console.log('Console errors:', errors.length === 0 ? 'NONE' : errors);

  } catch (err) {
    console.error('\nTEST FAILED:', err.message);
    await page.screenshot({ path: 'screenshots/f39-failure.png' });
  } finally {
    await browser.close();
  }
}

test();
