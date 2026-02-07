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

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ====== FEATURE #36: Manual save game state ======
    console.log('\n=== FEATURE #36: Manual save game state ===');

    // Step 1: Navigate to game table
    console.log('Step 1: Navigate to game table...');
    await page.goto(`${BASE}/games/${GAME_ID}/play`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: 'screenshots/f36-step1-table.png' });

    // Step 2: Place a card on the table via card drawer
    console.log('Step 2: Open card drawer and place a card...');
    const cardDrawerBtn = page.locator('[data-testid="toggle-card-drawer"]');
    await cardDrawerBtn.click();
    await sleep(500);

    // Place a card
    const drawerCards = page.locator('[data-testid^="drawer-card-"]');
    const cardCount = await drawerCards.count();
    console.log(`  Found ${cardCount} cards in drawer`);
    if (cardCount > 0) {
      await drawerCards.first().click();
      await sleep(500);
    }

    // Step 3: Create a counter
    console.log('Step 3: Create a counter...');
    await page.locator('[data-testid="toolbar-counter-btn"]').click();
    await sleep(500);
    await page.locator('[data-testid="counter-name-input"]').fill('Health');
    await page.locator('[data-testid="counter-create-btn"]').click();
    await sleep(500);

    // Step 4: Create a die
    console.log('Step 4: Create a die...');
    await page.locator('[data-testid="toolbar-dice-btn"]').click();
    await sleep(500);
    await page.locator('[data-testid="dice-type-d20"]').click();
    await page.locator('[data-testid="dice-create-btn"]').click();
    await sleep(500);

    // Step 5: Create a marker
    console.log('Step 5: Create a marker...');
    await page.locator('[data-testid="toolbar-marker-btn"]').click();
    await sleep(500);
    await page.locator('[data-testid="marker-create-btn"]').click();
    await sleep(500);

    // Step 6: Create a note
    console.log('Step 6: Create a note...');
    await page.locator('[data-testid="toolbar-note-btn"]').click();
    await sleep(500);
    await page.locator('[data-testid="note-text-input"]').fill('Test Note');
    await page.locator('[data-testid="note-create-btn"]').click();
    await sleep(500);

    await page.screenshot({ path: 'screenshots/f36-step2-table-with-objects.png' });

    // Step 7: Click Save button
    console.log('Step 7: Click Save button...');
    await page.locator('[data-testid="toolbar-save-btn"]').click();
    await sleep(500);
    await page.screenshot({ path: 'screenshots/f36-step3-save-modal.png' });

    // Verify save modal is visible
    const saveModal = page.locator('[data-testid="save-modal"]');
    const modalVisible = await saveModal.isVisible();
    console.log(`  Save modal visible: ${modalVisible}`);

    // Step 8: Enter save name
    console.log('Step 8: Enter save name "Mid-Game Save"...');
    await page.locator('[data-testid="save-name-input"]').fill('Mid-Game Save');
    await page.screenshot({ path: 'screenshots/f36-step4-save-name-filled.png' });

    // Step 9: Confirm save
    console.log('Step 9: Click Save button...');
    await page.locator('[data-testid="save-confirm-btn"]').click();
    await sleep(1500);
    await page.screenshot({ path: 'screenshots/f36-step5-save-confirmed.png' });

    // Verify success toast
    const toastEl = page.locator('[data-testid="save-toast"]');
    let toastVisible = false;
    try {
      toastVisible = await toastEl.isVisible({ timeout: 3000 });
    } catch (e) {}
    console.log(`  Save toast visible: ${toastVisible}`);
    if (toastVisible) {
      const toastText = await toastEl.textContent();
      console.log(`  Toast text: "${toastText}"`);
    }

    // Step 10: Navigate to game detail to verify save appears
    console.log('Step 10: Navigate to game detail...');
    await page.goto(`${BASE}/games/${GAME_ID}`, { waitUntil: 'networkidle' });
    await sleep(1500);
    await page.screenshot({ path: 'screenshots/f36-step6-game-detail-saves.png' });

    // Check if "Mid-Game Save" appears in the saves list
    const savesListText = await page.textContent('body');
    const hasMidGameSave = savesListText.includes('Mid-Game Save');
    console.log(`  "Mid-Game Save" in saves list: ${hasMidGameSave}`);

    // ====== FEATURE #41: State serialization includes all table objects ======
    console.log('\n=== FEATURE #41: Game state serialization includes all table objects ===');

    // Retrieve the save via API
    const savesRes = await fetch(`${API}/api/games/${GAME_ID}/saves`);
    const saves = await savesRes.json();
    console.log(`  Total saves: ${saves.length}`);

    // Find "Mid-Game Save"
    const midGameSave = saves.find(s => s.name === 'Mid-Game Save');
    if (midGameSave) {
      console.log(`  Found "Mid-Game Save" with ID: ${midGameSave.id}`);

      // Get the full save data
      const saveDataRes = await fetch(`${API}/api/games/${GAME_ID}/saves/${midGameSave.id}`);
      const saveData = await saveDataRes.json();

      let stateData = saveData.state_data;
      if (typeof stateData === 'string') {
        stateData = JSON.parse(stateData);
      }

      console.log('\n  Checking state_data structure:');
      console.log(`  - camera: ${JSON.stringify(stateData.camera)}`);
      console.log(`  - Has camera.x: ${stateData.camera?.x !== undefined}`);
      console.log(`  - Has camera.y: ${stateData.camera?.y !== undefined}`);
      console.log(`  - Has camera.zoom: ${stateData.camera?.zoom !== undefined}`);
      console.log(`  - Has camera.rotation: ${stateData.camera?.rotation !== undefined}`);
      console.log(`  - cards: ${Array.isArray(stateData.cards)} (count: ${stateData.cards?.length || 0})`);
      console.log(`  - stacks: ${Array.isArray(stateData.stacks)} (count: ${stateData.stacks?.length || 0})`);
      console.log(`  - hand: ${Array.isArray(stateData.hand)} (count: ${stateData.hand?.length || 0})`);
      console.log(`  - markers: ${Array.isArray(stateData.markers)} (count: ${stateData.markers?.length || 0})`);
      console.log(`  - counters: ${Array.isArray(stateData.counters)} (count: ${stateData.counters?.length || 0})`);
      console.log(`  - dice: ${Array.isArray(stateData.dice)} (count: ${stateData.dice?.length || 0})`);
      console.log(`  - notes: ${Array.isArray(stateData.notes)} (count: ${stateData.notes?.length || 0})`);

      // Check card properties
      if (stateData.cards?.length > 0) {
        const card = stateData.cards[0];
        console.log(`  - Card has x,y: ${card.x !== undefined && card.y !== undefined}`);
        console.log(`  - Card has rotation: ${card.rotation !== undefined}`);
        console.log(`  - Card has face_up: ${card.face_up !== undefined}`);
        console.log(`  - Card has faceDown: ${card.faceDown !== undefined}`);
      }

      // Check counter properties
      if (stateData.counters?.length > 0) {
        const counter = stateData.counters[0];
        console.log(`  - Counter has name: ${counter.name !== undefined}`);
        console.log(`  - Counter has value: ${counter.value !== undefined}`);
        console.log(`  - Counter has x,y: ${counter.x !== undefined && counter.y !== undefined}`);
      }

      // Check dice properties
      if (stateData.dice?.length > 0) {
        const die = stateData.dice[0];
        console.log(`  - Die has type: ${die.type !== undefined}`);
        console.log(`  - Die has value: ${die.value !== undefined}`);
        console.log(`  - Die has x,y: ${die.x !== undefined && die.y !== undefined}`);
      }

      // Check marker properties
      if (stateData.markers?.length > 0) {
        const marker = stateData.markers[0];
        console.log(`  - Marker has color: ${marker.color !== undefined}`);
        console.log(`  - Marker has x,y: ${marker.x !== undefined && marker.y !== undefined}`);
      }

      // Check note properties
      if (stateData.notes?.length > 0) {
        const note = stateData.notes[0];
        console.log(`  - Note has text: ${note.text !== undefined}`);
        console.log(`  - Note has x,y: ${note.x !== undefined && note.y !== undefined}`);
      }
    } else {
      console.log('  ERROR: Mid-Game Save not found!');
    }

    // ====== FEATURE #42: Loading save state restores all objects ======
    console.log('\n=== FEATURE #42: Saved game state loads all objects correctly ===');

    // First, create a save with known state via API
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
          {
            tableId: 'load-stack-c1',
            cardId: '0b972b83-955f-4c41-9e62-3c8486728cac',
            name: 'Stack Bottom',
            image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png`,
            faceDown: false, rotation: 0, zIndex: 4
          },
          {
            tableId: 'load-stack-c2',
            cardId: '0b972b83-955f-4c41-9e62-3c8486728cac',
            name: 'Stack Top',
            image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png`,
            faceDown: false, rotation: 0, zIndex: 5
          }
        ]
      }],
      hand: [{
        handId: 'load-hand-1',
        cardId: '0b972b83-955f-4c41-9e62-3c8486728cac',
        name: 'Hand Card',
        image_path: `/uploads/${GAME_ID}/b4ce0e9b-92d5-4caa-a626-8585e4a8ada1.png`
      }],
      markers: [
        { id: 'load-marker-1', color: '#ef4444', label: 'HP', x: 350, y: 300, attachedTo: 'load-card-1', attachedCorner: 'top-right' },
        { id: 'load-marker-2', color: '#3b82f6', label: '', x: 700, y: 150, attachedTo: null, attachedCorner: null }
      ],
      counters: [{ id: 'load-counter-1', name: 'Score', value: 42, x: 150, y: 150 }],
      dice: [{ id: 'load-die-1', type: 'd20', value: 17, maxValue: 20, x: 800, y: 150 }],
      notes: [{ id: 'load-note-1', text: 'Round 5', x: 500, y: 100 }],
      maxZIndex: 5
    };

    console.log('Step 1: Create known save state via API...');
    const createSaveRes = await fetch(`${API}/api/games/${GAME_ID}/saves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Load Test Save', state_data: knownState })
    });
    const createdSave = await createSaveRes.json();
    console.log(`  Created save ID: ${createdSave.id}`);

    // Step 2: Load the save via UI (navigate to game table with saveId query param)
    console.log('Step 2: Navigate to game table with saveId...');
    await page.goto(`${BASE}/games/${GAME_ID}/play?saveId=${createdSave.id}`, { waitUntil: 'networkidle' });
    await sleep(3000);
    await page.screenshot({ path: 'screenshots/f42-step1-loaded-save.png' });

    // Step 3: Check that the load toast appeared
    const loadToast = page.locator('[data-testid="save-toast"]');
    let loadToastVisible = false;
    try {
      loadToastVisible = await loadToast.isVisible({ timeout: 3000 });
    } catch (e) {}
    console.log(`  Load toast visible: ${loadToastVisible}`);

    // Step 4: Verify cards are on the table
    const tableCards = page.locator('[data-table-card="true"]');
    const cardCountOnTable = await tableCards.count();
    console.log(`  Cards on table: ${cardCountOnTable}`);
    // Should have 2 loose cards + 1 stack (top card visible) = 3 visible card elements

    // Step 5: Verify counter is visible
    const counterEls = page.locator('[data-counter-name]');
    const counterCount = await counterEls.count();
    console.log(`  Counters on table: ${counterCount}`);
    if (counterCount > 0) {
      const counterName = await counterEls.first().getAttribute('data-counter-name');
      console.log(`  Counter name: ${counterName}`);
      // Check the counter value
      const counterValueEl = page.locator('[data-testid^="counter-value-"]').first();
      if (await counterValueEl.isVisible()) {
        const counterValue = await counterValueEl.textContent();
        console.log(`  Counter value: ${counterValue} (expected: 42)`);
      }
    }

    // Step 6: Verify dice is visible
    const diceEls = page.locator('[data-die-type]');
    const diceCount = await diceEls.count();
    console.log(`  Dice on table: ${diceCount}`);
    if (diceCount > 0) {
      const diceType = await diceEls.first().getAttribute('data-die-type');
      console.log(`  Die type: ${diceType} (expected: d20)`);
      const dieValueEl = page.locator('[data-testid^="die-value-"]').first();
      if (await dieValueEl.isVisible()) {
        const dieValue = await dieValueEl.textContent();
        console.log(`  Die value: ${dieValue} (expected: 17)`);
      }
    }

    // Step 7: Verify markers are visible
    const markerEls = page.locator('[data-marker-color]');
    const markerCount = await markerEls.count();
    console.log(`  Markers on table: ${markerCount} (expected: 2)`);
    if (markerCount > 0) {
      const markerColor = await markerEls.first().getAttribute('data-marker-color');
      console.log(`  First marker color: ${markerColor}`);
      const markerAttached = await markerEls.first().getAttribute('data-marker-attached');
      console.log(`  First marker attached to: ${markerAttached}`);
    }

    // Step 8: Verify hand has cards
    const handArea = page.locator('[data-testid="hand-area"]');
    let handVisible = false;
    try {
      handVisible = await handArea.isVisible({ timeout: 2000 });
    } catch (e) {}
    console.log(`  Hand area visible: ${handVisible}`);
    if (handVisible) {
      const handCardEls = page.locator('[data-hand-card="true"]');
      const handCardCount = await handCardEls.count();
      console.log(`  Cards in hand: ${handCardCount} (expected: 1)`);
    }

    // Step 9: Verify zoom display matches saved camera
    const zoomDisplay = page.locator('[data-testid="zoom-display"]');
    const zoomText = await zoomDisplay.textContent();
    console.log(`  Zoom display: ${zoomText} (expected: Zoom: 150%)`);

    await page.screenshot({ path: 'screenshots/f42-step2-final-verification.png' });

    // Summary
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length === 0) {
      console.log('  No console errors!');
    } else {
      consoleErrors.forEach(err => console.log(`  ERROR: ${err}`));
    }

    console.log('\n=== TEST SUMMARY ===');
    console.log('Feature #36 (Manual save):');
    console.log(`  - Save button opens modal: ${modalVisible}`);
    console.log(`  - Save name input works: true`);
    console.log(`  - Save confirmed with toast: ${toastVisible}`);
    console.log(`  - Save appears in game detail: ${hasMidGameSave}`);

    console.log('Feature #41 (Serialization):');
    console.log(`  - All object types present in state_data (checked above)`);

    console.log('Feature #42 (Load save):');
    console.log(`  - Cards restored: ${cardCountOnTable > 0}`);
    console.log(`  - Counter restored: ${counterCount > 0}`);
    console.log(`  - Dice restored: ${diceCount > 0}`);
    console.log(`  - Markers restored: ${markerCount > 0}`);
    console.log(`  - Hand restored: ${handVisible}`);
    console.log(`  - Camera zoom restored: ${zoomText}`);

  } catch (err) {
    console.error('Test failed:', err.message);
    await page.screenshot({ path: 'screenshots/f36-42-error.png' });
  } finally {
    await browser.close();
  }
}

test();
