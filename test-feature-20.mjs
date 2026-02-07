import { chromium } from 'playwright';

const GAME_ID = '69e5a3ac-33b7-4dc2-b659-e65e7e54a7d7';
const BASE_URL = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    console.log('Step 1: Navigate to game detail screen');
    await page.goto(`${BASE_URL}/games/${GAME_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Step 2: Verify top bar - game name and back button');
    const gameName = await page.locator('[data-testid="game-name"]').textContent();
    console.log('  Game name:', gameName);
    if (!gameName.includes('F20_TEST_GAME')) throw new Error('Game name not found');

    const backButton = await page.locator('[data-testid="back-button"]');
    if (!(await backButton.isVisible())) throw new Error('Back button not visible');
    console.log('  Back button: visible');

    console.log('Step 3: Verify left sidebar shows category tree');
    const sidebar = await page.locator('[data-testid="categories-sidebar"]');
    if (!(await sidebar.isVisible())) throw new Error('Categories sidebar not visible');
    console.log('  Categories sidebar: visible');

    const allCardsFilter = await page.locator('[data-testid="all-cards-filter"]');
    if (!(await allCardsFilter.isVisible())) throw new Error('All Cards filter not visible');
    console.log('  All Cards filter: visible');

    const categoryTree = await page.locator('[data-testid="category-tree"]');
    if (!(await categoryTree.isVisible())) throw new Error('Category tree not visible');
    console.log('  Category tree: visible');

    const heroesText = await categoryTree.textContent();
    console.log('  Category tree text:', heroesText);
    if (!heroesText.includes('Heroes')) throw new Error('Heroes category not in tree');
    if (!heroesText.includes('Villains')) throw new Error('Villains category not in tree');
    if (!heroesText.includes('Locations')) throw new Error('Locations category not in tree');
    console.log('  All 3 categories present in tree');

    console.log('Step 4: Verify main area shows card grid with thumbnails');
    const cardGrid = await page.locator('[data-testid="card-grid"]');
    if (!(await cardGrid.isVisible())) throw new Error('Card grid not visible');
    const cardCount = await cardGrid.locator('> div').count();
    console.log('  Card grid visible with', cardCount, 'cards');
    if (cardCount !== 3) throw new Error(`Expected 3 cards, got ${cardCount}`);

    console.log('Step 5: Verify import action buttons are accessible');
    const importBtn = await page.locator('[data-testid="import-cards-btn"]');
    if (!(await importBtn.isVisible())) throw new Error('Import button not visible');
    const importEnabled = await importBtn.isEnabled();
    if (!importEnabled) throw new Error('Import button not enabled');
    console.log('  Import Cards button: visible and enabled');

    await page.screenshot({ path: 'screenshots/f20-step5-all-cards.png' });

    console.log('Step 6: Click Heroes category -> verify grid filters');
    const heroesCategory = await page.locator('text=Heroes').first();
    await heroesCategory.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/f20-step6-heroes-filter.png' });

    const filteredCount = await page.locator('[data-testid="card-grid"] > div').count();
    console.log('  Cards after Heroes filter:', filteredCount);
    if (filteredCount !== 1) throw new Error(`Expected 1 card in Heroes, got ${filteredCount}`);

    const heroCardName = await page.locator('[data-testid="card-grid"]').textContent();
    console.log('  Filtered card contents:', heroCardName);
    if (!heroCardName.includes('test-card')) throw new Error('Heroes filter should show test-card');
    console.log('  Heroes filter shows correct card');

    console.log('Step 7: Click Villains category -> verify grid filters');
    const villainsCategory = await page.locator('text=Villains').first();
    await villainsCategory.click();
    await page.waitForTimeout(500);

    const villainsCount = await page.locator('[data-testid="card-grid"] > div').count();
    console.log('  Cards after Villains filter:', villainsCount);
    if (villainsCount !== 1) throw new Error(`Expected 1 card in Villains, got ${villainsCount}`);

    console.log('Step 8: Click Uncategorized -> verify grid shows uncategorized cards');
    const uncategorizedFilter = await page.locator('[data-testid="uncategorized-filter"]');
    await uncategorizedFilter.click();
    await page.waitForTimeout(500);

    const uncatCount = await page.locator('[data-testid="card-grid"] > div').count();
    console.log('  Cards in Uncategorized:', uncatCount);
    if (uncatCount !== 1) throw new Error(`Expected 1 uncategorized card, got ${uncatCount}`);

    console.log('Step 9: Click All Cards -> verify all cards shown again');
    const allCards = await page.locator('[data-testid="all-cards-filter"]');
    await allCards.click();
    await page.waitForTimeout(500);

    const allCount = await page.locator('[data-testid="card-grid"] > div').count();
    console.log('  Cards in All Cards:', allCount);
    if (allCount !== 3) throw new Error(`Expected 3 cards in All, got ${allCount}`);

    await page.screenshot({ path: 'screenshots/f20-step9-back-to-all.png' });

    console.log('\n=== ALL STEPS PASSED ===');
    console.log('Console errors:', errors.length === 0 ? 'NONE' : errors.join(', '));

  } catch (err) {
    console.error('\nTEST FAILED:', err.message);
    await page.screenshot({ path: 'screenshots/f20-failure.png' });
  } finally {
    await browser.close();
  }
}

test();
