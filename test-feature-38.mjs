// Feature #38: Create and load game setups - Verification Test
// Tests: GameDetail setups panel, setup creation, setup loading, setup editing
import { chromium } from 'playwright';

const GAME_ID = 'e274dc0a-e3a9-4272-9d12-b4ef044c1d27';
const SETUP_ID = 'a049aec5-126f-46e8-beac-d88b53998f7f';
const BASE = 'http://localhost:5173';

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
  await page.screenshot({ path: `screenshots/f38-${name}.png`, fullPage: true });
  console.log(`  Screenshot: f38-${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // STEP 1: Navigate to game detail page and verify setups section
    console.log('Step 1: Verify setups section on game detail page');
    await page.goto(`${BASE}/games/${GAME_ID}`);
    await delay(2000);

    const setupsSection = await page.locator('[data-testid="setups-section"]');
    const setupsSectionVisible = await setupsSection.isVisible();
    console.log(`  Setups section visible: ${setupsSectionVisible}`);

    // Verify Create Setup button exists
    const createSetupBtn = await page.locator('[data-testid="create-setup-btn"]');
    const createBtnVisible = await createSetupBtn.isVisible();
    console.log(`  Create Setup button visible: ${createBtnVisible}`);

    // Verify the pre-created "Standard Start" setup appears
    const setupsList = await page.locator('[data-testid="setups-list"]');
    const setupsListVisible = await setupsList.isVisible();
    console.log(`  Setups list visible: ${setupsListVisible}`);

    const setupItem = await page.locator(`[data-testid="setup-item-${SETUP_ID}"]`);
    const setupItemVisible = await setupItem.isVisible();
    console.log(`  Standard Start setup visible: ${setupItemVisible}`);

    const setupName = await page.locator(`[data-testid="setup-name-${SETUP_ID}"]`).textContent();
    console.log(`  Setup name: "${setupName}"`);

    // Verify Load, Edit, Delete buttons
    const loadBtn = await page.locator(`[data-testid="setup-load-btn-${SETUP_ID}"]`);
    const editBtn = await page.locator(`[data-testid="setup-edit-btn-${SETUP_ID}"]`);
    const deleteBtn = await page.locator(`[data-testid="setup-delete-btn-${SETUP_ID}"]`);
    console.log(`  Load button visible: ${await loadBtn.isVisible()}`);
    console.log(`  Edit button visible: ${await editBtn.isVisible()}`);
    console.log(`  Delete button visible: ${await deleteBtn.isVisible()}`);

    await screenshot(page, 'step1-detail');

    // STEP 2: Load the setup to start a game session
    console.log('\nStep 2: Load setup to start a game session');
    await loadBtn.click();
    await delay(3000);

    // Should navigate to /games/:id/play?setupId=...
    const url = page.url();
    console.log(`  Current URL: ${url}`);
    const hasSetupId = url.includes(`setupId=${SETUP_ID}`);
    console.log(`  URL contains setupId: ${hasSetupId}`);

    // Verify toast message
    const toast = await page.locator('[data-testid="save-toast"]');
    let toastText = '';
    try {
      toastText = await toast.textContent({ timeout: 3000 });
    } catch (e) {}
    console.log(`  Toast message: "${toastText}"`);
    const hasSetupLoadToast = toastText.includes('Loaded setup');
    console.log(`  Setup load toast shown: ${hasSetupLoadToast}`);

    await screenshot(page, 'step2-loaded');

    // Verify cards, markers, counters are present from setup
    // Check for the card on table
    await delay(1000);
    const tableCards = await page.locator('.card-on-table, [data-testid^="table-card-"]').count();
    console.log(`  Table cards found: ${tableCards}`);

    // Check counter with "Lives" name and value 5
    const counterText = await page.locator('text=Lives').count();
    console.log(`  "Lives" counter found: ${counterText > 0}`);

    // Check marker
    const markerText = await page.locator('text=Start').count();
    console.log(`  "Start" marker found: ${markerText > 0}`);

    // STEP 3: Navigate to setup editor mode (create new setup)
    console.log('\nStep 3: Navigate to setup editor mode');
    await page.goto(`${BASE}/games/${GAME_ID}/play?mode=setup`);
    await delay(3000);

    // Verify setup mode banner
    const setupBanner = await page.locator('[data-testid="setup-mode-banner"]');
    const bannerVisible = await setupBanner.isVisible();
    console.log(`  Setup mode banner visible: ${bannerVisible}`);

    await screenshot(page, 'step3-setupmode');

    // STEP 4: Place cards on setup editor and save as setup
    console.log('\nStep 4: Place cards and save as new setup');

    // Open card drawer to place cards
    const cardDrawerBtn = await page.locator('[data-testid="toolbar-cards-btn"]');
    if (await cardDrawerBtn.isVisible()) {
      await cardDrawerBtn.click();
      await delay(1000);
    }

    // Try to place a card from the drawer
    const drawerCards = await page.locator('[data-testid^="drawer-card-"]');
    const drawerCardCount = await drawerCards.count();
    console.log(`  Available cards in drawer: ${drawerCardCount}`);

    if (drawerCardCount > 0) {
      // Click a card to place it on the table
      await drawerCards.first().click();
      await delay(500);
    }

    // Click the Save Setup button on the banner
    const bannerSaveBtn = await page.locator('[data-testid="setup-banner-save-btn"]');
    if (await bannerSaveBtn.isVisible()) {
      await bannerSaveBtn.click();
      await delay(500);
    }

    // Verify Setup Save Modal appears
    const setupSaveModal = await page.locator('[data-testid="setup-save-modal"]');
    const modalVisible = await setupSaveModal.isVisible();
    console.log(`  Setup save modal visible: ${modalVisible}`);

    await screenshot(page, 'step4-savemodal');

    // Enter setup name and save
    const setupNameInput = await page.locator('[data-testid="setup-name-input"]');
    await setupNameInput.fill('My Custom Setup');
    await delay(300);

    const confirmBtn = await page.locator('[data-testid="setup-save-confirm-btn"]');
    await confirmBtn.click();
    await delay(2000);

    // Verify save toast
    let saveToastText = '';
    try {
      const saveToast = await page.locator('[data-testid="save-toast"]');
      saveToastText = await saveToast.textContent({ timeout: 3000 });
    } catch (e) {}
    console.log(`  Save toast: "${saveToastText}"`);
    const setupSaved = saveToastText.includes('Setup') && saveToastText.includes('saved');
    console.log(`  Setup saved successfully: ${setupSaved}`);

    await screenshot(page, 'step4-saved');

    // STEP 5: Go back to game detail and verify new setup appears
    console.log('\nStep 5: Verify new setup appears in game detail');
    await page.goto(`${BASE}/games/${GAME_ID}`);
    await delay(2000);

    const setupItems = await page.locator('[data-testid^="setup-item-"]');
    const setupCount = await setupItems.count();
    console.log(`  Total setups in list: ${setupCount}`);

    // Check if "My Custom Setup" is in the list
    const pageContent = await page.textContent('body');
    const hasCustomSetup = pageContent.includes('My Custom Setup');
    console.log(`  "My Custom Setup" appears: ${hasCustomSetup}`);

    // Also check Standard Start is still there
    const hasStandardStart = pageContent.includes('Standard Start');
    console.log(`  "Standard Start" still present: ${hasStandardStart}`);

    await screenshot(page, 'step5-bothsetups');

    // STEP 6: Edit the existing setup
    console.log('\nStep 6: Edit existing setup');
    const editSetupBtn = await page.locator(`[data-testid="setup-edit-btn-${SETUP_ID}"]`);
    if (await editSetupBtn.isVisible()) {
      await editSetupBtn.click();
      await delay(3000);

      const editUrl = page.url();
      console.log(`  Edit URL: ${editUrl}`);
      const hasEditParams = editUrl.includes('mode=setup') && editUrl.includes('editSetupId=');
      console.log(`  URL has edit params: ${hasEditParams}`);

      // Verify banner shows editing mode
      const editBanner = await page.locator('[data-testid="setup-mode-banner"]');
      if (await editBanner.isVisible()) {
        const bannerText = await editBanner.textContent();
        console.log(`  Banner text: "${bannerText}"`);
        const showsEditing = bannerText.includes('Editing') || bannerText.includes('Standard Start');
        console.log(`  Shows editing mode: ${showsEditing}`);
      }

      await screenshot(page, 'step6-editing');
    }

    // STEP 7: Verify setup can be deleted
    console.log('\nStep 7: Verify setup deletion');
    await page.goto(`${BASE}/games/${GAME_ID}`);
    await delay(2000);

    // Get setup count before deletion
    const setupsBefore = await page.locator('[data-testid^="setup-item-"]').count();
    console.log(`  Setups before delete: ${setupsBefore}`);

    // Find and delete "My Custom Setup"
    // Get all setup items and find the one that's not the Standard Start
    const allSetupItems = await page.locator('[data-testid^="setup-item-"]').all();
    let deletedCustom = false;
    for (const item of allSetupItems) {
      const text = await item.textContent();
      if (text.includes('My Custom Setup')) {
        // Find the delete button within this item
        const delBtn = item.locator('[data-testid^="setup-delete-btn-"]');
        if (await delBtn.isVisible()) {
          // Listen for dialog
          page.once('dialog', dialog => dialog.accept());
          await delBtn.click();
          await delay(1000);
          deletedCustom = true;
          break;
        }
      }
    }
    console.log(`  Deleted "My Custom Setup": ${deletedCustom}`);

    await delay(1000);
    const setupsAfter = await page.locator('[data-testid^="setup-item-"]').count();
    console.log(`  Setups after delete: ${setupsAfter}`);
    console.log(`  Delete reduced count: ${setupsAfter < setupsBefore}`);

    await screenshot(page, 'step7-afterdelete');

    // STEP 8: Verify data persists after page refresh
    console.log('\nStep 8: Verify persistence after refresh');
    await page.reload();
    await delay(2000);

    const setupsAfterRefresh = await page.locator('[data-testid^="setup-item-"]').count();
    console.log(`  Setups after refresh: ${setupsAfterRefresh}`);

    const bodyAfterRefresh = await page.textContent('body');
    const standardStartPersists = bodyAfterRefresh.includes('Standard Start');
    console.log(`  "Standard Start" persists after refresh: ${standardStartPersists}`);

    await screenshot(page, 'step8-persisted');

    // Summary
    console.log('\n=== RESULTS ===');
    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(e => console.log(`  ERROR: ${e}`));
    }

    const allPassed =
      setupsSectionVisible &&
      createBtnVisible &&
      setupsListVisible &&
      setupItemVisible &&
      setupName === 'Standard Start' &&
      hasSetupId &&
      bannerVisible &&
      modalVisible &&
      setupCount >= 2 &&
      hasCustomSetup &&
      hasStandardStart &&
      standardStartPersists;

    console.log(`\nAll checks passed: ${allPassed}`);

  } catch (err) {
    console.error('Test failed:', err.message);
    await screenshot(page, 'error');
  } finally {
    await browser.close();
  }
})();
