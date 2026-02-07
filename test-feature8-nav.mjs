import { chromium } from 'playwright';

const GAME_ID = 'ac098640-e149-4b62-829f-3472e3f42ec7';
const GAME_NAME = 'NAV_TEST_GAME_8';

async function testNavigation() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    // Step 1: Navigate to start screen
    console.log('Step 1: Navigate to start screen...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Verify start screen loads
    const title = await page.textContent('h1');
    console.log(`  Page title: "${title}"`);
    if (!title.includes('Card Game Engine')) {
      throw new Error(`Expected title "Card Game Engine", got "${title}"`);
    }

    // Take screenshot of start screen
    await page.screenshot({ path: 'screenshots/f8-step1-startscreen.png', fullPage: true });
    console.log('  ✓ Start screen loaded');

    // Step 2: Verify the test game card is visible
    console.log('Step 2: Verify test game card is visible...');
    const gameCard = page.locator(`[data-testid="game-card-${GAME_ID}"]`);
    await gameCard.waitFor({ state: 'visible', timeout: 5000 });
    const gameCardText = await gameCard.textContent();
    console.log(`  Game card text: "${gameCardText}"`);
    if (!gameCardText.includes(GAME_NAME)) {
      throw new Error(`Game card doesn't contain "${GAME_NAME}"`);
    }
    console.log('  ✓ Test game card is visible with correct name');

    // Step 3: Click on the test game card
    console.log('Step 3: Click on the test game card...');
    await gameCard.click();

    // Wait for navigation to complete
    await page.waitForURL(`**/games/${GAME_ID}`, { timeout: 5000 });
    console.log(`  URL: ${page.url()}`);

    // Step 4: Verify game detail screen loads with game name
    console.log('Step 4: Verify game detail screen loads...');
    const gameNameEl = page.locator('[data-testid="game-name"]');
    await gameNameEl.waitFor({ state: 'visible', timeout: 5000 });
    const gameNameText = await gameNameEl.textContent();
    console.log(`  Game name: "${gameNameText}"`);
    if (gameNameText !== GAME_NAME) {
      throw new Error(`Expected game name "${GAME_NAME}", got "${gameNameText}"`);
    }

    await page.screenshot({ path: 'screenshots/f8-step4-gamedetail.png', fullPage: true });
    console.log('  ✓ Game detail screen loaded with correct game name');

    // Step 5: Verify back button is present in the top bar
    console.log('Step 5: Verify back button is present...');
    const backButton = page.locator('[data-testid="back-button"]');
    await backButton.waitFor({ state: 'visible', timeout: 5000 });
    const backButtonText = await backButton.textContent();
    console.log(`  Back button text: "${backButtonText}"`);
    if (!backButtonText.includes('Back to Games')) {
      throw new Error(`Back button text doesn't contain "Back to Games"`);
    }
    console.log('  ✓ Back button is visible in the top bar');

    // Step 6: Click back button
    console.log('Step 6: Click back button...');
    await backButton.click();

    // Wait for navigation to start screen
    await page.waitForURL('**/', { timeout: 5000 });
    console.log(`  URL: ${page.url()}`);

    // Step 7: Verify start screen loads again with the game listed
    console.log('Step 7: Verify start screen loads again...');
    await page.waitForSelector('h1', { timeout: 5000 });
    const titleAgain = await page.textContent('h1');
    console.log(`  Page title: "${titleAgain}"`);
    if (!titleAgain.includes('Card Game Engine')) {
      throw new Error(`Expected title "Card Game Engine", got "${titleAgain}"`);
    }

    // Verify the game card is still listed
    const gameCardAgain = page.locator(`[data-testid="game-card-${GAME_ID}"]`);
    await gameCardAgain.waitFor({ state: 'visible', timeout: 5000 });
    const gameCardTextAgain = await gameCardAgain.textContent();
    if (!gameCardTextAgain.includes(GAME_NAME)) {
      throw new Error(`Game card doesn't contain "${GAME_NAME}" after navigation back`);
    }

    await page.screenshot({ path: 'screenshots/f8-step7-backtostart.png', fullPage: true });
    console.log('  ✓ Start screen loaded again with game listed');

    // Check for console errors
    if (errors.length > 0) {
      console.log('\n⚠️ Console errors detected:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('\n✓ No JavaScript console errors');
    }

    console.log('\n✅ ALL NAVIGATION TESTS PASSED!');

  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message}`);
    await page.screenshot({ path: 'screenshots/f8-failure.png', fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testNavigation();
