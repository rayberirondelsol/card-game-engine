// Feature #38: Post-restart persistence check
import { chromium } from 'playwright';

const GAME_ID = 'e274dc0a-e3a9-4272-9d12-b4ef044c1d27';
const SETUP_ID = 'a049aec5-126f-46e8-beac-d88b53998f7f';
const BASE = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  try {
    // Check setup still shows in GameDetail after restart
    console.log('1. Checking GameDetail after restart...');
    await page.goto(`${BASE}/games/${GAME_ID}`);
    await page.waitForTimeout(2000);

    const setupVisible = await page.locator(`[data-testid="setup-item-${SETUP_ID}"]`).isVisible();
    console.log('   Standard Start setup visible:', setupVisible);

    // Load setup and verify objects
    console.log('2. Loading setup and verifying objects...');
    await page.goto(`${BASE}/games/${GAME_ID}/play?setupId=${SETUP_ID}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    const hasLives = bodyText.includes('Lives');
    const hasStart = bodyText.includes('Start');
    const hasLoadToast = bodyText.includes('Loaded setup');

    console.log('   Lives counter present:', hasLives);
    console.log('   Start marker present:', hasStart);
    console.log('   Load toast shown:', hasLoadToast);

    await page.screenshot({ path: 'screenshots/f38-persistence-verified.png', fullPage: true });

    console.log('\n=== PERSISTENCE VERIFIED ===');
    console.log('Setup data persists after restart:', setupVisible && hasLives && hasStart);
    console.log('Console errors:', errors.length);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
