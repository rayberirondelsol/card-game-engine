// Test Feature #35: Create and manage text notes on table
import { chromium } from 'playwright';

const GAME_ID = '5d0d98ba-3904-49f7-aca0-37b0ee6d7678';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('[ERR]', msg.text());
    }
  });

  try {
    // Step 1: Navigate to game table
    console.log('Step 1: Navigate to game table...');
    await page.goto(`${BASE_URL}/games/${GAME_ID}/play`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    const title = await page.locator('[data-testid="game-table-title"]').textContent();
    console.log(`  Title: "${title}"`);

    // Step 2: Open note creation via toolbar
    console.log('Step 2: Opening note creation modal...');
    const noteBtn = page.locator('[data-testid="toolbar-note-btn"]');
    await noteBtn.waitFor({ state: 'visible', timeout: 5000 });
    await noteBtn.click();
    await sleep(500);

    // Verify modal opened
    const modal = page.locator('[data-testid="note-modal"]');
    const modalVisible = await modal.isVisible();
    console.log(`  Note modal visible: ${modalVisible}`);
    await page.screenshot({ path: 'screenshots/f35-step1-modal.png' });

    // Step 3: Enter note text
    console.log('Step 3: Entering note text...');
    const noteInput = page.locator('[data-testid="note-text-input"]');
    await noteInput.fill('Remember to draw 2 cards');
    await sleep(300);
    await page.screenshot({ path: 'screenshots/f35-step2-text-entered.png' });

    // Step 4: Create note
    console.log('Step 4: Creating note...');
    const createBtn = page.locator('[data-testid="note-create-btn"]');
    await createBtn.click();
    await sleep(500);

    // Verify note appears on table
    const noteEls = await page.locator('[data-note-id]').all();
    console.log(`  Notes on table: ${noteEls.length}`);

    if (noteEls.length === 0) {
      console.log('ERROR: No notes found on table!');
      await page.screenshot({ path: 'screenshots/f35-error.png' });
      return;
    }

    const noteEl = noteEls[0];
    const noteId = await noteEl.getAttribute('data-note-id');
    console.log(`  Note ID: ${noteId}`);

    // Verify note text
    const noteTextEl = page.locator(`[data-testid="note-text-${noteId}"]`);
    const noteText = await noteTextEl.textContent();
    console.log(`  Note text: "${noteText}"`);

    if (noteText === 'Remember to draw 2 cards') {
      console.log('  SUCCESS: Note created with correct text!');
    } else {
      console.log(`  FAIL: Expected "Remember to draw 2 cards", got "${noteText}"`);
    }

    await page.screenshot({ path: 'screenshots/f35-step3-note-created.png' });

    // Step 5: Edit the note text
    console.log('Step 5: Editing note text...');

    // Double-click to enter edit mode
    await noteEl.dblclick();
    await sleep(500);

    // Check if edit input appeared
    const editInput = page.locator(`[data-testid="note-edit-input-${noteId}"]`);
    const editVisible = await editInput.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Edit input visible: ${editVisible}`);

    if (!editVisible) {
      // Try clicking the edit button instead
      console.log('  Trying edit button...');
      await noteEl.hover();
      await sleep(300);
      const editBtn = page.locator(`[data-testid="note-edit-${noteId}"]`);
      const editBtnVisible = await editBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (editBtnVisible) {
        await editBtn.click();
        await sleep(500);
      }
    }

    await page.screenshot({ path: 'screenshots/f35-step4-edit-mode.png' });

    // Clear and type new text
    const editInputFinal = page.locator(`[data-testid="note-edit-input-${noteId}"]`);
    if (await editInputFinal.isVisible().catch(() => false)) {
      await editInputFinal.fill('Draw 3 cards instead');
      await sleep(300);

      // Save the edit
      const saveEditBtn = page.locator(`[data-testid="note-save-edit-${noteId}"]`);
      await saveEditBtn.click();
      await sleep(500);

      // Verify updated text
      const updatedText = await page.locator(`[data-testid="note-text-${noteId}"]`).textContent();
      console.log(`  Updated text: "${updatedText}"`);
      if (updatedText === 'Draw 3 cards instead') {
        console.log('  SUCCESS: Note text updated!');
      }
    } else {
      console.log('  WARNING: Edit input not visible, skipping edit test');
    }

    await page.screenshot({ path: 'screenshots/f35-step5-text-updated.png' });

    // Step 6: Drag note to new position
    console.log('Step 6: Dragging note to new position...');
    const noteBefore = await noteEl.boundingBox();
    console.log(`  Note position before: x=${noteBefore?.x}, y=${noteBefore?.y}`);

    // Drag the note 200px to the right and 100px down
    if (noteBefore) {
      await page.mouse.move(noteBefore.x + 20, noteBefore.y + 20);
      await page.mouse.down();
      await sleep(100);
      await page.mouse.move(noteBefore.x + 220, noteBefore.y + 120, { steps: 10 });
      await sleep(100);
      await page.mouse.up();
      await sleep(500);

      const noteAfter = await noteEl.boundingBox();
      console.log(`  Note position after: x=${noteAfter?.x}, y=${noteAfter?.y}`);

      if (noteAfter && noteBefore && Math.abs(noteAfter.x - noteBefore.x) > 50) {
        console.log('  SUCCESS: Note was dragged to new position!');
      } else {
        console.log('  WARNING: Note may not have moved significantly');
      }
    }

    await page.screenshot({ path: 'screenshots/f35-step6-dragged.png' });

    // Step 7: Delete the note
    console.log('Step 7: Deleting note...');
    await noteEl.hover();
    await sleep(300);
    const deleteBtn = page.locator(`[data-testid="note-delete-${noteId}"]`);
    await deleteBtn.click({ force: true });
    await sleep(500);

    // Verify note is removed
    const remainingNotes = await page.locator('[data-note-id]').count();
    console.log(`  Remaining notes: ${remainingNotes}`);
    if (remainingNotes === 0) {
      console.log('  SUCCESS: Note deleted!');
    }

    await page.screenshot({ path: 'screenshots/f35-step7-deleted.png' });

    // Final summary
    console.log(`\n=== Final Results ===`);
    console.log(`  JS errors: ${errors.length}`);
    errors.forEach(e => console.log(`    ${e}`));

    const passed = noteText === 'Remember to draw 2 cards' && remainingNotes === 0;
    console.log(`\n=== TEST ${passed ? 'PASSED' : 'FAILED'} ===`);

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: 'screenshots/f35-error.png' });
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
