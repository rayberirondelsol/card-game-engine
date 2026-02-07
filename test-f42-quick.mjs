import { chromium } from 'playwright';

const GAME_ID = 'd3f46446-2384-4308-8732-2b56dae993fb';
const BASE = 'http://localhost:5173';
const API = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    // Log all console output for debugging
    if (msg.text().includes('load') || msg.text().includes('save') || msg.text().includes('Load') || msg.text().includes('Save') || msg.text().includes('Failed')) {
      process.stdout.write(`  [browser] ${msg.text()}\n`);
    }
  });

  try {
    // Create a save with known state
    const knownState = {
      camera: { x: 100, y: -50, zoom: 1.5, rotation: 0 },
      background: 'slate',
      cards: [
        {
          tableId: 'load-card-1',
          cardId: '0b972b83-955f-4c41-9e62-3c8486728cac',
          name: 'Load Test Card',
          image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png`,
          x: 400, y: 350, zIndex: 2, faceDown: false, rotation: 90, face_up: true
        },
        {
          tableId: 'load-card-2',
          cardId: '0b972b83-955f-4c41-9e62-3c8486728cac',
          name: 'Load Test Card 2',
          image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png`,
          x: 600, y: 350, zIndex: 3, faceDown: true, rotation: 0, face_up: false
        }
      ],
      stacks: [{
        stackId: 'load-stack-1',
        card_ids: ['s1', 's2'],
        x: 300, y: 200,
        cards: [
          { tableId: 'load-stack-c1', cardId: '0b972b83-955f-4c41-9e62-3c8486728cac', name: 'Stack Bottom', image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png`, faceDown: false, rotation: 0, zIndex: 4 },
          { tableId: 'load-stack-c2', cardId: '0b972b83-955f-4c41-9e62-3c8486728cac', name: 'Stack Top', image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png`, faceDown: false, rotation: 0, zIndex: 5 }
        ]
      }],
      hand: [{ handId: 'load-hand-1', cardId: '0b972b83-955f-4c41-9e62-3c8486728cac', name: 'Hand Card', image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png` }],
      markers: [
        { id: 'load-marker-1', color: '#ef4444', label: 'HP', x: 350, y: 300, attachedTo: 'load-card-1', attachedCorner: 'top-right' },
        { id: 'load-marker-2', color: '#3b82f6', label: '', x: 700, y: 150, attachedTo: null, attachedCorner: null }
      ],
      counters: [{ id: 'load-counter-1', name: 'Score', value: 42, x: 150, y: 150 }],
      dice: [{ id: 'load-die-1', type: 'd20', value: 17, maxValue: 20, x: 800, y: 150 }],
      notes: [{ id: 'load-note-1', text: 'Round 5', x: 500, y: 100 }],
      maxZIndex: 5
    };

    console.log('Creating known save state via API...');
    const createSaveRes = await fetch(`${API}/api/games/${GAME_ID}/saves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'F42 Load Test', state_data: knownState })
    });
    const createdSave = await createSaveRes.json();
    console.log(`Created save ID: ${createdSave.id}`);

    console.log('Navigating to game table with saveId...');
    await page.goto(`${BASE}/games/${GAME_ID}/play?saveId=${createdSave.id}`, { waitUntil: 'networkidle' });
    await sleep(4000);
    await page.screenshot({ path: 'screenshots/f42-loaded.png' });

    // Check toast
    const toastEl = page.locator('[data-testid="save-toast"]');
    let toastVisible = false;
    try { toastVisible = await toastEl.isVisible({ timeout: 2000 }); } catch (e) {}
    console.log(`Load toast visible: ${toastVisible}`);
    if (toastVisible) {
      const text = await toastEl.textContent();
      console.log(`Toast: ${text}`);
    }

    // Check cards
    const tableCards = page.locator('[data-table-card="true"]');
    const cardCount = await tableCards.count();
    console.log(`Cards on table: ${cardCount} (expected: 3 - 2 loose + 1 stack top)`);

    // Check counters
    const counterEls = page.locator('[data-counter-name]');
    const counterCount = await counterEls.count();
    console.log(`Counters: ${counterCount}`);
    if (counterCount > 0) {
      const name = await counterEls.first().getAttribute('data-counter-name');
      const valueEl = page.locator('[data-testid^="counter-value-"]').first();
      const value = await valueEl.textContent();
      console.log(`  Counter: ${name} = ${value} (expected: Score = 42)`);
    }

    // Check dice
    const diceEls = page.locator('[data-die-type]');
    const diceCount = await diceEls.count();
    console.log(`Dice: ${diceCount}`);
    if (diceCount > 0) {
      const type = await diceEls.first().getAttribute('data-die-type');
      const valueEl = page.locator('[data-testid^="die-value-"]').first();
      const value = await valueEl.textContent();
      console.log(`  Die: ${type} = ${value} (expected: d20 = 17)`);
    }

    // Check markers
    const markerEls = page.locator('[data-marker-color]');
    const markerCount = await markerEls.count();
    console.log(`Markers: ${markerCount} (expected: 2)`);

    // Check hand
    const handArea = page.locator('[data-testid="hand-area"]');
    let handVisible = false;
    try { handVisible = await handArea.isVisible({ timeout: 2000 }); } catch (e) {}
    console.log(`Hand visible: ${handVisible}`);
    if (handVisible) {
      const handCards = page.locator('[data-hand-card="true"]');
      const hc = await handCards.count();
      console.log(`  Cards in hand: ${hc} (expected: 1)`);
    }

    // Check zoom
    const zoomEl = page.locator('[data-testid="zoom-display"]');
    const zoom = await zoomEl.textContent();
    console.log(`Zoom: ${zoom} (expected: Zoom: 150%)`);

    // Console errors
    console.log(`\nConsole errors: ${consoleErrors.length}`);
    consoleErrors.forEach(e => console.log(`  ERROR: ${e}`));

  } catch (err) {
    console.error('Test failed:', err);
    await page.screenshot({ path: 'screenshots/f42-error.png' });
  } finally {
    await browser.close();
  }
}

test();
