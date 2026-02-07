import { firefox } from 'playwright';

const GAME_ID = '6df4365f-ab3b-4129-a8c6-4bf224cd0f18';
const BASE_URL = 'http://localhost:5173';

async function test() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    // Step 1: Navigate to start screen
    process.stdout.write('STEP 1: Navigate to start screen\n');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-f8-step1-startscreen.png' });

    // Verify the game card is visible
    const gameCard = page.locator('text=NAV_TEST_GAME_8').first();
    const isVisible = await gameCard.isVisible();
    process.stdout.write('  Game card visible: ' + isVisible + '\n');
    if (!isVisible) throw new Error('Game card not visible on start screen');

    // Step 2: Click on the game card
    process.stdout.write('STEP 2: Click on game card\n');
    await gameCard.click();
    await page.waitForURL('**/games/' + GAME_ID, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-f8-step2-gamedetail.png' });

    // Step 3: Verify game detail screen loads with game name visible
    process.stdout.write('STEP 3: Verify game detail screen\n');
    const gameName = await page.locator('[data-testid="game-name"]').textContent();
    process.stdout.write('  Game name shown: "' + gameName + '"\n');
    if (!gameName.includes('NAV_TEST_GAME_8')) throw new Error('Game name not shown on detail page');

    // Step 4: Verify back button is present
    process.stdout.write('STEP 4: Verify back button exists\n');
    const backButton = page.locator('[data-testid="back-button"]');
    const backVisible = await backButton.isVisible();
    process.stdout.write('  Back button visible: ' + backVisible + '\n');
    if (!backVisible) throw new Error('Back button not visible');

    // Step 5: Click back button
    process.stdout.write('STEP 5: Click back button\n');
    await backButton.click();
    await page.waitForURL(BASE_URL + '/', { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-f8-step3-backtostart.png' });

    // Step 6: Verify start screen loads again with the game listed
    process.stdout.write('STEP 6: Verify start screen after navigation\n');
    const gameCardAgain = page.locator('text=NAV_TEST_GAME_8').first();
    const isVisibleAgain = await gameCardAgain.isVisible();
    process.stdout.write('  Game card visible again: ' + isVisibleAgain + '\n');
    if (!isVisibleAgain) throw new Error('Game card not visible after navigating back');

    // Check for JS errors
    const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
    if (criticalErrors.length > 0) {
      process.stdout.write('  WARNING: JS errors detected: ' + criticalErrors.join('; ') + '\n');
    }

    process.stdout.write('\nALL STEPS PASSED - Feature #8 verified!\n');

  } catch (err) {
    process.stderr.write('TEST FAILED: ' + err.message + '\n');
    await page.screenshot({ path: 'test-f8-failure.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

test();
