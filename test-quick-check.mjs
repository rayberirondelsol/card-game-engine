import { chromium } from 'playwright';

async function quickCheck() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:5173/games/438a26be-ab99-4ca5-bb63-a81b06dc6e9b/table', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'screenshots/f26-quickcheck.png' });

  const body = await page.textContent('body');
  console.log('Body text (first 500):', body.substring(0, 500));

  const errors = consoleMessages.filter(m => m.type === 'error');
  console.log('Console errors:', errors.length);
  errors.forEach(e => console.log('  ERROR:', e.text));

  // Check for our testid
  const container = await page.$('[data-testid="game-table-container"]');
  console.log('Game table container found:', !!container);

  const loading = await page.$('text=Loading game table');
  console.log('Loading text found:', !!loading);

  await browser.close();
}

quickCheck().catch(console.error);
