import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('http://localhost:5173/games/69e5a3ac-33b7-4dc2-b659-e65e7e54a7d7', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('Network errors:', JSON.stringify(networkErrors, null, 2));

  await browser.close();
}

test();
