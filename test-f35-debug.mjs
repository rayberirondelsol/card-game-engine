import { chromium } from 'playwright';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('http://localhost:5173/games/5d0d98ba-3904-49f7-aca0-37b0ee6d7678/play', { timeout: 15000 });
  await sleep(5000);

  await page.screenshot({ path: 'screenshots/f35-debug.png' });

  console.log('Console messages:');
  logs.forEach(l => console.log('  ' + l));

  const html = await page.content();
  console.log('\nPage HTML length:', html.length);
  console.log('Has root:', html.includes('id="root"'));

  // Check for visible elements
  const body = await page.locator('body').innerHTML();
  console.log('\nBody innerHTML (first 500 chars):');
  console.log(body.substring(0, 500));

  await browser.close();
}

test().catch(console.error);
