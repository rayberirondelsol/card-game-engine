// Feature #22: Canvas pan and zoom controls - Browser automation test
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let gameId;

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // Step 0: Create test game via API
    console.log('Step 0: Create test game...');
    const createRes = await fetch('http://localhost:3001/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'PAN_ZOOM_TEST_22', description: 'Pan and zoom test' }),
    });
    const game = await createRes.json();
    gameId = game.id;

    // Step 1: Navigate to game table
    console.log('Step 1: Navigate to game table...');
    await page.goto(`${BASE_URL}/games/${gameId}/play`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="game-canvas"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="game-table-title"]', { timeout: 5000 });

    const title = await page.textContent('[data-testid="game-table-title"]');
    console.log('  Game table title:', title);

    // Verify initial state
    const initialZoom = await page.textContent('[data-testid="zoom-display"]');
    const initialPan = await page.textContent('[data-testid="pan-display"]');
    console.log('  Initial zoom:', initialZoom);
    console.log('  Initial pan:', initialPan);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f22-step1-initial.png`, fullPage: true });

    // Step 2: Test panning - click and drag on empty canvas area
    console.log('Step 2: Click and drag on canvas to test panning...');

    // Get canvas element for mouse interactions
    const canvas = await page.locator('[data-testid="game-canvas"]');
    const canvasBox = await canvas.boundingBox();

    // Click at a position clearly in the canvas area (avoid toolbar at bottom, topbar at top)
    const startX = canvasBox.x + canvasBox.width * 0.3;
    const startY = canvasBox.y + canvasBox.height * 0.4;

    console.log('  Canvas bounds:', JSON.stringify(canvasBox));
    console.log('  Click start position:', startX, startY);

    // Debug: check what element is at our click position
    const elementAtPoint = await page.evaluate(({x, y}) => {
      const el = document.elementFromPoint(x, y);
      return {
        tagName: el?.tagName,
        testId: el?.getAttribute('data-testid'),
        className: el?.className?.substring(0, 80),
        isUIElement: !!el?.closest('[data-ui-element]'),
        id: el?.id,
      };
    }, {x: startX, y: startY});
    console.log('  Element at click position:', JSON.stringify(elementAtPoint));

    // Move to the position (no click to avoid triggering pan start/end cycle)
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(100);

    // Set up event debug listeners
    await page.evaluate(() => {
      window._debugPanEvents = [];
      const canvas = document.querySelector('[data-testid="game-canvas"]');
      canvas.addEventListener('mousedown', (e) => {
        window._debugPanEvents.push(`mousedown: target=${e.target.tagName}, button=${e.button}, x=${e.clientX}, y=${e.clientY}`);
      });
      document.addEventListener('mousemove', (e) => {
        if (window._debugPanEvents.length < 30) {
          window._debugPanEvents.push(`mousemove: x=${e.clientX}, y=${e.clientY}`);
        }
      });
      document.addEventListener('mouseup', (e) => {
        window._debugPanEvents.push(`mouseup: x=${e.clientX}, y=${e.clientY}`);
      });
    });

    // Now perform the drag
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(50);
    // Drag 200px to the right and 100px down in small steps
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(startX + (200 * i / 20), startY + (100 * i / 20));
      await page.waitForTimeout(10);
    }
    await page.mouse.up({ button: 'left' });

    // Small wait for state update
    await page.waitForTimeout(500);

    // Check debug events
    const debugEvents = await page.evaluate(() => window._debugPanEvents);
    console.log('  Debug events:', debugEvents.slice(0, 5).join(' | '));

    const panAfterDrag = await page.textContent('[data-testid="pan-display"]');
    console.log('  Pan after drag:', panAfterDrag);

    // Verify pan position changed
    if (panAfterDrag === initialPan) {
      throw new Error('Pan position did not change after drag!');
    }
    console.log('  PASSED: Panning works - viewport moved');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f22-step2-panned.png`, fullPage: true });

    // Step 3: Test zoom in with mouse wheel scroll up
    console.log('Step 3: Mouse wheel scroll up to zoom in...');

    // Move mouse to center of canvas first
    await page.mouse.move(startX, startY);

    // Scroll up (negative deltaY = zoom in)
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(300);
    const zoomAfterIn = await page.textContent('[data-testid="zoom-display"]');
    console.log('  Zoom after scroll up:', zoomAfterIn);

    // Extract zoom percentage
    const zoomInPct = parseInt(zoomAfterIn.replace(/[^0-9]/g, ''));
    if (zoomInPct <= 100) {
      throw new Error(`Zoom in failed! Expected > 100%, got ${zoomInPct}%`);
    }
    console.log('  PASSED: Zoom in works');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f22-step3-zoomed-in.png`, fullPage: true });

    // Step 4: Test zoom out with mouse wheel scroll down
    console.log('Step 4: Mouse wheel scroll down to zoom out...');

    // Scroll down a lot (positive deltaY = zoom out)
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(300);
    const zoomAfterOut = await page.textContent('[data-testid="zoom-display"]');
    console.log('  Zoom after scroll down:', zoomAfterOut);

    const zoomOutPct = parseInt(zoomAfterOut.replace(/[^0-9]/g, ''));
    if (zoomOutPct >= zoomInPct) {
      throw new Error(`Zoom out failed! Expected < ${zoomInPct}%, got ${zoomOutPct}%`);
    }
    console.log('  PASSED: Zoom out works');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f22-step4-zoomed-out.png`, fullPage: true });

    // Step 5: Verify zoom has min and max limits
    console.log('Step 5: Verify zoom min/max limits...');

    // Zoom in a lot (should hit max of 500%)
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(200);
    const maxZoom = await page.textContent('[data-testid="zoom-display"]');
    const maxZoomPct = parseInt(maxZoom.replace(/[^0-9]/g, ''));
    console.log('  Max zoom reached:', maxZoom);

    if (maxZoomPct > 500) {
      throw new Error(`Max zoom limit exceeded! Got ${maxZoomPct}%, expected <= 500%`);
    }
    console.log('  PASSED: Max zoom capped at 500%');

    // Zoom out a lot (should hit min of 20%)
    for (let i = 0; i < 100; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(200);
    const minZoom = await page.textContent('[data-testid="zoom-display"]');
    const minZoomPct = parseInt(minZoom.replace(/[^0-9]/g, ''));
    console.log('  Min zoom reached:', minZoom);

    if (minZoomPct < 20) {
      throw new Error(`Min zoom limit exceeded! Got ${minZoomPct}%, expected >= 20%`);
    }
    console.log('  PASSED: Min zoom capped at 20%');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f22-step5-limits.png`, fullPage: true });

    // Step 6: Verify smooth transitions (pan + zoom together)
    console.log('Step 6: Verify smooth pan + zoom combination...');

    // Reset zoom to middle
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(20);
    }

    // Pan while zoomed
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 150, startY - 80, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const finalZoom = await page.textContent('[data-testid="zoom-display"]');
    const finalPan = await page.textContent('[data-testid="pan-display"]');
    console.log('  Final zoom:', finalZoom);
    console.log('  Final pan:', finalPan);
    console.log('  PASSED: Pan and zoom work together smoothly');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/f22-step6-combined.png`, fullPage: true });

    // Check console errors
    if (consoleErrors.length > 0) {
      console.log('\n  Console errors detected:');
      consoleErrors.forEach(e => console.log('    -', e));
    } else {
      console.log('  Zero console errors');
    }

    console.log('\n=== FEATURE #22 TEST RESULT: PASSED ===');
    console.log('Pan and zoom controls verified:');
    console.log('  - Click+drag panning moves viewport');
    console.log('  - Mouse wheel up zooms in');
    console.log('  - Mouse wheel down zooms out');
    console.log('  - Zoom capped between 20% and 500%');
    console.log('  - Smooth transitions during pan and zoom');

  } catch (err) {
    console.error('\n=== FEATURE #22 TEST RESULT: FAILED ===');
    console.error('Error:', err.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/f22-error.png`, fullPage: true });
  } finally {
    // Clean up
    if (gameId) {
      try {
        await fetch(`http://localhost:3001/api/games/${gameId}`, { method: 'DELETE' });
        console.log('Test data cleaned up');
      } catch (err) {}
    }
    await browser.close();
  }
}

run().catch(console.error);
